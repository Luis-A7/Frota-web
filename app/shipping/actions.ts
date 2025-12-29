"use server";

import { createClient } from "@/lib/supabase";

export async function fetchExternalShippingData(startDate: string, endDate: string) {
  const apiUrl = `http://179.124.195.91:1890/ADM_PreInfra/api/bi/cargasProgramadas?dataInicial=${startDate}&dataFinal=${endDate}`;
  try {
    const response = await fetch(apiUrl, { cache: 'no-store' }); 
    if (!response.ok) return [];
    const data = await response.json();
    return data; 
  } catch (error) {
    console.error("Falha ao buscar cargas:", error);
    return [];
  }
}

export async function syncApiToSystem(startDate: string, endDate: string) {
  const supabase = createClient();
  const apiData = await fetchExternalShippingData(startDate, endDate);
  
  if (!apiData || apiData.length === 0) {
    return { success: false, message: "Nenhum dado encontrado na API." };
  }

  let counts = { projects: 0, activities: 0, updated: 0 };

  // Busca dados do sistema
  const { data: systemVehicles } = await supabase.from('vehicles').select('id, plate');
  const { data: systemProjects } = await supabase.from('projects').select('id, name, default_freight, default_freight_extensive');

  const normalizedVehicles = systemVehicles?.map(v => ({
    id: v.id,
    plate: v.plate?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  })) || [];

  const systemProjectNames = new Set(systemProjects?.map(p => p.name?.toUpperCase()));

  for (const load of apiData) {
    
    // 1. OBRAS
    const obraNome = load.siglaObra?.trim(); 
    const obraDesc = load.nomeObra;

    if (obraNome && !systemProjectNames.has(obraNome.toUpperCase())) {
      const { error } = await supabase.from('projects').insert({
        name: obraNome,
        location: obraDesc, 
        status: 'active',
        default_freight: 0,
        default_freight_extensive: 0
      });
      if (!error) {
        systemProjectNames.add(obraNome.toUpperCase()); 
        counts.projects++;
      }
    }

    // 2. ATIVIDADES
    if (load.StatusCarga === 'Expedida') {
        const apiPlate = (load.Placa || load.Placa3 || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const matchedVehicle = normalizedVehicles.find(v => v.plate === apiPlate);

        if (matchedVehicle) {
            
            // --- DETECÇÃO DE EXTENSIVA ---
            // Verifica se a palavra "EXTENSIV" aparece na sigla ou no nome da obra
            const textToCheck = (load.siglaObra + " " + load.nomeObra).toUpperCase();
            const isExtensive = textToCheck.includes("EXTENSIV") || textToCheck.includes("EXCEDENTE");

            // Busca a obra no banco (podemos ter acabado de criar, então buscamos de novo ou usamos cache se fosse otimizado)
            // Aqui vamos buscar do array local systemProjects se possível, mas como criamos novas, melhor buscar do banco para garantir
            // Para simplificar e garantir dados frescos:
            const { data: projRef } = await supabase.from('projects')
                .select('id, default_freight, default_freight_extensive')
                .eq('name', obraNome).single();
            
            if (projRef) {
                // DECISÃO DE VALOR
                const freightValue = isExtensive 
                    ? (Number(projRef.default_freight_extensive) || 0)
                    : (Number(projRef.default_freight) || 0);

                const totalVol = load.pecas.reduce((acc: number, p: any) => acc + (p.Volume || 0), 0);
                const totalPcs = load.pecas.reduce((acc: number, p: any) => acc + (p.Quantidade || 1), 0);
                
                // Verifica existência
                const { data: existing } = await supabase.from('activities').select('id, freight_value').eq('external_id', String(load.codProgCargas)).single();

                if (!existing) {
                    // CRIAR NOVO
                    const { error } = await supabase.from('activities').insert({
                        date: load.DataProgramacao.split('T')[0], 
                        vehicle_id: matchedVehicle.id,
                        project_id: projRef.id,
                        volume: totalVol,
                        quantity: totalPcs,
                        trip_count: 1, 
                        external_id: String(load.codProgCargas), 
                        notes: `[Importado] ${load.Motorista || ''}`,
                        
                        // NOVOS CAMPOS
                        freight_value: freightValue,
                        is_extensive: isExtensive
                    });
                    if (!error) counts.activities++;

                } else {
                    // ATUALIZAR EXISTENTE (Se estiver zerado ou valor mudou)
                    if (existing.freight_value === 0 && freightValue > 0) {
                         const { error } = await supabase.from('activities').update({ 
                             freight_value: freightValue,
                             is_extensive: isExtensive
                         }).eq('id', existing.id);
                         if (!error) counts.updated++;
                    }
                }
            }
        }
    }
  }

  return { 
    success: true, 
    message: "Processado!",
    details: `${counts.projects} Obras novas. ${counts.activities} Atividades criadas. ${counts.updated} Atualizadas.`
  };
}