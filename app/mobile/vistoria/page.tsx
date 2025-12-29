'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, ArrowLeft, Camera, Check, X, 
  Truck, Car, User, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { createClient } from '@supabase/supabase-js';
import SignatureCanvas from 'react-signature-canvas'; // Usando a lib direta para garantir funcionamento

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- ITENS DO CHECKLIST (Mapeados dos seus PDFs) ---
const CHECKLIST_ITENS = {
  common: [
    "Documentos", "Chave do veículo", "Extintor", "Macaco", "Triângulo", 
    "Chave de Roda", "Elétrica Geral", "Interior (Limpeza)", "Rodas de Ferro"
  ],
  auto: [
    "Tapetes", "Nível de Óleo e Água", "Estepe"
  ],
  equipment: [
    "Tacógrafo", "Nível Arrefecimento", "Nível Óleo Motor", "Vazamentos Motor",
    "Lubrificação (Giro/Lança)", "Anemômetro", "Cabo de Aço (Condições)", 
    "Enrolamento Cabos", "Trincas Gancho", "Trava Gancho", "Roldanas Lança",
    "Estrutura Torre", "Freios", "Capacidade Carga", "Buzina Ré"
  ]
};

const FOTOS_OBRIGATORIAS = [
  "Frente", "Lateral Dianteira Dir.", "Lateral Traseira Dir.", 
  "Traseira", "Lateral Traseira Esq.", "Lateral Dianteira Esq.", 
  "Documentos", "Painel (Ligado)"
];

