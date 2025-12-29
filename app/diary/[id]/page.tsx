import { createClient } from "@/lib/supabase-server";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Wrench, 
  Truck, 
  Tractor, 
  Car, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Tag // <--- ADICIONADO: Importação que faltava
} from "lucide-react";
import Link from "next/link";

export default async function DiaryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Busca Dados do Veículo
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (!vehicle) return <div className="p-8">Veículo não encontrado.</div>;

  // 2. Busca Atividades
  const { data: activities } = await supabase
    .from('activities')
    .select('*, projects(name)')
    .eq('vehicle_id', id);

  // 3. Busca Manutenções
  const { data: maintenances } = await supabase
    .from('maintenances')
    .select('*')
    .eq('vehicle_id', id);

  // 4. LÓGICA DE FUSÃO (TIMELINE)
  const timeline = [
    ...(activities || []).map(a => ({ type: 'activity', date: a.date, data: a })),
    ...(maintenances || []).map(m => ({ type: 'maintenance', date: m.scheduled_date, data: m }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 5. Cálculos de Totais
  const totalKm = activities?.reduce((acc, curr) => acc + (curr.total_km || 0), 0) || 0;
  const totalHours = activities?.reduce((acc, curr) => acc + (curr.hours || 0), 0) || 0;

  const getVehicleIcon = () => {
    if (vehicle.type === 'Equipamento') return <Tractor className="h-8 w-8" />;
    if (vehicle.type === 'Leve') return <Car className="h-8 w-8" />;
    return <Truck className="h-8 w-8" />;
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      
      {/* --- HEADER --- */}
      <div className="mb-8">
        <Link href="/diary" className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar para Galeria
        </Link>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg">
              {getVehicleIcon()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{vehicle.name}</h1>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="font-mono text-sm uppercase bg-gray-100 px-2 py-0.5 rounded">{vehicle.plate || "S/ ID"}</span>
                <span className="text-sm">• {vehicle.company || "Próprio"}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold uppercase text-gray-400">Total Rodado</p>
              <p className="text-xl font-bold text-gray-900">{totalKm.toLocaleString('pt-BR')} km</p>
            </div>
            {vehicle.type === 'Equipamento' && (
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-xs font-bold uppercase text-gray-400">Horímetro Total</p>
                <p className="text-xl font-bold text-gray-900">{totalHours.toLocaleString('pt-BR')} h</p>
              </div>
            )}
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold uppercase text-gray-400">Eventos</p>
              <p className="text-xl font-bold text-gray-900">{timeline.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- TIMELINE --- */}
      <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-12">
        
        {timeline.map((item, index) => {
          const isActivity = item.type === 'activity';
          const payload = item.data;
          
          return (
            <div key={`${item.type}-${index}`} className="relative pl-8">
              
              <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                isActivity ? 'bg-blue-500' : 'bg-orange-500'
              }`} />

              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                {new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>

              <div className={`group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md ${
                !isActivity ? 'ring-orange-100 bg-orange-50/30' : ''
              }`}>
                
                {isActivity && (
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      {payload.status === 'vacancy' ? <Clock className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                         <h3 className="font-semibold text-gray-900">
                           {payload.status === 'vacancy' ? 'Veículo Parado (Manutenção)' : (payload.projects?.name || 'Sem Obra Definida')}
                         </h3>
                         
                         {/* LÓGICA DAS TAGS CORRIGIDA */}
                         {payload.status === 'vacancy' && (
                            <div className="flex flex-wrap gap-2">
                                {payload.stage ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-[10px] font-bold text-yellow-800 border border-yellow-200">
                                    <Tag className="h-3 w-3" />
                                    {payload.stage}
                                </span>
                                ) : (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                    Improdutivo
                                </span>
                                )}
                            </div>
                         )}
                      </div> {/* <--- DIV FECHADA CORRETAMENTE AQUI */}
                      
                      <p className="mt-1 text-sm text-gray-600">{payload.notes || "Sem observações."}</p>
                      
                      {payload.status !== 'vacancy' && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {payload.total_km > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                              Distância: {payload.total_km} km
                            </span>
                          )}
                          {payload.trip_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                              Viagens: {payload.trip_count}
                            </span>
                          )}
                          {payload.hours > 0 && (
                             <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                               Horas: {payload.hours}h
                             </span>
                          )}
                          {payload.volume > 0 && (
                             <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                               Volume: {payload.volume}m³
                             </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isActivity && (
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      payload.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                         <h3 className="font-semibold text-gray-900">Manutenção / Serviço</h3>
                         <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            payload.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                         }`}>
                           {payload.status === 'completed' ? 'Finalizada' : 'Agendada'}
                         </span>
                      </div>
                      
                      <p className="mt-1 text-sm font-medium text-gray-800">{payload.description}</p>
                      
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Início: {new Date(payload.scheduled_date).toLocaleDateString('pt-BR')}
                        </div>
                        {payload.end_date && payload.end_date !== payload.scheduled_date && (
                          <div className="flex items-center gap-1">
                             <ArrowLeft className="h-3 w-3 rotate-180" />
                             Fim: {new Date(payload.end_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {payload.status === 'completed' && payload.completed_date && (
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Baixa em: {new Date(payload.completed_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {timeline.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-gray-50 p-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Histórico Vazio</h3>
            <p className="text-sm text-gray-500">Nenhuma atividade ou manutenção registrada para este veículo ainda.</p>
          </div>
        )}

      </div>
    </div>
  );
}