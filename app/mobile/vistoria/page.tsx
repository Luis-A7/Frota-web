'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, ArrowLeft, Camera, Check, X, 
  Truck, Car, Tractor, User, FileText, Disc
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { createClient } from '@/lib/supabase';
import SignatureCanvas from 'react-signature-canvas';

// --- CONFIGURAÇÃO EXATA DOS ITENS (CÓPIA FIEL DOS PDFS) ---
const CHECKLISTS = {
  // Fonte: NAI195_IUE4758_... (Clio)
  auto: [
    "Documentos",
    "Chave do veículo",
    "Extintor",
    "Macaco",
    "Triângulo",
    "Chave de Roda",
    "Estepe",
    "Elétrica Geral (Pisca, Lanterna, Farol, Limpador e Bateria)",
    "Tapetes",
    "Nível de Óleo e Água",
    "Rodas de Ferro",
    "Interior (Limpeza e Conservação)"
  ],
  // Fonte: NAI195_OBL6B69_... (Scania)
  truck: [
    "Documentos",
    "Chave do veículo",
    "Extintor",
    "Rodas de Ferro",
    "Estepe",
    "Macaco",
    "Triângulo",
    "Chave de Roda",
    "Tacógrafo",
    "Elétrica Geral (Pisca, Lanterna, Farol, Limpador e Bateria)",
    "NÍVEL LIQUIDO DE ARREFECIMENTO DO MOTOR",
    "Interior (Limpeza e Conservação)",
    "Vazamentos em Geral",
    "Mangueiras",
    "CONDIÇÕES GERAIS DOS PNEUS",
    "VERIFICAR BUZINA E AVISO SONORO DE RÉ"
  ],
  // Fonte: NAI195_JDE5B64_... (Guindaste Sany)
  equipment: [
    "Documentos",
    "Chave do veículo",
    "Extintor",
    "Estepe",
    "Macaco",
    "Triângulo",
    "Chave de Roda",
    "Tacógrafo",
    "Elétrica Geral (Pisca, Lanterna, Farol, Limpador e Bateria)",
    "Rodas de Ferro",
    "NÍVEL LIQUIDO DE ARREFECIMENTO DO MOTOR",
    "Interior (Limpeza e Conservação)",
    "Lubrificação (Giro, Lança e Patolas)",
    "Anemômetro",
    "VERIFICAR AS CONDIÇÕES DO CABO DE AÇO",
    "VERIFICAR ENROLAMENTO DOS CABOS DE AÇO NO TAMBOR",
    "VERIFICAR SE HÁ TRINCAS NO GANCHO",
    "O GANCHO POSSUÍ TRAVA?",
    "INSPECIONAR AS ROLDANAS DA PONTA DE LANÇA",
    "CONDIÇÕES GERAIS DA ESTRUTURA DA TORRE DE IÇAMENTO",
    "VERIFICAR FREIOS DE RODA E ESTACIONAMENTO",
    "IDENTIFICAÇÃO DE CAPACIDADE DE CARGA DAS LANÇAS",
    "DANOS GERAIS NA ESTRUTURA",
    "VAZAMENTOS",
    "VERIFICAR BUZINA E AVISO SONORO DE RÉ"
  ]
};

const FOTOS_OBRIGATORIAS = [
  "Frente", "Lateral Dianteira Dir.", "Lateral Traseira Dir.", 
  "Traseira", "Lateral Traseira Esq.", "Lateral Dianteira Esq.", 
  "Documentos", "Painel (Ligado)"
];

