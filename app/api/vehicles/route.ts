import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const API_SECRET = "bi_frota_2025"; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (token !== API_SECRET) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: activities, error } = await supabase
    .from('activities')
    .select(`
      date,
      trip_count,
      quantity,
      volume,
      freight_value,
      total_km,
      vehicles!inner (name, plate, type),
      projects (name, distance_km) 
    `) 
    // ^ Adicionei distance_km aqui para poder calcular caso venha zerado
    .neq('vehicles.type', 'Equipamento') 
    .order('date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formattedData = activities.map(item => {
    const vehicle = Array.isArray(item.vehicles) ? item.vehicles[0] : item.vehicles;
    const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;

    // Lógica de Correção do KM:
    // Se o total_km salvo for 0, pega a distância da obra * 2 (Ida+Volta).
    // Se não tiver obra ou distancia, fica 0.
    let finalKm = item.total_km || 0;
    if (finalKm === 0 && project?.distance_km) {
       finalKm = Number(project.distance_km) * 2;
    }

    return {
      "Obra": project?.name || "N/A",
      "Nome do veiculo": `${vehicle?.name || ''} - ${vehicle?.plate || ''}`,
      "Quantidade de fretes": 1, // FIXO EM 1 (Conforme solicitado)
      "Quantidade de peças": item.quantity || 0,
      "m3": item.volume || 0,
      "Valor do frete": item.freight_value || 0,
      "Data": item.date,
      "Quantidade de Km": finalKm // Km corrigido
    };
  });

  return NextResponse.json(formattedData);
}