"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, HardHat, MapPin, Save, DollarSign, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos da Obra
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState<string>("0");
  const [defaultFreight, setDefaultFreight] = useState<string>("0");
  const [defaultFreightExtensive, setDefaultFreightExtensive] = useState<string>("0");

  // Opção de Atualização em Massa
  const [updateRetroactive, setUpdateRetroactive] = useState(true); // Padrão marcado para facilitar

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      
      if (data) {
        setName(data.name || "");
        setLocation(data.location || "");
        setDistanceKm(String(data.distance_km || 0));
        setDefaultFreight(String(data.default_freight || 0));
        setDefaultFreightExtensive(String(data.default_freight_extensive || 0));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const valNormal = parseFloat(defaultFreight.replace(',', '.')) || 0;
    const valExtensive = parseFloat(defaultFreightExtensive.replace(',', '.')) || 0;

    const payload = {
      name,
      location,
      distance_km: parseFloat(distanceKm.replace(',', '.')) || 0,
      default_freight: valNormal,
      default_freight_extensive: valExtensive
    };

    // 1. Atualiza a OBRA
    const { error } = await supabase.from('projects').update(payload).eq('id', id);

    if (error) {
      alert("Erro ao salvar obra: " + error.message);
      setSaving(false);
      return;
    }

    // 2. (Opcional) Atualiza as ATIVIDADES ZERADAS vinculadas
    if (updateRetroactive) {
        console.log("Atualizando atividades zeradas...");
        
        // Atualiza Cargas Normais (is_extensive = false ou null)
        await supabase
            .from('activities')
            .update({ freight_value: valNormal })
            .eq('project_id', id)
            .is('is_extensive', false) // ou null, dependendo do banco, mas false é o padrão
            .eq('freight_value', 0); // SÓ ATUALIZA SE ESTIVER ZERADO

        // Atualiza Cargas Extensivas (is_extensive = true)
        await supabase
            .from('activities')
            .update({ freight_value: valExtensive })
            .eq('project_id', id)
            .eq('is_extensive', true)
            .eq('freight_value', 0); // SÓ ATUALIZA SE ESTIVER ZERADO
    }

    alert("Obra e atividades atualizadas com sucesso!");
    router.push("/projects");
    router.refresh();
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/projects" className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para Lista
      </Link>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <div className="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <HardHat className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Editar Obra</h1>
            <p className="text-sm text-gray-500">{name || "Configuração de Fretes"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Dados Básicos */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nome da Obra (API Link)</label>
              <input value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 ml-1">Localização</label>
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 ring-1 ring-gray-200">
                <MapPin className="h-4 w-4 text-gray-400" />
                <input value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          {/* TABELA DE PREÇOS */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase text-gray-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Tabela de Fretes
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Frete Normal */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Frete Normal</label>
                <div className="relative">
                   <div className="absolute left-4 top-3 text-gray-400">R$</div>
                  <input 
                    type="number" step="0.01" 
                    value={defaultFreight} 
                    onChange={e => setDefaultFreight(e.target.value)} 
                    className="w-full rounded-xl bg-blue-50 pl-10 pr-4 py-3 text-sm font-semibold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
              </div>

              {/* Frete Extensivo */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Frete Extensivo</label>
                <div className="relative">
                   <div className="absolute left-4 top-3 text-gray-400">R$</div>
                  <input 
                    type="number" step="0.01" 
                    value={defaultFreightExtensive} 
                    onChange={e => setDefaultFreightExtensive(e.target.value)} 
                    className="w-full rounded-xl bg-purple-50 pl-10 pr-4 py-3 text-sm font-semibold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500/20" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 ml-1">Distância (KM Ida)</label>
              <input type="number" step="0.1" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          {/* CHECKBOX MÁGICO */}
          <div className="flex items-start gap-3 rounded-xl bg-yellow-50 p-4">
             <div className="mt-0.5">
                <input 
                  type="checkbox" 
                  id="retro" 
                  checked={updateRetroactive} 
                  onChange={e => setUpdateRetroactive(e.target.checked)}
                  className="h-5 w-5 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                />
             </div>
             <div>
                <label htmlFor="retro" className="block text-sm font-bold text-yellow-900 cursor-pointer">
                   Aplicar estes valores nas atividades zeradas?
                </label>
                <p className="text-xs text-yellow-700 mt-1">
                   Se marcado, o sistema vai buscar todas as atividades desta obra que estão com <b>valor R$ 0,00</b> e atualizar para o novo preço. Atividades com valor já definido não serão alteradas.
                </p>
             </div>
          </div>

          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-sm font-bold text-white hover:bg-black transition-all shadow-lg">
            {saving ? "Salvando e Atualizando..." : <><Save className="h-4 w-4" /> Salvar Alterações</>}
          </button>
        </form>
      </div>
    </div>
  );
}