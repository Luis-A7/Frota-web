"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, X, Trash2, Tag } from "lucide-react";

export default function CalendarPage() {
  const supabase = createClient();
  
  // --- ESTADOS ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [editingItem, setEditingItem] = useState<any>(null); 
  const [selectedDateStr, setSelectedDateStr] = useState(""); 

  // Dados
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [linkedActivities, setLinkedActivities] = useState<any[]>([]); // <--- NOVO: Atividades vinculadas

  // --- CARREGAMENTO ---
  useEffect(() => {
    fetchData();
  }, [currentDate]);

  async function fetchData() {
    const { data: v } = await supabase.from('vehicles').select('id, name, plate').eq('status', 'active');
    if (v) setVehicles(v);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data: m } = await supabase
      .from('maintenances')
      .select(`*, vehicles(name, plate)`)
      .lte('scheduled_date', endOfMonth)
      .gte('end_date', startOfMonth);
    
    if (m) setMaintenances(m);
  }

  // Busca atividades (dias de vacância) vinculadas a uma manutenção específica
  async function fetchLinkedActivities(maintenanceId: string) {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('maintenance_id', maintenanceId)
      .order('date', { ascending: true });
    
    setLinkedActivities(data || []);
  }

  // --- AÇÕES DO USUÁRIO ---
  function handleDateClick(dateStr: string) {
    setEditingItem(null); 
    setLinkedActivities([]); // Limpa ao criar novo
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
  }

  async function handleTaskClick(e: React.MouseEvent, item: any) {
    e.stopPropagation(); 
    setEditingItem(item);
    await fetchLinkedActivities(item.id); // <--- Busca o detalhe dos dias
    setIsModalOpen(true);
  }

  // Atualiza a TAG de um dia específico (sem fechar o modal)
  async function handleUpdateStage(activityId: string, newStage: string) {
    await supabase.from('activities').update({ stage: newStage }).eq('id', activityId);
    // Atualiza estado local para feedback visual imediato
    setLinkedActivities(prev => prev.map(a => a.id === activityId ? { ...a, stage: newStage } : a));
  }

  // --- SALVAR (PRINCIPAL) ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const startDateStr = formData.get("scheduled_date") as string;
    const duration = Number(formData.get("duration") || 1);
    const description = formData.get("description") as string;
    const vehicleId = formData.get("vehicle_id");
    
    const startObj = new Date(startDateStr);
    const startDateForCalc = new Date(startObj.valueOf() + startObj.getTimezoneOffset() * 60000);
    const endDateObj = new Date(startDateForCalc);
    endDateObj.setDate(endDateObj.getDate() + (duration - 1));
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const isCompleted = formData.get("is_completed") === "on";
    const status = isCompleted ? 'completed' : 'pending';
    const completedDate = isCompleted ? formData.get("completed_date") : null;

    const maintenancePayload = {
      vehicle_id: vehicleId,
      description: description,
      scheduled_date: startDateStr,
      end_date: endDateStr,
      status,
      completed_date: completedDate,
    };

    let savedRecordId = editingItem?.id;
    let error;

    if (editingItem) {
      const res = await supabase.from('maintenances').update(maintenancePayload).eq('id', editingItem.id).select().single();
      error = res.error;
      if (res.data) savedRecordId = res.data.id;
    } else {
      const res = await supabase.from('maintenances').insert(maintenancePayload).select().single();
      error = res.error;
      if (res.data) savedRecordId = res.data.id;
    }
    
    if (error) {
      alert("Erro: " + error.message);
      setLoading(false);
      return;
    }

    // GERAÇÃO DE VACÂNCIA (Lógica Mantida)
    if (!isCompleted) {
        const confirmMsg = editingItem 
            ? "Deseja REGERAR os dias de vacância? (Isso resetará as tags/etapas diárias já cadastradas)" 
            : "Deseja gerar automaticamente os registros de 'Vacância' no Diário?";

        // Só pergunta se for NOVO ou se o usuário quiser explicitamente resetar na edição
        // Na edição, geralmente não queremos resetar para não perder as tags, a menos que as datas mudem drasticamente.
        // Vamos simplificar: Se for novo, pergunta. Se for edição, só avisa se mudar datas (complexo para agora, vamos manter o confirm).
        
        if (confirm(confirmMsg)) {
            if (savedRecordId) {
                await supabase.from('activities').delete().eq('maintenance_id', savedRecordId);
            }

            const vacancyRecords = [];
            for (let i = 0; i < duration; i++) {
                const loopDate = new Date(startDateForCalc);
                loopDate.setDate(loopDate.getDate() + i);
                const loopDateStr = loopDate.toISOString().split('T')[0];

                vacancyRecords.push({
                    date: loopDateStr,
                    vehicle_id: vehicleId,
                    project_id: null, 
                    status: 'vacancy', 
                    notes: `[Manutenção] ${description}`,
                    maintenance_id: savedRecordId,
                    quantity: 0, volume: 0, trip_count: 0, total_km: 0
                });
            }

            await supabase.from('activities').insert(vacancyRecords);
        }
    }

    await fetchData();
    setIsModalOpen(false);
    setLoading(false);
  }

  async function handleDelete() {
    if (!editingItem || !confirm("Tem certeza?")) return;
    setLoading(true);
    await supabase.from('maintenances').delete().eq('id', editingItem.id);
    await fetchData();
    setIsModalOpen(false);
    setLoading(false);
  }

  // --- RENDERIZAÇÃO ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    calendarCells.push({ date, dateStr: date.toLocaleDateString('en-CA') });
  }

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Agenda de Manutenções</h1>
          <p className="text-sm text-gray-500">Planejamento preventivo e diário de oficina.</p>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronLeft className="h-5 w-5 text-gray-500" /></button>
          <span className="w-32 text-center font-semibold text-gray-900">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronRight className="h-5 w-5 text-gray-500" /></button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 text-center text-xs font-semibold uppercase text-gray-500">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day} className="py-3">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 auto-rows-[140px] divide-x divide-y divide-gray-100">
          {calendarCells.map((cell, index) => {
            if (!cell) return <div key={index} className="bg-gray-50/30" />;
            const { date, dateStr } = cell;
            const isToday = new Date().toDateString() === date.toDateString();
            const tasks = maintenances.filter(m => dateStr >= m.scheduled_date && dateStr <= (m.end_date || m.scheduled_date));

            return (
              <div key={dateStr} onClick={() => handleDateClick(dateStr)} className={`group relative cursor-pointer p-2 transition-all hover:bg-blue-50/50 ${isToday ? 'bg-blue-50/30' : ''}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-blue-600 text-white' : 'text-gray-500 group-hover:bg-white group-hover:shadow-sm'}`}>{date.getDate()}</span>
                <div className="mt-2 flex flex-col gap-1 overflow-y-auto max-h-[90px] scrollbar-thin">
                  {tasks.map(task => (
                    <div key={task.id} onClick={(e) => handleTaskClick(e, task)} className={`truncate rounded px-2 py-1 text-[10px] font-medium shadow-sm border-l-2 ${task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-500' : 'bg-orange-50 text-orange-700 border-orange-500'}`}>
                      {task.vehicles?.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="mb-6 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingItem ? "Gerenciar Manutenção" : "Novo Agendamento"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-1">
              <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">Veículo</label>
                    <select name="vehicle_id" defaultValue={editingItem?.vehicle_id || ""} required className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all border border-transparent focus:border-blue-500">
                      <option value="">Selecione...</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} - {v.plate}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">Início</label>
                      <input type="date" name="scheduled_date" defaultValue={editingItem?.scheduled_date || selectedDateStr} required className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">Dias</label>
                      <input type="number" name="duration" min="1" defaultValue={editingItem ? Math.max(1, (new Date(editingItem.end_date).getTime() - new Date(editingItem.scheduled_date).getTime()) / (1000 * 3600 * 24) + 1) : 1} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">Descrição Geral</label>
                  <textarea name="description" defaultValue={editingItem?.description || ""} required rows={2} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/20" />
                </div>

                {/* --- SEÇÃO NOVA: DIÁRIO DA OFICINA (TAGS POR DIA) --- */}
                {editingItem && linkedActivities.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-gray-700">
                      <Tag className="h-4 w-4" /> Diário / Etapas por Dia
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                      {linkedActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 rounded-lg bg-white p-2 shadow-sm ring-1 ring-gray-100">
                          <div className="flex h-8 w-12 flex-col items-center justify-center rounded border border-gray-100 bg-gray-50 text-xs font-bold text-gray-600">
                            <span>{new Date(activity.date).getDate()}</span>
                            <span className="text-[8px] uppercase">{new Date(activity.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                          </div>
                          
                          <input 
                            type="text" 
                            placeholder="Ex: Aguardando peça, Diagnóstico..." 
                            defaultValue={activity.stage || ""}
                            onBlur={(e) => handleUpdateStage(activity.id, e.target.value)} // Salva ao sair do campo
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300 focus:placeholder:text-gray-400"
                          />
                          
                          {activity.stage && (
                             <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 text-center">Digite a etapa e clique fora para salvar automaticamente.</p>
                  </div>
                )}

                <div className="rounded-xl bg-gray-50 p-4 space-y-4">
                   <div className="flex items-center gap-3">
                      <input type="checkbox" name="is_completed" id="done" defaultChecked={editingItem?.status === 'completed'} onChange={(e) => { const el = document.getElementById('completed_date_container'); if(el) el.style.display = e.target.checked ? 'block' : 'none'; }} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <label htmlFor="done" className="text-sm font-semibold text-gray-700">Manutenção Finalizada</label>
                   </div>
                   <div id="completed_date_container" style={{ display: editingItem?.status === 'completed' ? 'block' : 'none' }}>
                      <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">Data da Baixa</label>
                      <input type="date" name="completed_date" defaultValue={editingItem?.completed_date || new Date().toISOString().split('T')[0]} className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm border border-gray-200" />
                   </div>
                </div>
              </form>
            </div>

            <div className="mt-6 flex gap-3 shrink-0 pt-2 border-t border-gray-50">
              {editingItem && (
                <button type="button" onClick={handleDelete} disabled={loading} className="flex items-center justify-center rounded-xl bg-red-50 px-4 py-3 text-red-600 font-bold hover:bg-red-100"><Trash2 className="h-5 w-5" /></button>
              )}
              <button type="submit" form="maintenance-form" disabled={loading} className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-black transition-all shadow-lg active:scale-[0.98]">
                {loading ? "Salvando..." : (editingItem ? "Salvar Alterações" : "Criar Agendamento")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}