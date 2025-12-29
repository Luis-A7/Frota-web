"use client";

import { useEffect, useState, useMemo } from "react";
// Importamos a nova action de sincronização aqui
import { fetchExternalShippingData, syncApiToSystem } from "./actions"; 
import { createClient } from "@/lib/supabase";
import { 
  Truck, 
  Package, 
  TrendingUp, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  Clock,
  Calendar,
  Settings,
  X,
  Box,
  DownloadCloud // Ícone novo
} from "lucide-react";

export default function ShippingPage() {
  const supabase = createClient();
  
  // --- ESTADOS DE FILTRO (DATAS) ---
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // --- ESTADOS DE DADOS ---
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Estado para o loading do botão de sincronizar
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // --- ESTADOS DE META & CONFIGURAÇÃO ---
  const [monthKey, setMonthKey] = useState(""); 
  const [goalLoads, setGoalLoads] = useState(54);
  const [allowedPlates, setAllowedPlates] = useState<string[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    const now = new Date();
    const key = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    setMonthKey(key);
    
    loadData(key, dateRange.start, dateRange.end);
  }, []); 

  // --- FUNÇÃO DE CARGA ---
  async function loadData(key: string, start: string, end: string) {
    setLoading(true);
    
    // 1. Busca Configuração da Meta
    const { data: goalData } = await supabase
      .from('shipping_goals')
      .select('target_loads, allowed_plates')
      .eq('month_key', key)
      .single();
    
    if (goalData) {
      setGoalLoads(goalData.target_loads || 54);
      setAllowedPlates(goalData.allowed_plates || []);
    }

    // 2. Busca Dados Externos
    const externalData = await fetchExternalShippingData(start, end);
    
    setLoads(externalData || []);
    setLastUpdate(new Date());
    setLoading(false);
  }

  // --- FUNÇÃO DE SINCRONIZAÇÃO (INTEGRAÇÃO) ---
  async function handleSyncSystem() {
    if (!confirm("Isso vai cadastrar obras novas e gerar atividades no diário para as cargas expedidas deste período. Continuar?")) return;
    
    setIsSyncing(true);
    // Chama a action que criamos no passo anterior
    const result = await syncApiToSystem(dateRange.start, dateRange.end);
    setIsSyncing(false);

    if (result.success) {
      alert(result.message + "\n" + result.details);
      // Recarrega os dados para garantir consistência visual
      loadData(monthKey, dateRange.start, dateRange.end);
    } else {
      alert("Erro: " + result.message);
    }
  }

  // --- CÁLCULO DE MÉTRICAS ---
  const metrics = useMemo(() => {
    let shippedCountValid = 0; 
    let shippedCountTotal = 0; 
    let totalVolume = 0;
    let totalPieces = 0;

    loads.forEach(load => {
      const isShipped = load.StatusCarga === 'Expedida';
      
      const loadVolume = load.pecas.reduce((acc: number, p: any) => acc + (p.Volume || 0), 0);
      const loadPieces = load.pecas.reduce((acc: number, p: any) => acc + (p.Quantidade || 1), 0);
      
      totalVolume += loadVolume;
      totalPieces += loadPieces;

      if (isShipped) {
        shippedCountTotal++;
        
        const plate = (load.Placa || load.Placa3 || "").replace(/[^a-zA-Z0-9]/g, "");
        const isAllowed = allowedPlates.some(p => p.replace(/[^a-zA-Z0-9]/g, "") === plate);
        
        if (allowedPlates.length === 0 || isAllowed) {
          shippedCountValid++;
        }
      }
    });

    return {
      shippedCountValid,
      shippedCountTotal,
      totalVolume,
      totalPieces,
      totalLoads: loads.length
    };
  }, [loads, allowedPlates]);

  // --- SALVAR CONFIGURAÇÃO ---
  async function saveConfig() {
    const { error } = await supabase
      .from('shipping_goals')
      .upsert({ 
        month_key: monthKey, 
        target_loads: goalLoads,
        allowed_plates: allowedPlates
      }, { onConflict: 'month_key' });

    if (!error) setIsConfigOpen(false);
    else alert("Erro ao salvar configuração.");
  }

  const availablePlates = useMemo(() => {
    const plates = new Set<string>();
    loads.forEach(l => {
      const p = l.Placa || l.Placa3;
      if (p) plates.add(p);
    });
    return Array.from(plates).sort();
  }, [loads]);

  const filteredLoads = loads.filter(load => 
    load.nomeObra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.Motorista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.Placa?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      
      {/* --- CABEÇALHO COM FILTROS --- */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Painel de Expedição</h1>
          <p className="text-sm text-gray-500 mt-1">
             Atualizado às {lastUpdate ? lastUpdate.toLocaleTimeString('pt-BR') : '...'}
          </p>
        </div>

        {/* Área de Filtros de Data */}
        <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto">
          <div className="w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Início</label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full rounded-xl bg-gray-50 border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Fim</label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full rounded-xl bg-gray-50 border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <button 
            onClick={() => loadData(monthKey, dateRange.start, dateRange.end)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black transition-all shadow-md active:translate-y-0.5"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Filtrar
          </button>
        </div>
      </div>

      {/* --- KPIS (META DE CARGAS) --- */}
      <div className="grid gap-6 md:grid-cols-4">
        
        {/* CARD PRINCIPAL: META DE CARGAS */}
        <div className="col-span-2 rounded-2xl bg-gray-900 p-6 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Cargas Realizadas (Meta)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="text-4xl font-bold">{metrics.shippedCountValid}</h2>
                <span className="text-xl text-gray-500 font-normal">/ {goalLoads}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                *Contando apenas veículos selecionados
              </p>
            </div>
            
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              <Settings className="h-3 w-3" /> Configurar Meta
            </button>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-400">
              <span>Progresso</span>
              <span>{goalLoads > 0 ? ((metrics.shippedCountValid / goalLoads) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-700/50 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (metrics.shippedCountValid / (goalLoads || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: VOLUME TOTAL */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
            <Box className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Volume Total</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">{metrics.totalVolume.toFixed(2)} <span className="text-sm text-gray-500 font-normal">m³</span></h3>
          <p className="mt-1 text-xs text-blue-600 font-medium">Programado no período</p>
        </div>

        {/* CARD 3: PEÇAS TOTAIS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 mb-4">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Total de Peças</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">{metrics.totalPieces.toLocaleString()}</h3>
          <p className="mt-1 text-xs text-orange-600 font-medium">Unidades indiv.</p>
        </div>
      </div>

      {/* --- MODAL DE CONFIGURAÇÃO DA META --- */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Configurar Meta do Mês</h3>
              <button onClick={() => setIsConfigOpen(false)}><X className="h-5 w-5 text-gray-500 hover:bg-gray-100 rounded-full p-1" /></button>
            </div>

            <div className="space-y-6">
              {/* Meta Numérica */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 ml-1">Meta de Cargas (Qtd)</label>
                <input 
                  type="number" 
                  value={goalLoads}
                  onChange={(e) => setGoalLoads(Number(e.target.value))}
                  className="w-full rounded-xl bg-gray-50 border-gray-200 px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Seletor de Veículos */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 ml-1 mb-2 block">
                  Veículos que contam para a meta
                </label>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-2 space-y-1">
                  {availablePlates.length === 0 && <p className="text-xs text-gray-400 p-2">Nenhuma placa encontrada na busca atual.</p>}
                  
                  {availablePlates.map(plate => (
                    <label key={plate} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={allowedPlates.includes(plate)}
                        onChange={(e) => {
                          if (e.target.checked) setAllowedPlates(prev => [...prev, plate]);
                          else setAllowedPlates(prev => prev.filter(p => p !== plate));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{plate}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-right">
                  {allowedPlates.length} veículos selecionados
                </p>
              </div>

              <button 
                onClick={saveConfig}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white hover:bg-black transition-all"
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LISTAGEM --- */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            Cargas no Período
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-3">
             {/* BOTÃO DE SINCRONIZAÇÃO ADICIONADO AQUI */}
             <button 
              onClick={handleSyncSystem}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadCloud className={`h-4 w-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing ? "Sincronizando..." : "Gerar Diário"}
            </button>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar obra, motorista..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-full sm:w-60 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Obra</th>
                <th className="px-6 py-4">Veículo</th>
                <th className="px-6 py-4 text-center">Peças</th>
                <th className="px-6 py-4 text-right">Volume (m³)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                 <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Carregando dados...</td></tr>
              ) : filteredLoads.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
              ) : (
                filteredLoads.map((load) => {
                  const isShipped = load.StatusCarga === 'Expedida';
                  const vol = load.pecas.reduce((acc: number, p: any) => acc + (p.Volume || 0), 0);
                  const pcs = load.pecas.reduce((acc: number, p: any) => acc + (p.Quantidade || 1), 0);
                  const isTargetVehicle = allowedPlates.includes(load.Placa || load.Placa3);

                  return (
                    <tr key={load.codProgCargas} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          isShipped ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {isShipped ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {isShipped ? 'EXPEDIDA' : 'PROGRAMADA'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(load.DataProgramacao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{load.siglaObra}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[180px]" title={load.nomeObra}>{load.nomeObra}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span className={isTargetVehicle ? "font-bold text-blue-700" : "text-gray-700"}>
                            {load.Placa || load.Placa3 || "S/ Placa"}
                          </span>
                        </div>
                        {isTargetVehicle && <span className="text-[9px] text-blue-500 font-bold ml-6">★ META</span>}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-gray-700">
                        {pcs}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                        {vol.toFixed(3)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}