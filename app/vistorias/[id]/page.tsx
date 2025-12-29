'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle, XCircle, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- LISTA FIXA PARA GARANTIR QUE TUDO APARECE ---
const CHECKLIST_ITENS = [
  "Documentos (CRLV/CNH)", "Chave do veículo", "Extintor", "Rodas de Ferro",
  "Estepe", "Macaco / Chave de Roda", "Triângulo", "Tacógrafo",
  "Elétrica Geral (Luzes/Seta)", "Nível Água/Arrefecimento", "Limpeza Interior",
  "Vazamentos de Motor", "Buzina / Ré", "Freios (Mão/Pedal)"
];

export default function VistoriaDetalhePage() {
  const params = useParams();
  const [vistoria, setVistoria] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetalhes = async () => {
      const { data, error } = await supabase.from('vistorias').select('*').eq('id', params.id).single();
      if (data) setVistoria(data);
      setLoading(false);
    };
    if (params.id) fetchDetalhes();
  }, [params.id]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;
  if (!vistoria) return <div className="h-screen flex items-center justify-center text-slate-500">Vistoria não encontrada.</div>;

  const json = vistoria.conteudo_json || {};
  const dadosGerais = json.dados_gerais || {};
  const pneus = json.pneus || {};
  const checklistSalvo = json.checklist || {};
  const fotos = json.fotos_base64 || {}; 
  const assinaturas = json.assinaturas_base64 || {};

  const listaPneus = Object.entries(pneus).map(([key, val]: any) => ({ pos: key, ...val }));
  const listaFotos = Object.entries(fotos);

  return (
    <div className="p-8 bg-slate-100 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-4xl mb-4 print:hidden">
        <Link href="/vistorias"><Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button></Link>
      </div>

      <div className="w-full max-w-4xl bg-white shadow-lg p-8 print:shadow-none print:w-full print:p-0">
        <div className="flex justify-between items-start mb-8 border-b pb-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Vistoria #{vistoria.id.slice(0, 8)}</h1>
            <p className="text-slate-500">Detalhes completos</p>
          </div>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-4 rounded border">
          <div><p className="text-xs text-slate-500 font-bold">VEÍCULO</p><p className="font-bold">{vistoria.veiculo_placa}</p><p>{vistoria.veiculo_modelo}</p></div>
          <div><p className="text-xs text-slate-500 font-bold">KM / COMBUSTÍVEL</p><p>{dadosGerais.odometro} Km / {dadosGerais.nivelCombustivel}</p></div>
          <div><p className="text-xs text-slate-500 font-bold">DATA</p><p>{new Date(vistoria.created_at).toLocaleString('pt-BR')}</p></div>
          <div><p className="text-xs text-slate-500 font-bold">VISTORIADOR</p><p>{vistoria.vistoriador_nome}</p></div>
        </div>

        {listaPneus.length > 0 && (
          <div className="mb-8 break-inside-avoid">
            <h3 className="text-sm font-bold bg-slate-800 text-white p-2 rounded-t">PNEUS</h3>
            <div className="border rounded-b p-0"><table className="w-full text-sm"><tbody className="divide-y">{listaPneus.map((p, i) => (
              <tr key={i}><td className="p-3 font-medium">{p.pos}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status?.toUpperCase()}</span></td><td className="p-3">{p.marca}</td></tr>
            ))}</tbody></table></div>
          </div>
        )}

        <div className="mb-8 break-inside-avoid">
          <h3 className="text-sm font-bold bg-slate-800 text-white p-2 rounded-t">CHECKLIST DE ITENS</h3>
          <div className="border rounded-b p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {/* CORREÇÃO: Mapear a LISTA FIXA, não o que foi salvo */}
            {CHECKLIST_ITENS.map((item, i) => {
              // Lógica: Se estiver marcado como 'false' no salvo, é problema. Se 'true' ou undefined, é OK.
              const temProblema = checklistSalvo[item] === false; 
              return (
                <div key={i} className="flex justify-between items-center border-b border-dashed py-2">
                  <span className="text-sm">{item}</span>
                  {!temProblema ? (
                    <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> CONFORME</span>
                  ) : (
                    <span className="text-red-600 text-xs font-bold flex items-center gap-1"><XCircle className="w-4 h-4"/> NÃO CONFORME</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {dadosGerais.observacoes && <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm"><span className="font-bold">Obs:</span> {dadosGerais.observacoes}</div>}

        {listaFotos.length > 0 && (
          <div className="mb-8 break-inside-avoid">
            <h3 className="text-sm font-bold bg-slate-800 text-white p-2 rounded-t mb-4">EVIDÊNCIAS VISUAIS</h3>
            <div className="grid grid-cols-3 gap-4">
              {listaFotos.map(([key, base64]: any, i) => (
                <div key={i} className="border p-1 rounded shadow-sm">
                  {/* Renderiza a imagem Base64 direto */}
                  <img src={base64} alt={key} className="w-full h-32 object-cover rounded" />
                  <p className="text-[10px] text-center mt-1 font-bold">{key}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t-2 border-slate-800 break-inside-avoid">
          <div className="text-center">
             {assinaturas.motorista && <img src={assinaturas.motorista} className="h-20 mx-auto object-contain" />}
             <div className="border-t border-slate-400 pt-2"><p className="font-bold text-sm">{vistoria.motorista_nome}</p><p className="text-xs">Motorista</p></div>
          </div>
          <div className="text-center">
             {assinaturas.vistoriador && <img src={assinaturas.vistoriador} className="h-20 mx-auto object-contain" />}
             <div className="border-t border-slate-400 pt-2"><p className="font-bold text-sm">{vistoria.vistoriador_nome}</p><p className="text-xs">Vistoriador</p></div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 mt-12" suppressHydrationWarning>
          Documento gerado em {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  );
}