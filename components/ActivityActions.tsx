"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActivityActionsProps {
  id: string;
}

export function ActivityActions({ id }: ActivityActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
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
          <div className="absolute right-0 top-full z-[100] mt-1 w-40 rounded-xl border border-gray-100 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            
            <Link
              href={`/activities/edit/${id}`}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Link>

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