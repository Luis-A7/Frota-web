"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { MoreHorizontal, Trash2, CheckCircle, Archive, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProjectActionsProps {
  id: string;
  currentStatus: string;
  name: string;
}

export function ProjectActions({ id, currentStatus, name }: ProjectActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleStatusChange(newStatus: string) {
    await supabase.from("projects").update({ status: newStatus }).eq("id", id);
    router.refresh();
    setIsOpen(false);
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja apagar a obra "${name}"?`)) return;
    
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      alert("Não é possível apagar obras que já têm atividades lançadas. Marque como 'Concluída'.");
    } else {
      router.refresh();
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 top-full z-[100] mt-1 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            
            {/* --- ESTE É O BOTÃO QUE ESTAVA FALTANDO --- */}
            <Link
              href={`/projects/edit/${id}`}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" /> Editar Dados
            </Link>

            <div className="my-1 h-px bg-gray-100" />

            <button
              onClick={() => handleStatusChange("active")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${currentStatus === 'active' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'}`}
            >
              <CheckCircle className="h-4 w-4" /> Em Andamento
            </button>

            <button
              onClick={() => handleStatusChange("inactive")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${currentStatus === 'inactive' ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-50'}`}
            >
              <Archive className="h-4 w-4" /> Obra Concluída
            </button>

            <div className="my-1 h-px bg-gray-100" />
            
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}