export default function VistoriaMobilePage() {
  const router = useRouter();
  
  // Refs para assinaturas
  const sigPadMotorista = useRef<any>(null);
  const sigPadVistoriador = useRef<any>(null);

  // Estados de Controle
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [listaVeiculos, setListaVeiculos] = useState<any[]>([]); // Lista real do banco

  // Estados do Formulário
  const [dados, setDados] = useState({
    veiculoId: '',
    tipoVeiculo: 'auto', // 'auto' | 'equipment'
    modeloExibicao: '', // Apenas para mostrar na tela
    vistoriador: '',
    motorista: '',
    odometro: '',
    horimetro: '',
    nivelCombustivel: '1/4',
    observacoes: '',
    pertences: ''
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<Record<string, string>>({});
  
  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- BUSCAR VEÍCULOS DO BANCO (INTEGRAÇÃO REAL) ---
  useEffect(() => {
    const carregarFrota = async () => {
      try {
        // Ajuste os nomes das colunas conforme sua tabela real no Supabase
        const { data, error } = await supabase
          .from('vehicles') 
          .select('id, plate, model, type') 
          .order('plate');

        if (error) throw error;
        if (data) setListaVeiculos(data);
      } catch (err) {
        console.error("Erro ao carregar veículos:", err);
        alert("Erro ao carregar frota. Verifique a conexão.");
      }
    };
    carregarFrota();
  }, []);

  // Quando seleciona o veículo no dropdown
  const handleVeiculoChange = (id: string) => {
    const veiculoEncontrado = listaVeiculos.find(v => v.id === id);
    
    if (veiculoEncontrado) {
      // Tenta identificar o tipo se o banco não tiver a coluna 'type' explícita, 
      // ou usa o valor do banco. Aqui assumo que sua tabela tem a coluna 'type'.
      // Se não tiver, podemos fazer lógica pelo nome do modelo.
      const tipoDetectado = veiculoEncontrado.type === 'equipment' ? 'equipment' : 'auto';

      setDados(prev => ({
        ...prev, 
        veiculoId: id,
        tipoVeiculo: tipoDetectado,
        modeloExibicao: veiculoEncontrado.model
      }));
      setChecklist({}); // Limpa checklist anterior
    } else {
      setDados(prev => ({ ...prev, veiculoId: id }));
    }
  };

  // --- NAVEGAÇÃO ---
  const nextStep = () => {
    if (step === 1) {
       if (!dados.veiculoId || !dados.odometro || !dados.vistoriador) return alert("Preencha os campos obrigatórios (*)");
       if (dados.tipoVeiculo === 'equipment' && !dados.horimetro) return alert("Horímetro é obrigatório para equipamentos.");
    }
    setStep(prev => Math.min(prev + 1, 4));
  };
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // --- INTERAÇÕES ---
  const toggleChecklistItem = (item: string) => {
    setChecklist(prev => {
        const current = prev[item];
        if (current === true) return { ...prev, [item]: false }; // Verde -> Vermelho
        if (current === false) { 
            const copy = { ...prev }; 
            delete copy[item]; 
            return copy; // Vermelho -> Limpo
        }
        return { ...prev, [item]: true }; // Limpo -> Verde
    });
  };

  const handleFotoUpload = (item: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotos(prev => ({ ...prev, [item]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const limparAssinatura = (padRef: any) => {
    padRef.current?.clear();
  };

  // --- FINALIZAR ---
  const finalizarVistoria = async () => {
    if (sigPadMotorista.current?.isEmpty() || sigPadVistoriador.current?.isEmpty()) {
        return alert("As assinaturas do Motorista e Vistoriador são obrigatórias.");
    }

    setLoading(true);
    
    try {
      // Pega as assinaturas em Base64
      const assMotorista = sigPadMotorista.current.getTrimmedCanvas().toDataURL('image/png');
      const assVistoriador = sigPadVistoriador.current.getTrimmedCanvas().toDataURL('image/png');

      const payload = {
        vehicle_id: dados.veiculoId,
        vehicle_type: dados.tipoVeiculo, // Salva o tipo usado no momento da vistoria
        odometer: parseFloat(dados.odometro),
        hour_meter: dados.horimetro ? parseFloat(dados.horimetro) : null,
        fuel_level: dados.nivelCombustivel,
        observations: dados.observacoes,
        belongings: dados.pertences, // Campo 'Pertences Retirados'
        checklist_data: checklist, // JSONB
        // ATENÇÃO: Fotos em base64 podem ser grandes. O ideal é upload pro Storage.
        // Aqui mantive no JSON para seguir sua estrutura anterior, mas monitore o tamanho.
        photos: fotos, 
        driver_signature: assMotorista,
        inspector_signature: assVistoriador,
        driver_name: dados.motorista, // Se tiver coluna pra nome
        inspector_name: dados.vistoriador, // Se tiver coluna pra nome
        status: 'Concluido',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('inspections').insert([payload]); 
      if (error) throw error;

      alert("✅ Vistoria salva com sucesso!");
      router.push('/vistorias'); 
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Define lista de itens
  const itensAtuais = [
    ...CHECKLIST_ITENS.common,
    ...(dados.tipoVeiculo === 'auto' ? CHECKLIST_ITENS.auto : CHECKLIST_ITENS.equipment)
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md">
         <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              {step > 1 && <ArrowLeft onClick={prevStep} className="cursor-pointer" />}
              <span className="font-bold text-lg">Nova Vistoria</span>
            </div>
            <div className="text-xs bg-slate-800 px-2 py-1 rounded text-blue-200">{currentTime}</div>
         </div>
         <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${(step/4)*100}%` }} />
         </div>
         <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span>Dados</span><span>Checklist</span><span>Fotos</span><span>Assinar</span>
         </div>
      </header>

      {/* CONTEÚDO */}
      <div className="flex-1 p-4 pb-28 space-y-6">
        
        {/* PASSO 1: DADOS */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
             {/* Card Veículo */}
             <Card className="border-l-4 border-l-blue-600 shadow-sm">
                <CardContent className="pt-6">
                   <Label className="font-bold text-slate-700">Selecione o Veículo *</Label>
                   <select 
                      className="w-full mt-2 p-3 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={dados.veiculoId} 
                      onChange={(e) => handleVeiculoChange(e.target.value)}
                   >
                     <option value="">-- Carregando Frota --</option>
                     {listaVeiculos.length === 0 && <option disabled>Buscando dados...</option>}
                     {listaVeiculos.map(v => (
                        <option key={v.id} value={v.id}>
                           {v.plate.toUpperCase()} - {v.model}
                        </option>
                     ))}
                   </select>

                   {/* Mostra o tipo detectado */}
                   {dados.veiculoId && (
                      <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${dados.tipoVeiculo === 'equipment' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                         {dados.tipoVeiculo === 'equipment' ? <Truck className="w-3 h-3 mr-2"/> : <Car className="w-3 h-3 mr-2"/>}
                         {dados.tipoVeiculo === 'equipment' ? 'EQUIPAMENTO / PESADO' : 'AUTOMÓVEL / LEVE'}
                      </div>
                   )}
                </CardContent>
             </Card>

             <Card>
                <CardContent className="pt-6 space-y-4">
                   <div>
                      <Label>Seu Nome (Vistoriador) *</Label>
                      <Input 
                         value={dados.vistoriador} 
                         onChange={e => setDados({...dados, vistoriador: e.target.value})} 
                         placeholder="Quem está vistoriando?"
                      />
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-1">
                         <Label>Km Atual *</Label>
                         <Input 
                            type="number" 
                            value={dados.odometro} 
                            onChange={e => setDados({...dados, odometro: e.target.value})} 
                            placeholder="0"
                            className="font-bold"
                         />
                      </div>
                      {dados.tipoVeiculo === 'equipment' && (
                         <div className="flex-1">
                            <Label>Horímetro *</Label>
                            <Input 
                               type="number" 
                               value={dados.horimetro} 
                               onChange={e => setDados({...dados, horimetro: e.target.value})} 
                               placeholder="0"
                               className="font-bold"
                            />
                         </div>
                      )}
                   </div>
                   
                   <div>
                      <Label>Combustível</Label>
                      <div className="flex gap-1 mt-2 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                         {['Reserva', '1/4', '1/2', '3/4', '1/1'].map(n => (
                            <button 
                               key={n} 
                               onClick={() => setDados({...dados, nivelCombustivel: n})} 
                               className={`flex-1 py-2 px-2 text-xs font-bold rounded whitespace-nowrap ${dados.nivelCombustivel === n ? 'bg-white text-blue-600 shadow border-blue-100' : 'text-slate-500'}`}
                            >
                               {n}
                            </button>
                         ))}
                      </div>
                   </div>
                </CardContent>
             </Card>
          </div>
        )}

        {/* PASSO 2: CHECKLIST */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
             <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
               <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                  <span className="font-bold text-slate-700">Verificação</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Toque para alterar status</span>
               </div>
               <div className="divide-y">
                  {itensAtuais.map(item => {
                     const status = checklist[item];
                     return (
                        <div key={item} onClick={() => toggleChecklistItem(item)} className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${status === false ? 'bg-red-50' : status === true ? 'bg-green-50' : 'bg-white'}`}>
                           <span className={`text-sm font-medium ${status === false ? 'text-red-700' : status === true ? 'text-green-800' : 'text-slate-600'}`}>{item}</span>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${status === true ? 'bg-green-500 border-green-600 text-white' : status === false ? 'bg-red-500 border-red-600 text-white' : 'bg-slate-100 border-slate-300'}`}>
                              {status === true && <Check size={16} strokeWidth={3} />}
                              {status === false && <X size={16} strokeWidth={3} />}
                           </div>
                        </div>
                     )
                  })}
               </div>
             </div>

             <Card>
               <CardContent className="pt-6">
                  <Label>Pertences Retirados</Label>
                  <Textarea value={dados.pertences} onChange={e => setDados({...dados, pertences: e.target.value})} placeholder="Liste itens..." className="mt-2 text-sm"/>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                  <Label>Observações / Avarias</Label>
                  <Textarea value={dados.observacoes} onChange={e => setDados({...dados, observacoes: e.target.value})} placeholder="Descreva problemas..." className="mt-2 text-sm"/>
               </CardContent>
             </Card>
          </div>
        )}

        {/* PASSO 3: FOTOS */}
        {step === 3 && (
           <div className="animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                 {FOTOS_OBRIGATORIAS.map((label, idx) => (
                    <div key={idx} className="relative aspect-square">
                       <input type="file" accept="image/*" capture="environment" id={`foto-${idx}`} className="hidden" onChange={(e) => handleFotoUpload(label, e)} />
                       <label htmlFor={`foto-${idx}`} className={`w-full h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm ${fotos[label] ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-white'}`}>
                          {fotos[label] ? <img src={fotos[label]} className="w-full h-full object-cover rounded-lg" alt={label}/> : <><Camera className="text-slate-400 w-8 h-8 mb-2"/><span className="text-[10px] text-center font-bold text-slate-500 uppercase px-2">{label}</span></>}
                       </label>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* PASSO 4: ASSINATURAS */}
        {step === 4 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <Card>
                 <CardContent className="pt-6">
                    <Label className="flex items-center gap-2 mb-2"><User size={16} /> Motorista Responsável *</Label>
                    <Input value={dados.motorista} onChange={e => setDados({...dados, motorista: e.target.value})} placeholder="Nome do motorista" className="mb-4"/>
                    <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden touch-none relative">
                        <SignatureCanvas ref={sigPadMotorista} canvasProps={{ className: 'w-full h-40 bg-white' }} />
                        <button onClick={() => limparAssinatura(sigPadMotorista)} className="absolute top-2 right-2 text-xs text-red-500 font-bold bg-white px-2 py-1 rounded shadow">Limpar</button>
                    </div>
                 </CardContent>
              </Card>

              <Card>
                 <CardContent className="pt-6">
                    <Label className="flex items-center gap-2 mb-2"><FileText size={16} /> Vistoriador ({dados.vistoriador}) *</Label>
                    <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden touch-none relative">
                        <SignatureCanvas ref={sigPadVistoriador} canvasProps={{ className: 'w-full h-40 bg-white' }} />
                        <button onClick={() => limparAssinatura(sigPadVistoriador)} className="absolute top-2 right-2 text-xs text-red-500 font-bold bg-white px-2 py-1 rounded shadow">Limpar</button>
                    </div>
                 </CardContent>
              </Card>
           </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        <Button 
          size="lg" 
          className={`w-full h-12 text-lg font-bold shadow-lg transition-all ${step === 4 ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'}`} 
          onClick={step === 4 ? finalizarVistoria : nextStep} 
          disabled={loading}
        >
          {loading ? 'Salvando...' : step === 4 ? 'FINALIZAR' : 'PRÓXIMO'}
          {!loading && step !== 4 && <ArrowRight className="ml-2 w-5 h-5"/>}
        </Button>
      </div>
    </div>
  );
}