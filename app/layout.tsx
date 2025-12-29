import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/ui/sidebar";

const inter = Inter({ subsets: ["latin"] });

// --- ALTERE AQUI ---
export const metadata: Metadata = {
  title: "Logi 360 | Gestão Inteligente",
  description: "Plataforma completa de gestão de ativos e obras.",
};
// -------------------

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#F5F5F7] text-gray-900`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-64 transition-all duration-300">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}