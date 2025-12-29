'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Plus, Car, Truck, Search, FileText } from 'lucide-react';

export default function VistoriasPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      // Busca as vistorias e também os dados do veículo relacionado (join)
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          vehicles (plate, model)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Erro ao buscar vistorias:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20 md:pb-4">
      
      {/* Cabeçalho */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Vistorias Realizadas</h1>
        
        {/* Barra de Pesquisa (Visual) */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar placa..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Botão Desktop (Escondido no Mobile se quiser, ou mantido) */}
        <Link href="/checklist/novo" className="hidden md:flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5 mr-2" />
          Nova Vistoria
        </Link>
      </div>

      {/* --- LISTA DE VISTORIAS --- */}
      <div className="max-w-6xl mx-auto">
        
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando vistorias...</p>
        ) : inspections.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">Nenhuma vistoria registrada ainda.</p>
            <Link href="/checklist/novo" className="text-blue-600 font-bold hover:underline">
              Começar a primeira
            </Link>
          </div>
        ) : (
          <>
            {/* VISÃO DESKTOP (Tabela) - Escondida em telas pequenas */}
            <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-gray-600">Data</th>
                    <th className="p-4 font-semibold text-gray-600">Veículo</th>
                    <th className="p-4 font-semibold text-gray-600">Tipo</th>
                    <th className="p-4 font-semibold text-gray-600">Km / Horas</th>
                    <th className="p-4 font-semibold text-gray-600">Status</th>
                    <th className="p-4 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map((insp) => (
                    <tr key={insp.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-gray-700">
                        {new Date(insp.created_at).toLocaleDateString('pt-BR')} <br/>
                        <span className="text-xs text-gray-500">{new Date(insp.created_at).toLocaleTimeString('pt-BR')}</span>
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        {insp.vehicles?.plate} <br/>
                        <span className="text-xs font-normal text-gray-500">{insp.vehicles?.model}</span>
                      </td>
                      <td className="p-4">
                        {insp.vehicle_type === 'equipment' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Truck className="w-3 h-3 mr-1" /> Equipamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Car className="w-3 h-3 mr-1" /> Automóvel
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-700">
                        {insp.odometer} Km
                        {insp.hour_meter && <div className="text-xs text-gray-500">{insp.hour_meter} Horas</div>}
                      </td>
                      <td className="p-4">
                        <span className="text-green-600 text-sm font-medium">Concluído</span>
                      </td>
                      <td className="p-4">
                        <button className="text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                          <FileText className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISÃO MOBILE (Cards) - Visível apenas em telas pequenas */}
            <div className="md:hidden space-y-4">
              {inspections.map((insp) => (
                <div key={insp.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-gray-800">{insp.vehicles?.plate}</span>
                      {insp.vehicle_type === 'equipment' ? 
                        <Truck className="w-4 h-4 text-orange-500" /> : 
                        <Car className="w-4 h-4 text-blue-500" />
                      }
                    </div>
                    <p className="text-sm text-gray-600">{insp.vehicles?.model}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(insp.created_at).toLocaleDateString('pt-BR')} às {new Date(insp.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-medium text-gray-800">{insp.odometer} Km</span>
                    <button className="mt-2 text-blue-600 text-sm font-medium">Ver</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* BOTÃO FLUTUANTE (FAB) - Só aparece no Mobile */}
      <Link href="/checklist/novo">
        <button className="md:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50">
          <Plus className="w-8 h-8" />
        </button>
      </Link>

    </div>
  );
}