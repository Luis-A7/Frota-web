"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Search, Plus, Truck, Tractor, Car, MoreHorizontal, Pencil, Filter, Settings2 } from "lucide-react";
import { EditVehicleModal } from "@/components/EditVehicleModal";

export default function FleetPage() {
  const supabase = createClient();
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false); // Filtro para mostrar inativos

  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('status', { ascending: true }) // Active primeiro
      .order('name', { ascending: true });
    
    if (data) setVehicles(data);
    setLoading(false);
  }

  // Filtragem
  const filteredVehicles = vehicles.filter(v => {
      const matchesSearch = 
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.plate?.toLowerCase().includes(search.toLowerCase()) ||
        v.company?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = showInactive ? true : v.status !== 'inactive';

      return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
      if (status === 'active') return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Ativo</span>;
      if (status === 'maintenance') return <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">Manutenção</span>;
      return <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Inativo</span>;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'Equipamento') return <Tractor className="h-4 w-4" />;
    if (type === 'Leve') return <Car className="h-4 w-4" />;
    return <Truck className="h-4 w-4" />;
  };

  return (
    <div className="p-8 mx-auto max-w-6xl">
      
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Frota & Equipamentos</h1>
          <p className="text-sm text-gray-500">Gerenciamento de ativos da empresa.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black transition-all">
            <Plus className="h-4 w-4" />
            Novo Cadastro
        </button>
      </div>

      {/* Barra de Ferramentas */}
      <div className="mb-6 flex gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Buscar veículo..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border-none bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm ring-1 ring-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 outline-none" 
            />
         </div>
         
         {/* Toggle Inativos */}
         <button 
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${showInactive ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
         >
            <Settings2 className="h-4 w-4" />
            {showInactive ? "Ocultar Inativos" : "Ver Inativos"}
         </button>
      </div>

      {/* TABELA DE VEÍCULOS */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-xs uppercase text-gray-500">
                <tr>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Ativo / Nome</th>
                    <th className="px-6 py-4 font-medium">Tipo</th>
                    <th className="px-6 py-4 font-medium">Empresa</th>
                    <th className="px-6 py-4 font-medium text-right">Diária (R$)</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredVehicles.map(vehicle => (
                    <tr key={vehicle.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                            {getStatusBadge(vehicle.status || 'active')}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col">
                                <span className={`font-bold ${vehicle.status === 'inactive' ? 'text-gray-400' : 'text-gray-900'}`}>{vehicle.name}</span>
                                <span className="text-xs font-mono text-gray-400">{vehicle.plate || "S/ Placa"}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600">
                                {getTypeIcon(vehicle.type)}
                                {vehicle.type}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                            {vehicle.company || "N/D"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                            {vehicle.default_daily_value > 0 ? `R$ ${vehicle.default_daily_value}` : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                             <button 
                                onClick={() => setEditingVehicle(vehicle)}
                                className="inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                             >
                                <Pencil className="h-4 w-4" />
                             </button>
                        </td>
                    </tr>
                ))}

                {filteredVehicles.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            Nenhum veículo encontrado.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {/* O MODAL MÁGICO */}
      {editingVehicle && (
        <EditVehicleModal 
            vehicle={editingVehicle}
            isOpen={!!editingVehicle}
            onClose={() => {
                setEditingVehicle(null);
                loadVehicles(); // Recarrega
            }}
        />
      )}
    </div>
  );
}