import { createClient } from "@/lib/supabase-server";
import { Plus, Calendar, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ActivityActions } from "@/components/ActivityActions"; 

export default async function ActivitiesPage() {
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      vehicles!inner (name, plate, company, type),
      projects (name)
    `)
    .ilike('vehicles.company', '%Infra%') 
    .order('date', { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Diário de Obras</h1>
          <p className="text-sm text-gray-500">Registro diário de atividades (Apenas Frota Pré Infra).</p>
        </div>
        <Link href="/activities/new" className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black transition-all hover:scale-[1.02]">
            <Plus className="h-4 w-4" />
            Novo Registro
        </Link>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">Data</th>
              <th className="px-6 py-4 font-medium">Ativo</th>
              <th className="px-6 py-4 font-medium">Obra / Classificação</th> 
              <th className="px-6 py-4 font-medium text-right">Produção / Detalhes</th>
              <th className="px-6 py-4 font-medium text-right">Valor (R$)</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activities?.map((activity: any) => {
              
              // 1. Vacância de Manutenção (Sem valor, status vacancy)
              const isMaintenanceVacancy = activity.status === 'vacancy';

              // 2. Vacância Remunerada / Stand-by (Equipamento com valor, mas 0 horas)
              const isPaidStandby = 
                !isMaintenanceVacancy && 
                activity.vehicles?.type === 'Equipamento' && 
                (Number(activity.hours) === 0) && 
                (Number(activity.daily_value) > 0);

              const valorTotal = (Number(activity.freight_value) || 0) + (Number(activity.daily_value) || 0);

              return (
                <tr key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* DATA */}
                  <td className="px-6 py-4 text-gray-600 w-[140px]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(activity.date).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  
                  {/* ATIVO */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{activity.vehicles?.name}</div>
                    <div className="text-xs text-gray-500">{activity.vehicles?.plate}</div>
                  </td>
                  
                  {/* OBRA / CLASSIFICAÇÃO (AQUI ESTÁ A CORREÇÃO) */}
                  <td className="px-6 py-4">
                    {isMaintenanceVacancy ? (
                      // CENÁRIO 1: Manutenção (Vermelho)
                      <div className="flex items-center gap-2">
                         <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 border border-red-100">
                           <AlertCircle className="h-3 w-3" />
                           Manutenção / Parado
                         </span>
                         <span className="text-xs text-gray-400 block mt-1 truncate max-w-[150px]">
                           {activity.notes}
                         </span>
                      </div>
                    ) : isPaidStandby ? (
                      // CENÁRIO 2: Stand-by Remunerado (Laranja)
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">{activity.projects?.name || "Sem Obra"}</span>
                        <span className="inline-flex w-fit mt-1 items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 border border-orange-100">
                           <Clock className="h-3 w-3" />
                           Vacância / Stand-by
                        </span>
                      </div>
                    ) : (
                      // CENÁRIO 3: Produção Normal (Verde)
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">{activity.projects?.name || "Sem Obra"}</span>
                        <span className="inline-flex w-fit mt-1 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 border border-green-100">
                           Produção
                        </span>
                      </div>
                    )}
                  </td>

                  {/* PRODUÇÃO / DETALHES */}
                  <td className="px-6 py-4 text-right font-medium text-gray-600">
                    {!isMaintenanceVacancy && (
                      <>
                        {activity.volume > 0 && <div className="text-gray-900">{activity.volume} m³</div>}
                        {activity.quantity > 0 && <div>{activity.quantity} pçs</div>}
                        
                        {/* Se for Stand-by, não mostra 0 hrs, mostra texto. Se for prod, mostra horas */}
                        {isPaidStandby ? (
                            <div className="text-xs font-bold text-orange-600 uppercase">Diária S/ Uso</div>
                        ) : (
                            activity.hours > 0 && <div>{activity.hours} hrs</div>
                        )}
                        
                        {activity.trip_count > 0 && <div className="text-xs text-gray-500">{activity.trip_count} viagens</div>}
                        
                        {/* Mostra se for mobilização */}
                        {activity.is_mobilization && (
                            <div className="text-[10px] uppercase font-bold text-blue-600">Mobilização</div>
                        )}
                      </>
                    )}
                    {isMaintenanceVacancy && <span className="text-gray-300">-</span>}
                  </td>

                  {/* VALOR (R$) */}
                  <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                    {valorTotal > 0 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)
                      : <span className="text-gray-300">-</span>
                    }
                    
                    {activity.is_extensive && (
                        <div className="mt-1 flex justify-end">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                Extensivo
                            </span>
                        </div>
                    )}
                  </td>

                  {/* AÇÕES */}
                  <td className="px-6 py-4 text-right">
                    <ActivityActions id={activity.id} />
                  </td>
                </tr>
              );
            })}
            
            {(!activities || activities.length === 0) && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhum registro da frota Pré Infra encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}