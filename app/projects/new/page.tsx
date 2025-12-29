"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, HardHat } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const project = {
      name: formData.get("name"),
      location: formData.get("location"),
      distance_km: formData.get("distance_km") ? Number(formData.get("distance_km")) : 0,
      status: "active",
    };

    const { error } = await supabase.from("projects").insert(project);

    if (!error) {
      router.push("/projects");
      router.refresh();
    } else {
      alert("Erro: " + error.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/projects" className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Nova Obra</h1>
          <p className="text-sm text-gray-500">Cadastre um novo centro de custo.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <HardHat className="h-8 w-8" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Nome da Obra</label>
            <input name="name" required placeholder="Ex: Residencial Alphaville" className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Localização</label>
            <input name="location" placeholder="Ex: Zona Sul, SP" className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
  <div className="space-y-2">
    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Localização</label>
    <input name="location" placeholder="Ex: Zona Sul, SP" className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all" />
  </div>

  <div className="space-y-2">
    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">Distância da Base (Km)</label>
    <div className="relative">
      <input 
        name="distance_km" 
        type="number" 
        step="0.1" 
        placeholder="0.0" 
        className="w-full rounded-xl bg-gray-50 px-4 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all" 
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">km</span>
    </div>
    <p className="text-[10px] text-gray-400 ml-1">Usado para calcular fretes automaticamente.</p>
  </div>
</div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-sm font-bold text-white hover:bg-black transition-all disabled:opacity-70">
            {loading ? "Salvando..." : <><Save className="h-4 w-4" /> Criar Obra</>}
          </button>
        </form>
      </div>
    </div>
  );
}