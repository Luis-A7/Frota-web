import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Truck, Tractor, Car, AlertCircle, Search } from "lucide-react";

export default async function DiaryPage() {
  const supabase = await createClient();

  // Busca apenas veículos ativos da empresa "Pré Infra" (ou similar)
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'active')
    .ilike('company', '%Infra%') // <--- O FILTRO MÁGICO
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  const getIcon = (type: string) => {
    if (type === 'Equipamento') return <Tractor className="h-8 w-8" />;
    if (type === 'Leve') return <Car className="h-8 w-8" />;
    return <Truck className="h-8 w-8" />;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Diário de Bordo</h1>
        <p className="text-sm text-gray-500">Selecione um ativo da frota <span className="font-bold text-gray-700">Pré Infra</span> para ver o histórico.</p>
      </div>

      {!vehicles || vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Nenhum veículo encontrado</h3>
          <p className="text-sm text-gray-500">Não há veículos ativos cadastrados com a empresa "Pré Infra".</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vehicles.map((vehicle) => (
            <Link 
              key={vehicle.id} 
              href={`/diary/${vehicle.id}`}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-blue-500/20 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm ${
                    vehicle.type === 'Equipamento' ? 'bg-orange-500' : 'bg-gray-900'
                }`}>
                  {getIcon(vehicle.type)}
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    vehicle.type === 'Equipamento' 
                    ? 'bg-orange-50 text-orange-700 ring-orange-600/20' 
                    : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                }`}>
                  {vehicle.type}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {vehicle.name}
                </h3>
                <p className="text-sm font-mono text-gray-500 mt-1 uppercase">
                  {vehicle.plate || "S/ Placa"}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-4 text-xs font-medium text-gray-400">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Ativo • {vehicle.company}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}