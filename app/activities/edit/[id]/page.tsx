"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, FileText, Calculator, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

export default function EditActivityPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Estados do Formulário
  const [date, setDate] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState<any>("");
  const [volume, setVolume] = useState<any>("");

  // Específicos Veículo
  const [tripCount, setTripCount] = useState<number>(0);
  const [freightValue, setFreightValue] = useState<any>("");
  
  // Específicos Equipamento
  const [hours, setHours] = useState<any>("");
  const [dailyValue, setDailyValue] = useState<any>("");
  const [isMobilization, setIsMobilization] = useState(false);
  const [manualMobilizationKm, setManualMobilizationKm] = useState<any>("");
  
  // Lógica de Tipo
  const selectedAsset = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [selectedVehicleId, vehicles]);
  const isEquipment = selectedAsset?.type === 'Equipamento';
  
  // Lógica de Km Automático
  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [selectedProjectId, projects]);
  const oneWayDistance = selectedProject?.distance_km || 0;
  const totalKmCalculated = (oneWayDistance * 2) * tripCount;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // 1. Carrega auxiliares
    const { data: v } = await supabase.from('vehicles').select('*');
    const { data: p } = await supabase.from('projects').select('*');
    if (v) setVehicles(v);
    if (p) setProjects(p);

    // 2. Carrega o registro para edição
    const { data: activity } = await supabase.from('activities').select('*').eq('id', params.id).single();
    
    if (activity) {
      setDate(activity.date);
      setSelectedVehicleId(activity.vehicle_id);
      setSelectedProjectId(activity.project_id || "");
      setNotes(activity.notes || "");
      setQuantity(activity.quantity || "");
      setVolume(activity.volume || "");
      
      setTripCount(activity.trip_count || 0);
      setFreightValue(activity.freight_value || "");
      
      setHours(activity.hours || "");
      setDailyValue(activity.daily_value || "");
      
      setIsMobilization(activity.is_mobilization || false);
      // Se for mobilização, o total_km salvo é o manual
      if (activity.is_mobilization) {
        setManualMobilizationKm(activity.total_km);
      }
    }
    setInitialLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let finalTotalKm = 0;
    if (!isEquipment) {
      finalTotalKm = totalKmCalculated;
    } else if (isEquipment && isMobilization) {
      finalTotalKm = Number(manualMobilizationKm);
    }

    const activity = {
      date,
      vehicle_id: selectedVehicleId,
      project_id: selectedProjectId || null, // Pode ser nulo se for vacância manual
      notes,
      quantity: Number(quantity) || 0,
      volume: Number(volume) || 0,
      
      trip_count: isEquipment ? 0 : tripCount,
      freight_value: !isEquipment ? Number(freightValue) : 0,
      
      hours: isEquipment ? Number(hours) : 0,
      daily_value: isEquipment ? Number(dailyValue) : 0,
      
      is_mobilization: isEquipment ? isMobilization : false,
      total_km: finalTotalKm, 
    };

    const { error } = await supabase.from("activities").update(activity).eq('id', params.id);

    if (!error) {
      router.push("/activities");
      router.refresh();
    } else {
      alert("Erro ao atualizar: " + error.message);
      setLoading(false);
    }
  }

  if (initialLoading) return <div className="p-8 text-center text-gray-500">Carregando dados...</div>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/activities" className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Editar Registro</h1>
          <p className="text-sm text-gray-500">Alterar dados do apontamento.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* BLOCO 1: DADOS GERAIS */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900">
              <FileText className="h-4 w-4" /> Dados Iniciais
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Ativo</label>
                <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} required className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Selecione...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Obra de Destino</label>
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">Selecione (ou vazio se parado)...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* BLOCO 2: DINÂMICO */}
          {selectedVehicleId && (
             <div className="space-y-4">
               <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900">
                 <Calculator className="h-4 w-4" /> 
                 {isEquipment ? "Dados do Equipamento" : "Dados do Veículo"}
               </h3>

               {!isEquipment && (
                 <div className="rounded-xl bg-blue-50/50 p-6 border border-blue-100/50 grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Qtd. Viagens</label>
                      <input type="number" value={tripCount} onChange={e => setTripCount(Number(e.target.value))} className="w-full rounded-xl bg-white px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Valor Frete Total (R$)</label>
                      <div className="flex w-full items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <div className="flex h-[52px] items-center justify-center bg-gray-50 px-4 text-gray-500 border-r border-gray-100 font-medium">R$</div>
                        <input type="number" step="0.01" value={freightValue} onChange={e => setFreightValue(e.target.value)} className="h-[52px] w-full border-none bg-transparent px-4 text-sm outline-none" />
                      </div>
                    </div>
                 </div>
               )}

               {isEquipment && (
                 <div className="rounded-xl bg-orange-50/50 p-6 border border-orange-100/50 space-y-6">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setIsMobilization(!isMobilization)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isMobilization ? 'bg-orange-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isMobilization ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className="text-sm font-semibold text-gray-700">É Mobilização?</span>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Horas</label>
                        <input type="number" step="0.1" value={hours} onChange={e => setHours(e.target.value)} className="w-full rounded-xl bg-white px-4 py-3.5 text-sm outline-none shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Diária (R$)</label>
                        <div className="flex w-full items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                          <div className="flex h-[52px] items-center justify-center bg-gray-50 px-4 text-gray-500 border-r border-gray-100 font-medium">R$</div>
                          <input type="number" step="0.01" value={dailyValue} onChange={e => setDailyValue(e.target.value)} className="h-[52px] w-full border-none bg-transparent px-4 text-sm outline-none" />
                        </div>
                      </div>
                    </div>
                 </div>
               )}
             </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Peças</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Obs</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-gray-900 py-4 text-sm font-bold text-white hover:bg-black transition-all">
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}