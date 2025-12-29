"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, FileText, Calculator, ArrowRightLeft, MapPin, Clock, ListChecks } from "lucide-react"; 
import Link from "next/link";

export default function NewActivityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Estados
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tripCount, setTripCount] = useState<number>(0);
  
  // Estados Equipamento
  const [isMobilization, setIsMobilization] = useState(false);
  const [isVacancy, setIsVacancy] = useState(false);
  
  // Novos Estados de Horário e Tarefa
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [taskType, setTaskType] = useState("");

  const [manualMobilizationKm, setManualMobilizationKm] = useState<number>(0);
  const [freightValue, setFreightValue] = useState<number | string>(""); 

  // Lista de Atividades Comuns
  const TASKS_OPTIONS = [
    "Escavação",
    "Carga de Caminhão",
    "Nivelamento / Espalhamento",
    "Compactação",
    "Limpeza de Terreno",
    "Demolição",
    "Transporte Interno",
    "Apoio à Obra",
    "Montagem",
    "Acabamento",
    "Outros"
  ];

  const selectedAsset = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId);
  }, [selectedVehicleId, vehicles]);

  const isEquipment = selectedAsset?.type === 'Equipamento';

  // Lógica de Cálculo de Horas
  useEffect(() => {
    if (startTime && endTime && !isVacancy) {
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end = new Date(`1970-01-01T${endTime}:00`);
      
      let diffMs = end.getTime() - start.getTime();
      
      // Se virou a noite (Ex: 23:00 as 02:00), soma 24h
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
      }

      const hours = diffMs / (1000 * 60 * 60);
      setCalculatedHours(parseFloat(hours.toFixed(2))); // Arredonda 2 casas
    } else if (isVacancy) {
      setCalculatedHours(0);
    }
  }, [startTime, endTime, isVacancy]);

  // Lógica Frete
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        if (project.default_freight > 0) {
            const calcFreight = project.default_freight * (tripCount > 0 ? tripCount : 1);
            setFreightValue(calcFreight);
        } else {
            setFreightValue("");
        }
      }
    }
  }, [selectedProjectId, tripCount, projects]);

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [selectedProjectId, projects]);

  const oneWayDistance = selectedProject?.distance_km || 0;
  const roundTripDistance = oneWayDistance * 2;
  const totalKmCalculated = roundTripDistance * tripCount;

  useEffect(() => {
    async function loadData() {
      const { data: v } = await supabase.from('vehicles').select('*').eq('status', 'active');
      const { data: p } = await supabase.from('projects').select('*').eq('status', 'active');
      if (v) setVehicles(v);
      if (p) setProjects(p);
    }
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    let finalTotalKm = 0;
    if (!isEquipment) {
      finalTotalKm = totalKmCalculated;
    } else if (isEquipment && isMobilization) {
      finalTotalKm = manualMobilizationKm;
    }

    const activity = {
      date: formData.get("date"),
      vehicle_id: selectedVehicleId,
      project_id: selectedProjectId,
      notes: formData.get("notes"),
      quantity: formData.get("quantity") ? Number(formData.get("quantity")) : 0,
      volume: formData.get("volume") ? Number(formData.get("volume")) : 0,
      
      trip_count: isEquipment ? 0 : tripCount,
      freight_value: !isEquipment && freightValue ? Number(freightValue) : 0,
      
      // Equipamentos: Usa o calculado ou 0 se for vacância
      hours: isEquipment ? calculatedHours : 0,
      start_time: isEquipment && !isVacancy ? startTime : null,
      end_time: isEquipment && !isVacancy ? endTime : null,
      task_type: isEquipment ? taskType : null,

      daily_value: isEquipment && formData.get("daily_value") ? Number(formData.get("daily_value")) : 0,
      
      is_mobilization: isEquipment ? isMobilization : false,
      total_km: finalTotalKm, 
    };

    const { error } = await supabase.from("activities").insert(activity);

    if (!error) {
      router.push("/activities");
      router.refresh();
    } else {
      alert("Erro ao salvar: " + error.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/activities" className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Novo Registro</h1>
          <p className="text-sm text-gray-500">Apontamento de produção e logística.</p>
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
                <input type="date" name="date" required className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Ativo (Veículo/Máquina)</label>
                <select 
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                    setIsMobilization(false);
                    setIsVacancy(false);
                    setStartTime("");
                    setEndTime("");
                    setCalculatedHours(0);
                  }}
                  required 
                  className="w-full appearance-none rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                    <option value="">Selecione...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Obra de Destino</label>
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required 
                className="w-full appearance-none rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">Selecione a obra...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.distance_km || 0} km da base)</option>
                ))}
              </select>

              {selectedProjectId && (
                (() => {
                   const p = projects.find(proj => proj.id === selectedProjectId);
                   if (p && p.distance_km > 0) {
                     return (
                       <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg mt-2">
                         <MapPin className="h-3 w-3" />
                         <span>
                           Distância da Obra: <strong>{p.distance_km}km</strong> (Ida + Volta: <strong>{p.distance_km * 2}km</strong>)
                         </span>
                       </div>
                     )
                   }
                   return null;
                })()
              )}
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* BLOCO 2: DINÂMICO */}
          {selectedVehicleId && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
               
               <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900">
                    <Calculator className="h-4 w-4" /> 
                    {isEquipment ? "Produção do Equipamento" : "Logística do Veículo"}
                  </h3>
               </div>

               {/* === VEÍCULO === */}
               {!isEquipment && (
                 <div className="rounded-xl bg-blue-50/50 p-6 border border-blue-100/50">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Qtd. Viagens</label>
                        <input 
                          type="number" 
                          name="trip_count" 
                          placeholder="0" 
                          value={tripCount}
                          onChange={(e) => setTripCount(Number(e.target.value))}
                          className="w-full rounded-xl bg-white px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Total Percorrido</label>
                        <div className="flex flex-col justify-center h-[52px] px-4 rounded-xl bg-white text-gray-700 shadow-sm border border-gray-100">
                           <span className="font-bold text-gray-900">{totalKmCalculated.toFixed(1)} km</span>
                           <span className="text-[10px] text-gray-400 leading-none">Calculado automaticamente</span>
                        </div>
                      </div>

                      <div className="space-y-2 col-span-full">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Valor Total do Frete (R$)</label>
                        <div className="flex w-full items-center rounded-xl bg-white px-4 shadow-sm ring-1 ring-transparent focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                          <span className="mr-3 font-medium text-gray-400">R$</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            name="freight_value" 
                            placeholder="0,00" 
                            value={freightValue} 
                            onChange={(e) => setFreightValue(e.target.value)} 
                            className="h-[52px] w-full border-none bg-transparent p-0 text-sm outline-none placeholder:text-gray-300" 
                          />
                        </div>
                      </div>
                    </div>
                 </div>
               )}

               {/* === EQUIPAMENTO === */}
               {isEquipment && (
                 <div className="rounded-xl bg-orange-50/50 p-6 border border-orange-100/50 space-y-6">
                    
                    {/* Botões de Ação */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className={`cursor-pointer rounded-xl border p-3 transition-all ${isMobilization ? 'bg-orange-100 border-orange-200 shadow-sm' : 'bg-white border-transparent shadow-sm hover:bg-gray-50'}`} onClick={() => { setIsMobilization(!isMobilization); setIsVacancy(false); }}>
                             <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isMobilization ? 'bg-orange-200 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
                                    <ArrowRightLeft className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${isMobilization ? 'text-orange-900' : 'text-gray-700'}`}>Mobilização</p>
                                    <p className="text-[10px] text-gray-500">Transporte.</p>
                                </div>
                             </div>
                        </div>

                        <div className={`cursor-pointer rounded-xl border p-3 transition-all ${isVacancy ? 'bg-red-100 border-red-200 shadow-sm' : 'bg-white border-transparent shadow-sm hover:bg-gray-50'}`} onClick={() => { setIsVacancy(!isVacancy); setIsMobilization(false); }}>
                             <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isVacancy ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${isVacancy ? 'text-red-900' : 'text-gray-700'}`}>Vacância</p>
                                    <p className="text-[10px] text-gray-500">Stand-by remunerado.</p>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      
                      {/* SELEÇÃO DE ATIVIDADE */}
                      <div className="space-y-2 col-span-full">
                         <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1 flex items-center gap-1">
                           <ListChecks className="h-3 w-3" /> Atividade Realizada
                         </label>
                         <select 
                           value={taskType}
                           onChange={(e) => setTaskType(e.target.value)}
                           disabled={isVacancy}
                           className={`w-full appearance-none rounded-xl px-4 py-3.5 text-sm outline-none shadow-sm transition-all ${isVacancy ? 'bg-gray-100 text-gray-400' : 'bg-white focus:ring-2 focus:ring-orange-500/20'}`}
                         >
                            <option value="">Selecione a atividade...</option>
                            {TASKS_OPTIONS.map(task => <option key={task} value={task}>{task}</option>)}
                         </select>
                      </div>

                      {/* HORÁRIOS */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Hora Inicial</label>
                        <input 
                            type="time" 
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            disabled={isVacancy}
                            className={`w-full rounded-xl px-4 py-3.5 text-sm outline-none shadow-sm transition-all ${isVacancy ? 'bg-gray-100 text-gray-400' : 'bg-white focus:ring-2 focus:ring-orange-500/20'}`} 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Hora Final</label>
                        <input 
                            type="time" 
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            disabled={isVacancy}
                            className={`w-full rounded-xl px-4 py-3.5 text-sm outline-none shadow-sm transition-all ${isVacancy ? 'bg-gray-100 text-gray-400' : 'bg-white focus:ring-2 focus:ring-orange-500/20'}`} 
                        />
                      </div>
                      
                      {/* RESULTADO DAS HORAS */}
                      <div className="space-y-2 col-span-full">
                         <div className="flex items-center justify-between rounded-xl bg-orange-100 p-4 border border-orange-200">
                            <span className="text-sm font-bold text-orange-900 uppercase">Total Horas Trabalhadas</span>
                            <span className="text-2xl font-bold text-orange-700">{calculatedHours}h</span>
                         </div>
                      </div>

                      <div className="space-y-2 col-span-full border-t border-orange-200 pt-4">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Valor da Diária (R$)</label>
                        <div className="flex w-full items-center rounded-xl bg-white px-4 shadow-sm ring-1 ring-transparent focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                          <span className="mr-3 font-medium text-gray-400">R$</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            name="daily_value" 
                            placeholder="0,00" 
                            className="h-[52px] w-full border-none bg-transparent p-0 text-sm outline-none placeholder:text-gray-300" 
                          />
                        </div>
                      </div>

                      {isMobilization && (
                        <div className="space-y-2 col-span-full animate-in fade-in slide-in-from-top-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-orange-600 ml-1">Km de Mobilização</label>
                          <div className="flex w-full items-center rounded-xl bg-white px-4 shadow-sm ring-1 ring-orange-200 focus-within:ring-2 focus-within:ring-orange-500/20">
                             <input 
                                type="number" 
                                step="0.1" 
                                value={manualMobilizationKm}
                                onChange={(e) => setManualMobilizationKm(Number(e.target.value))}
                                placeholder="Distância..." 
                                className="h-[52px] w-full border-none bg-transparent p-0 text-sm outline-none" 
                              />
                             <span className="ml-2 text-sm text-gray-400">km</span>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               )}
             </div>
          )}

          {/* BLOCO 3: COMUM */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Quantidade de Peças</label>
              <input type="number" name="quantity" placeholder="Opcional" className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Volume (m³)</label>
              <input type="number" step="0.1" name="volume" placeholder="Opcional" className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Observações</label>
            <textarea name="notes" rows={2} className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none resize-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-black hover:scale-[1.01] active:scale-[0.99]">
            {loading ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Registro</>}
          </button>
        </form>
      </div>
    </div>
  );
}