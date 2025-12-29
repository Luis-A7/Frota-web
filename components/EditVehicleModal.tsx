"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { X, Save, Truck, Building2, DollarSign, Trash2, Activity, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface EditVehicleModalProps {
  vehicle: any;
  isOpen: boolean;
  onClose: () => void;
}

export function EditVehicleModal({ vehicle, isOpen, onClose }: EditVehicleModalProps) {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  
  // Campos
  const [name, setName] = useState(vehicle?.name || "");
  const [plate, setPlate] = useState(vehicle?.plate || "");
  const [company, setCompany] = useState(vehicle?.company || "");
  const [type, setType] = useState(vehicle?.type || "Equipamento");
  const [status, setStatus] = useState(vehicle?.status || "active"); // NOVO
  const [defaultDailyValue, setDefaultDailyValue] = useState(vehicle?.default_daily_value || 0);

  const [updateRetroactive, setUpdateRetroactive] = useState(false);

  if (!isOpen) return null;

  async function handleSave() {
    setLoading(true);
    const valDaily = Number(defaultDailyValue) || 0;

    const { error } = await supabase.from('vehicles').update({
      name,
      plate,
      company,
      type,
      status, // Salva o status (active, maintenance, inactive)
      default_daily_value: valDaily
    }).eq('id', vehicle.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      setLoading(false);
      return;
    }

    if (updateRetroactive && valDaily > 0) {
       await supabase
         .from('activities')
         .update({ daily_value: valDaily })
         .eq('vehicle_id', vehicle.id)
         .eq('daily_value', 0);
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  // Função de Excluir / Inativar
  async function handleDelete() {
    if (!confirm("Tem certeza? Se houver histórico, o veículo será apenas INATIVADO para não perder dados.")) return;
    setLoading(true);

    // Tenta excluir
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);

    if (error) {
      // Se der erro (provavelmente por ter histórico FK), Inativa
      console.log("Erro ao excluir (possui histórico). Inativando...");
      await supabase.from('vehicles').update({ status: 'inactive' }).eq('id', vehicle.id);
      alert("Como este veículo já possui histórico financeiro, ele foi movido para 'Inativos' e não aparecerá mais em novos cadastros.");
    } else {
      alert("Veículo excluído permanentemente.");
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status === 'active' ? 'bg-green-100 text-green-600' : status === 'maintenance' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Editar Ativo</h2>
              <p className="text-xs text-gray-500">
                {status === 'inactive' ? 'Este veículo está INATIVO.' : 'Edição de cadastro.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          
          <div className="grid gap-4">
            
            {/* STATUS (MUITO IMPORTANTE) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Situação Atual</label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setStatus('active')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${status === 'active' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                        Ativo
                    </button>
                    <button 
                        onClick={() => setStatus('maintenance')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${status === 'maintenance' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                        Manutenção
                    </button>
                    <button 
                        onClick={() => setStatus('inactive')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${status === 'inactive' ? 'bg-gray-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                        Inativo
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                    {status === 'active' && "Aparece nos cadastros normalmente."}
                    {status === 'maintenance' && "Indisponível temporariamente."}
                    {status === 'inactive' && "Oculto de novos lançamentos (Histórico preservado)."}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Nome</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Placa</label>
                    <input value={plate} onChange={e => setPlate(e.target.value)} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Empresa</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input value={company} onChange={e => setCompany(e.target.value)} className="w-full rounded-xl bg-gray-50 pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Diária (R$)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-green-600" />
                        <input type="number" step="0.01" value={defaultDailyValue} onChange={e => setDefaultDailyValue(Number(e.target.value))} className="w-full rounded-xl bg-green-50 pl-9 pr-4 py-3 text-sm font-bold text-green-900 outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                </div>
            </div>

            {/* CHECKBOX RETROATIVO */}
            <div className="flex items-start gap-3 rounded-xl bg-yellow-50 p-3 border border-yellow-100">
                <input 
                  type="checkbox" 
                  id="retroActive" 
                  checked={updateRetroactive} 
                  onChange={e => setUpdateRetroactive(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                />
                <label htmlFor="retroActive" className="text-xs text-yellow-800 cursor-pointer">
                   Atualizar valores passados zerados?
                </label>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-gray-100 p-6 bg-gray-50 rounded-b-2xl">
          <button 
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:shadow-sm transition-all"
          >
            <Trash2 className="h-4 w-4" /> Excluir / Inativar
          </button>
          
          <div className="flex gap-3">
              <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-white hover:shadow-sm transition-all">
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-black transition-all shadow-md disabled:opacity-70"
              >
                {loading ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar</>}
              </button>
          </div>
        </div>

      </div>
    </div>
  );
}