"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { UploadCloud, FileSpreadsheet, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImportPage() {
  const supabase = createClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Stats
  const [stats, setStats] = useState({ created: 0, skipped: 0, errors: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setLogs([]);
      setProgress(0);
      setStats({ created: 0, skipped: 0, errors: 0 });
    }
  };

  const addLog = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
      setLogs(prev => [`${icon} ${msg}`, ...prev]);
  };

  // Tratamento de Data
  const parseExcelDate = (excelDate: any) => {
      if (!excelDate) return null;
      if (typeof excelDate === 'number') {
          const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
          return date.toISOString().split('T')[0];
      }
      if (typeof excelDate === 'string' && excelDate.includes('/')) {
          const parts = excelDate.split('/');
          if(parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return excelDate;
  };

  // Tratamento de Moeda (Remove R$, pontos de milhar, troca vírgula por ponto)
  const parseCurrency = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
          // Remove tudo que não é número, vírgula ou ponto (mas mantém o negativo se tiver)
          // Ex: "R$ 1.500,50" -> "1500.50"
          const cleanStr = val.replace(/[R$\s.]/g, '').replace(',', '.');
          return parseFloat(cleanStr) || 0;
      }
      return 0;
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setLogs([]);
    setStats({ created: 0, skipped: 0, errors: 0 });

    addLog("Carregando dados do sistema...", "info");
    
    // Cache de IDs
    const { data: vData } = await supabase.from('vehicles').select('id, name');
    const { data: pData } = await supabase.from('projects').select('id, name');

    let localVehiclesMap: Record<string, string> = {};
    let localProjectsMap: Record<string, string> = {};

    vData?.forEach(v => { if (v.name) localVehiclesMap[v.name.toUpperCase().trim()] = v.id; });
    pData?.forEach(p => { if (p.name) localProjectsMap[p.name.toUpperCase().trim()] = p.id; });

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        
        addLog(`Lendo ${rows.length} registros...`, 'info');

        let countCreated = 0;
        let countSkipped = 0;
        let countError = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const lineNum = i + 2;

            // --- MAPEAMENTO DE COLUNAS ---
            const dataRaw = row['Data'] || row['DATA'];
            const equipName = (row['Equipamento'] || row['EQUIPAMENTO'] || row['Veiculo'])?.toString().trim();
            const obraName = (row['Obra'] || row['OBRA'] || row['Projeto'])?.toString().trim();
            const horasRaw = row['Horas'] || row['HORAS'] || 0;
            const obsRaw = row['Obs'] || row['OBS'] || '';
            
            // NOVAS COLUNAS
            const valorRaw = row['Valor'] || row['VALOR'] || row['Valor Diaria'] || row['Diaria'] || row['R$'];
            const qtdRaw = row['Pecas'] || row['PEÇAS'] || row['Qtd'] || row['Quantidade'] || row['Producao'];

            if (!equipName) continue;

            // 1. Veículo
            const equipKey = equipName.toUpperCase();
            let vehicleId = localVehiclesMap[equipKey];

            if (!vehicleId) {
                addLog(`⚙️ Criando Veículo: ${equipName}`, 'warning');
                const { data: newV } = await supabase.from('vehicles').insert({
                    name: equipName, type: 'Equipamento', status: 'active', company: 'Pré Infra',
                    plate: 'IMP-' + Math.floor(Math.random() * 100000)
                }).select('id').single();

                if (newV) {
                    vehicleId = newV.id;
                    localVehiclesMap[equipKey] = newV.id;
                } else {
                    countError++; continue;
                }
            }

            // 2. Obra
            let projectId = null;
            if (obraName) {
                const projectKey = obraName.toUpperCase();
                projectId = localProjectsMap[projectKey];
                
                if (!projectId) {
                    addLog(`🏗️ Criando Obra: ${obraName}`, 'warning');
                    const { data: newP } = await supabase.from('projects').insert({
                        name: obraName, status: 'active', distance_km: 0, default_freight: 0
                    }).select('id').single();

                    if (newP) {
                        projectId = newP.id;
                        localProjectsMap[projectKey] = newP.id;
                    }
                }
            }

            // 3. Checagem de Duplicatas (Data + Veiculo + Obra)
            const formattedDate = parseExcelDate(dataRaw);
            if (!formattedDate) {
                addLog(`Linha ${lineNum}: Data inválida`, 'error');
                countError++; continue;
            }

            // Tratamento dos Valores
            const hoursNum = parseFloat(horasRaw) || 0;
            const dailyValueNum = parseCurrency(valorRaw); // Usa a função de limpeza
            const quantityNum = parseFloat(qtdRaw) || 0;

            // Verifica duplicata simples
            let query = supabase.from('activities').select('id')
                .eq('date', formattedDate)
                .eq('vehicle_id', vehicleId);
            
            if (projectId) query = query.eq('project_id', projectId);
            else query = query.is('project_id', null);

            const { data: existing } = await query.maybeSingle();

            if (existing) {
                // SE JÁ EXISTE, IGNORA (Para não duplicar)
                // Se você quiser ATUALIZAR os valores zerados, teria que mudar a lógica aqui.
                // Mas por segurança, mantemos "pular".
                countSkipped++;
                continue; 
            }

            // 4. Inserção
            const payload = {
                date: formattedDate,
                vehicle_id: vehicleId,
                project_id: projectId,
                hours: hoursNum,
                daily_value: dailyValueNum, // <--- AQUI ENTRA O VALOR
                quantity: quantityNum,      // <--- AQUI ENTRA A QUANTIDADE
                notes: `[Importação Excel] ${obsRaw}`,
                trip_count: quantityNum > 0 ? 1 : 0, // Se tem peça, conta 1 viagem
                volume: 0, 
                freight_value: 0, // Assume que equipamento usa daily_value
                total_km: 0,
                is_mobilization: false
            };

            const { error } = await supabase.from('activities').insert(payload);

            if (error) {
                addLog(`Linha ${lineNum}: Erro Banco - ${error.message}`, 'error');
                countError++;
            } else {
                countCreated++;
            }

            if (i % 10 === 0) setProgress(Math.round(((i + 1) / rows.length) * 100));
        }

        setLoading(false);
        setProgress(100);
        setStats({ created: countCreated, skipped: countSkipped, errors: countError });
        addLog(`FIM! Criados: ${countCreated}. Ignorados: ${countSkipped}. Erros: ${countError}.`, 'success');
        
        if (countCreated > 0) alert(`Sucesso! ${countCreated} registros importados com valores.`);
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/diary" className="rounded-xl p-2 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Importação Completa</h1>
           <p className="text-sm text-gray-500">Importa Horas, Valor Diária e Quantidade de Peças.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" id="excel-upload" />
          <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-full shadow-sm text-gray-600">
               <FileSpreadsheet className="h-8 w-8" />
            </div>
            <div>
                <span className="font-bold text-gray-900 block text-lg">{file ? file.name : "Selecionar Planilha"}</span>
                <span className="text-xs text-gray-500">Colunas esperadas: Data, Equipamento, Obra, Valor, Peças</span>
            </div>
          </label>
        </div>

        {(stats.created > 0 || stats.skipped > 0 || stats.errors > 0) && (
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-xl bg-green-50 p-3 border border-green-100 text-green-700 font-bold">{stats.created} <span className="text-xs font-normal block">Criados</span></div>
                <div className="rounded-xl bg-yellow-50 p-3 border border-yellow-100 text-yellow-700 font-bold">{stats.skipped} <span className="text-xs font-normal block">Ignorados</span></div>
                <div className="rounded-xl bg-red-50 p-3 border border-red-100 text-red-700 font-bold">{stats.errors} <span className="text-xs font-normal block">Erros</span></div>
            </div>
        )}

        {file && (
          <div className="mt-6 space-y-2">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <button onClick={handleImport} disabled={loading} className="w-full rounded-xl bg-gray-900 py-4 text-white font-bold hover:bg-black transition-all disabled:opacity-70 shadow-lg">
              {loading ? `Importando... ${progress}%` : "Iniciar Importação"}
            </button>
          </div>
        )}

        <div className="mt-8 rounded-xl bg-gray-900 p-4 font-mono text-xs text-gray-300 h-64 overflow-y-auto border border-gray-800 shadow-inner">
            {logs.map((log, i) => <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0 truncate">{log}</div>)}
        </div>
      </div>
    </div>
  );
}