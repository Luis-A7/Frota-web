"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, Truck, Tractor, Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewVehiclePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("equipment"); 

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const vehicle = {
      name: formData.get("name"),
      plate: formData.get("plate"),
      type: category === 'equipment' ? 'Equipamento' : 'Veículo',
      status: "active",
      measurement_unit: category === 'equipment' ? 'hours' : 'km',
      budgeted_quantity: formData.get("budgeted_quantity") ? Number(formData.get("budgeted_quantity")) : 0,
      // Novo campo Empresa
      company: formData.get("company"),
    };

    const { error } = await supabase.from("vehicles").insert(vehicle);
    if (!error) {
      router.push("/fleet");
      router.refresh();
    } else {
      alert("Erro: " + error.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/fleet" className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Novo Ativo</h1>
          <p className="text-sm text-gray-500">Cadastre um novo veículo ou equipamento.</p>
        </div>
      </div>
      
      {/* Seletor de Categoria */}
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setCategory("equipment")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            category === "equipment" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Tractor className="h-4 w-4" />
          Máquinas / Equipamentos
        </button>
        <button
          type="button"
          onClick={() => setCategory("vehicle")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            category === "vehicle" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Truck className="h-4 w-4" />
          Veículos / Caminhões
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Novo Campo: Empresa */}
          <div className="space-y-2">
             <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">
                Empresa / Proprietário
             </label>
             <div className="relative">
               <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
               <input 
                 name="company" 
                 placeholder="Ex: Locadora Silva ou Próprio" 
                 className="w-full rounded-xl bg-gray-50 pl-11 pr-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" 
               />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">
                {category === 'equipment' ? 'Nome do Equipamento' : 'Modelo do Veículo'}
             </label>
             <input name="name" required placeholder={category === 'equipment' ? "Ex: Escavadeira CAT 320" : "Ex: Mercedes Accelo 1016"} className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">
                 {category === 'equipment' ? 'Nº de Série / ID' : 'Placa'}
              </label>
              <input name="plate" className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            
            <div className="space-y-2">
               <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">
                  Orçamento ({category === 'equipment' ? 'Horas' : 'Viagens/Km'})
               </label>
               <input 
                 name="budgeted_quantity" 
                 type="number" 
                 placeholder="0"
                 className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" 
               />
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-black">
              {loading ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Cadastro</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}