export default function VistoriaMobilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Refs
  const sigPadMotorista = useRef<any>(null);
  const sigPadVistoriador = useRef<any>(null);

  // Estados
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [listaVeiculos, setListaVeiculos] = useState<any[]>([]);

  // Dados Gerais
  const [dados, setDados] = useState({
    veiculoId: '',
    tipoVeiculo: 'auto', // 'auto' | 'truck' | 'equipment'
    modeloExibicao: '', 
    vistoriador: '',
    motorista: '',
    odometro: '',
    horimetro: '',
    nivelCombustivel: '1/4',
    observacoes: '',
    pertences: ''
  });

  // Estado Específico para Pneus (Apenas Caminhão)
  const [pneus, setPneus] = useState({
    dianteiroEsq: '',
    dianteiroDir: '',
    traseiroEsq: '',
    traseiroDir: '',
    estepe: ''
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<Record<string, string>>({});
  
  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })), 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca Frota
  useEffect(() => {
    const carregarFrota = async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles') 
          .select('id, plate, name, type') 
          .eq('status', 'active')
          .order('name');

        if (error) throw error;
        if (data) setListaVeiculos(data);
      } catch (err) {
        console.error("Erro ao carregar veículos:", err);
      }
    };
    carregarFrota();
  }, []);

  // Troca de Veículo e Definição de Tipo
  const handleVeiculoChange = (id: string) => {
    const veiculoEncontrado = listaVeiculos.find(v => v.id === id);
    
    if (veiculoEncontrado) {
      let tipoDetectado = 'auto'; 
      if (veiculoEncontrado.type === 'Equipamento') tipoDetectado = 'equipment';
      else if (veiculoEncontrado.type === 'Caminhão') tipoDetectado = 'truck';
      else tipoDetectado = 'auto';

      setDados(prev => ({
        ...prev, 
        veiculoId: id,
        tipoVeiculo: tipoDetectado,
        modeloExibicao: veiculoEncontrado.name
      }));
      setChecklist({});
      // Reseta pneus se trocar de tipo
      if (tipoDetectado !== 'truck') setPneus({ dianteiroEsq: '', dianteiroDir: '', traseiroEsq: '', traseiroDir: '', estepe: '' });
    } else {
      setDados(prev => ({ ...prev, veiculoId: id }));
    }
  };

  const nextStep = () => {
    if (step === 1) {
       if (!dados.veiculoId || !dados.odometro || !dados.vistoriador) return alert("Preencha os campos obrigatórios (*)");
       if (dados.tipoVeiculo === 'equipment' && !dados.horimetro) return alert("Horímetro é obrigatório para equipamentos.");
    }
    // Validação extra para Caminhões (Pneus)
    if (step === 2 && dados.tipoVeiculo === 'truck') {
        // Opcional: Se for obrigatório preencher todos os pneus, descomente abaixo
        // if (!pneus.dianteiroEsq || !pneus.dianteiroDir) return alert("Informe o estado dos pneus dianteiros.");
    }
    setStep(prev => Math.min(prev + 1, 4));
  };
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // Toggle Checklist
  const toggleChecklistItem = (item: string) => {
    setChecklist(prev => {
        const current = prev[item];
        if (current === true) return { ...prev, [item]: false };
        if (current === false) { 
            const copy = { ...prev }; 
            delete copy[item]; 
            return copy; 
        }
        return { ...prev, [item]: true };
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

  const finalizarVistoria = async () => {
    if (sigPadMotorista.current?.isEmpty() || sigPadVistoriador.current?.isEmpty()) {
        return alert("As assinaturas do Motorista e Vistoriador são obrigatórias.");
    }

    setLoading(true);
    
    try {
      const assMotorista = sigPadMotorista.current.getTrimmedCanvas().toDataURL('image/png');
      const assVistoriador = sigPadVistoriador.current.getTrimmedCanvas().toDataURL('image/png');

      // Monta objeto final combinando checklist + pneus (se for caminhao)
      const dadosChecklistFinal = {
          ...checklist,
          ...(dados.tipoVeiculo === 'truck' ? { pneus_detalhes: pneus } : {})
      };

      const payload = {
        vehicle_id: dados.veiculoId,
        vehicle_type: dados.tipoVeiculo,
        odometer: parseFloat(dados.odometro),
        hour_meter: dados.horimetro ? parseFloat(dados.horimetro) : null,
        fuel_level: dados.nivelCombustivel,
        observations: dados.observacoes,
        belongings: dados.pertences,
        checklist_data: dadosChecklistFinal, // Salva tudo aqui
        photos: fotos, 
        driver_signature: assMotorista,
        inspector_signature: assVistoriador,
        driver_name: dados.motorista,
        inspector_name: dados.vistoriador,
        status: 'Concluido'
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

  // Carrega lista correta
  // @ts-ignore
  const itensAtuais = CHECKLISTS[dados.tipoVeiculo] || CHECKLISTS.auto;

  // Renderização Auxiliar
  const getIconeTipo = () => {
    if (dados.tipoVeiculo === 'equipment') return <Tractor className="w-3 h-3 mr-2"/>;
    if (dados.tipoVeiculo === 'truck') return <Truck className="w-3 h-3 mr-2"/>;
    return <Car className="w-3 h-3 mr-2"/>;
  };
  const getLabelTipo = () => {
    if (dados.tipoVeiculo === 'equipment') return 'GUINDASTE / EQUIPAMENTO';
    if (dados.tipoVeiculo === 'truck') return 'CAMINHÃO / PESADO';
    return 'AUTOMÓVEL / LEVE';
  };

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
             <Card className="border-l-4 border-l-blue-600 shadow-sm">
                <CardContent className="pt-6">
                   <Label className="font-bold text-slate-700">Selecione o Veículo *</Label>
                   <select 
                      className="w-full mt-2 p-3 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={dados.veiculoId} 
                      onChange={(e) => handleVeiculoChange(e.target.value)}
                   >
                     <option value="">-- Selecione --</option>
                     {listaVeiculos.length === 0 && <option disabled>Carregando...</option>}
                     {listaVeiculos.map(v => (
                        <option key={v.id} value={v.id}>
                           {v.name} {v.plate ? `- ${v.plate}` : ''}
                        </option>
                     ))}
                   </select>

                   {dados.veiculoId && (
                      <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold 
                        ${dados.tipoVeiculo === 'equipment' ? 'bg-orange-100 text-orange-700' : 
                          dados.tipoVeiculo === 'truck' ? 'bg-purple-100 text-purple-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                         {getIconeTipo()}
                         {getLabelTipo()}
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
                         placeholder="Nome completo"
                      />
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-1">
                         <Label>Km Odômetro *</Label>
                         <Input 
                            type="number" 
                            value={dados.odometro} 
                            onChange={e => setDados({...dados, odometro: e.target.value})} 
                            placeholder="0"
                            className="font-bold"
                         />
                      </div>
                      {(dados.tipoVeiculo === 'equipment' || dados.tipoVeiculo === 'truck') && (
                         <div className="flex-1">
                            <Label>Horímetro {dados.tipoVeiculo === 'equipment' && '*'}</Label>
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
                      <Label>Nível de Combustível</Label>
                      <div className="flex gap-1 mt-2 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                         {['Reserva', '1/4', '1/2', '3/4', '1/1'].map(n => (
                            <button 
                               key={n} 
                               onClick={() => setDados({...dados, nivelCombustivel: n})} 
                               className={`flex-1 py-3 px-2 text-xs font-bold rounded shadow-sm whitespace-nowrap transition-all ${dados.nivelCombustivel === n ? 'bg-white text-blue-600 ring-2 ring-blue-500' : 'bg-slate-200 text-slate-500'}`}
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
             
             {/* SEÇÃO ESPECIAL: PNEUS (APENAS CAMINHÃO) */}
             {dados.tipoVeiculo === 'truck' && (
                <Card className="bg-purple-50 border-purple-100">
                    <CardContent className="pt-6 space-y-3">
                        <Label className="flex items-center gap-2 text-purple-800 font-bold border-b border-purple-200 pb-2 mb-2">
                           <Disc className="w-4 h-4" /> Dados dos Pneus (Marca/Estado)
                        </Label>
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <span className="text-xs font-bold text-purple-700 uppercase">Dianteiro Esquerdo</span>
                                <Input placeholder="Ex: Novo - Michelin" className="bg-white" value={pneus.dianteiroEsq} onChange={e => setPneus({...pneus, dianteiroEsq: e.target.value})} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-purple-700 uppercase">Dianteiro Direito</span>
                                <Input placeholder="Ex: Novo - Michelin" className="bg-white" value={pneus.dianteiroDir} onChange={e => setPneus({...pneus, dianteiroDir: e.target.value})} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-purple-700 uppercase">Traseiro Esquerdo</span>
                                <Input placeholder="Ex: Recapado - GoodYear" className="bg-white" value={pneus.traseiroEsq} onChange={e => setPneus({...pneus, traseiroEsq: e.target.value})} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-purple-700 uppercase">Traseiro Direito</span>
                                <Input placeholder="Ex: Recapado - GoodYear" className="bg-white" value={pneus.traseiroDir} onChange={e => setPneus({...pneus, traseiroDir: e.target.value})} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-purple-700 uppercase">Estepe</span>
                                <Input placeholder="Ex: Meia vida" className="bg-white" value={pneus.estepe} onChange={e => setPneus({...pneus, estepe: e.target.value})} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
             )}

             <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
               <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                  <span className="font-bold text-slate-700">Itens de Verificação ({itensAtuais.length})</span>
               </div>
               <div className="divide-y">
                  {itensAtuais.map((item: string) => {
                     const status = checklist[item];
                     return (
                        <div key={item} onClick={() => toggleChecklistItem(item)} className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${status === false ? 'bg-red-50' : status === true ? 'bg-green-50' : 'bg-white'}`}>
                           <span className={`text-sm font-medium pr-4 ${status === false ? 'text-red-700' : status === true ? 'text-green-800' : 'text-slate-600'}`}>{item}</span>
                           <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${status === true ? 'bg-green-500 border-green-600 text-white scale-110' : status === false ? 'bg-red-500 border-red-600 text-white scale-110' : 'bg-slate-100 border-slate-300'}`}>
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
                  <Textarea value={dados.observacoes} onChange={e => setDados({...dados, observacoes: e.target.value})} placeholder="Descreva qualquer problema encontrado..." className="mt-2 text-sm"/>
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
                    <Input value={dados.motorista} onChange={e => setDados({...dados, motorista: e.target.value})} placeholder="Nome legível" className="mb-4"/>
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
          {loading ? 'Salvando...' : step === 4 ? 'FINALIZAR VISTORIA' : 'PRÓXIMO'}
          {!loading && step !== 4 && <ArrowRight className="ml-2 w-5 h-5"/>}
        </Button>
      </div>
    </div>
  );
}
