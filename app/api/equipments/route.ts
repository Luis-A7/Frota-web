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

  // Busca APENAS Equipamentos
  const { data: activities, error } = await supabase
    .from('activities')
    .select(`
      date,
      hours,
      daily_value,
      is_mobilization,
      total_km,
      vehicles!inner (name, plate, type),
      projects (name)
    `)
    .eq('vehicles.type', 'Equipamento') // <--- Filtro inverso ao de veículos
    .order('date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formattedData = activities.map(item => {
    const vehicle = Array.isArray(item.vehicles) ? item.vehicles[0] : item.vehicles;
    const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
    
    // Calcula o Faturamento
    // Se for mobilização, não tem "valor" de diária usualmente, a menos que tenha sido lançado.
    // Aqui assumimos que o valor salvo no banco (daily_value) é o valor TOTAL cobrado no dia.
    // Mas se o sistema salva valor POR HORA, precisaríamos multiplicar: (item.hours * item.daily_value)
    // No seu formulário atual, parece que 'daily_value' é o valor inserido manualmente (Valor da Diária Total).
    // Então vamos usar direto.
    
    const valorGerado = item.daily_value || 0;

    return {
      "Obra": project?.name || "N/A",
      "Equipamento": `${vehicle?.name || ''} - ${vehicle?.plate || ''}`,
      "Data": item.date,
      "Horas Trabalhadas": item.hours || 0,
      "Valor Gerado (R$)": valorGerado,
      "Tipo Registro": item.is_mobilization ? "Mobilização" : "Produção",
      "Km Mobilização": item.is_mobilization ? (item.total_km || 0) : 0
    };
  });

  return NextResponse.json(formattedData);
}