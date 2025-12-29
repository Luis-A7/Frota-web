"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Truck, 
  HardHat, 
  ClipboardList, 
  LogOut,
  Box,
  Calendar,
  Book,
  Ship,
  ClipboardCheck // <--- 1. Importei o ícone novo aqui
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Calendar, label: "Agenda", href: "/calendar" },
  { icon: ClipboardList, label: "Atividades", href: "/activities" },
  { icon: Book, label: "Diário de Bordo", href: "/diary" },
  { icon: Truck, label: "Frota", href: "/fleet" },
  { icon: ClipboardCheck, label: "Vistorias", href: "/vistorias" }, // <--- 2. Item novo adicionado aqui
  { icon: HardHat, label: "Obras", href: "/projects" },
  { icon: Ship, label: "Expedição", href: "/shipping" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-100 bg-white/80 backdrop-blur-md hidden md:flex flex-col z-50">
      
      <div className="flex h-20 items-center px-8 border-b border-gray-50">
        <div className="flex items-center gap-3 text-gray-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shadow-lg shadow-gray-900/20">
            <Box className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Logi 360</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-gray-900 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-50">
        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}