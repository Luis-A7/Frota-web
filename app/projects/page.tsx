import { createClient } from "@/lib/supabase-server";
import { Plus, HardHat, MapPin } from "lucide-react";
import Link from "next/link";
import { ProjectActions } from "@/components/ProjectActions";

export default async function ProjectsPage() {
  const supabase = await createClient();
  
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Obras e Centros de Custo</h1>
          <p className="text-sm text-gray-500">Gerencie seus locais de operação.</p>
        </div>
        <Link href="/projects/new" className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black transition-all hover:scale-[1.02]">
            <Plus className="h-4 w-4" />
            Nova Obra
        </Link>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
         <div 
            key={project.id} 
            // CORREÇÃO APLICADA AQUI: z-0 base, hover:z-50 para elevar, sem transition-all
            className="group relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 z-0 hover:shadow-md hover:z-50" 
         >
            
            <div className="mb-4 flex items-center justify-between">
              
              {/* Grupo Esquerdo */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                  <HardHat className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  project.status === 'active' 
                    ? 'bg-green-50 text-green-700 border-green-100' 
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {project.status === 'active' ? 'Em Andamento' : 'Concluída'}
                </span>
              </div>

              {/* Menu de Ações */}
              <ProjectActions 
                id={project.id} 
                currentStatus={project.status} 
                name={project.name} 
              />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
            
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 text-gray-400" />
              {project.location || "Localização não definida"}
            </div>
            
            {project.distance_km > 0 && (
               <div className="mt-2 text-xs text-gray-400">
                 Distância base: {project.distance_km} km
               </div>
            )}
          </div>
        ))}

        {(!projects || projects.length === 0) && (
          <div className="col-span-full py-12 text-center text-gray-500">
            Nenhuma obra cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}