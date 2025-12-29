"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase"; // Use o client do navegador
import { MoreHorizontal, Trash2, PenTool, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface FleetActionsProps {
  id: string;
  currentStatus: string;
  name: string;
}

export function FleetActions({ id, currentStatus, name }: FleetActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    const { error } = await supabase
      .from("vehicles")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      router.refresh();
      setIsOpen(false);
    } else {
      alert("Erro ao atualizar status");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir ${name}? Essa ação não pode ser desfeita.`)) return;
    
    setLoading(true);
    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      // O Supabase vai bloquear se tiver atividades vinculadas (FK constraint)
      alert("Não é possível excluir este veículo pois ele possui atividades registradas. Tente marcá-lo como 'Inativo'.");
    } else {
      router.refresh();
      setIsOpen(false);
    }
    setLoading(false);
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay invisível para fechar ao clicar fora */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Mudar Status
            </div>
            
            <button
              onClick={() => handleStatusChange("active")}
              disabled={loading}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${currentStatus === 'active' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <CheckCircle className="h-4 w-4" /> Ativo / Operacional
            </button>
            
            <button
              onClick={() => handleStatusChange("maintenance")}
              disabled={loading}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${currentStatus === 'maintenance' ? 'bg-amber-50 text-amber-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <PenTool className="h-4 w-4" /> Em Manutenção
            </button>

            <button
              onClick={() => handleStatusChange("inactive")}
              disabled={loading}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${currentStatus === 'inactive' ? 'bg-gray-100 text-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <XCircle className="h-4 w-4" /> Inativo / Vendido
            </button>

            <div className="my-1 h-px bg-gray-100" />
            
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Excluir Registro
            </button>
          </div>
        </>
      )}
    </div>
  );
}