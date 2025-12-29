// app/checklist/novo/page.tsx
import ChecklistForm from '@/components/checklist/ChecklistForm'; // Ajuste o caminho se necessário

export default function NovaVistoriaPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Controle de Frota</h1>
        {/* Aqui renderizamos o componente que você criou */}
        <ChecklistForm />
      </div>
    </div>
  );
}