import { createClient } from "@/lib/supabase-server"; // Use o cliente de servidor
import { Plus, Search, Filter, Truck, MoreHorizontal } from "lucide-react";
import Link from "next/link";

export default async function FleetPage() {
  const supabase = await createClient();
  
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestão de Frota</h1>
          <p className="text-sm text-gray-500">Gerencie seus veículos e equipamentos.</p>
        </div>
        <Link href="/fleet/new" className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">
            <Plus className="h-4 w-4" />
            Novo Veículo
        </Link>
      </div>

      {/* Tabela Simplificada para Teste */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        {vehicles && vehicles.length > 0 ? (
          <ul>
            {vehicles.map(v => (
              <li key={v.id} className="border-b py-2">{v.name} - {v.status}</li>
            ))}
          </ul>
        ) : (
          <p>Nenhum veículo encontrado.</p>
        )}
      </div>
    </div>
  );
}