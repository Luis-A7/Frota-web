'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Car, Truck, Fuel, Camera, Save, PenTool, Eraser } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas'; // Import da lib de assinatura

// --- CONFIGURAÇÃO DOS DADOS ---
const CHECKLIST_DATA = {
  common: [
    { id: 'docs', label: 'Documentos' },
    { id: 'keys', label: 'Chave do veículo' },
    { id: 'extinguisher', label: 'Extintor' },
    { id: 'jack', label: 'Macaco' },
    { id: 'triangle', label: 'Triângulo' },
    { id: 'wheel_wrench', label: 'Chave de Roda' },
    { id: 'spare_tire', label: 'Estepe' },
    { id: 'general_electric', label: 'Elétrica Geral (Pisca, Farol, Limpador)' },
    { id: 'iron_wheels', label: 'Rodas de Ferro / Pneus' },
    { id: 'interior', label: 'Interior (Limpeza e Conservação)' },
  ],
  automobile: [
    { id: 'mats', label: 'Tapetes' },
    { id: 'oil_water', label: 'Nível de Óleo e Água' },
  ],
  equipment: [
    { id: 'tacograph', label: 'Tacógrafo' },
    { id: 'coolant', label: 'Nível Líquido de Arrefecimento' },
    { id: 'engine_oil', label: 'Nível do Óleo do Motor' },
    { id: 'engine_leaks', label: 'Vazamentos no Motor' },
    { id: 'lubrication', label: 'Lubrificação (Giro, Lança, Patolas)' },
    { id: 'anemometer', label: 'Anemômetro' },
    { id: 'steel_cable', label: 'Condições do Cabo de Aço' },
    { id: 'cable_winding', label: 'Enrolamento dos Cabos no Tambor' },
    { id: 'hook_cracks', label: 'Trincas no Gancho' },
    { id: 'hook_lock', label: 'Trava do Gancho' },
    { id: 'boom_pulleys', label: 'Roldanas da Ponta de Lança' },
    { id: 'tower_struct', label: 'Estrutura da Torre de Içamento' },
    { id: 'brakes', label: 'Freios de Roda e Estacionamento' },
    { id: 'capacity_id', label: 'Identificação de Capacidade' },
    { id: 'general_damage', label: 'Danos Gerais na Estrutura' },
    { id: 'horn_reverse', label: 'Buzina e Avisos Sonoros (Ré)' },
  ]
};

const PHOTO_LABELS = [
  "Frente", "Lateral Diant. Dir.", "Lateral Tras. Dir.", "Traseira",
  "Lateral Tras. Esq.", "Lateral Diant. Esq.", "Documentos", "Painel (Meia Chave)"
];

export default function ChecklistForm() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Referências para os pads de assinatura
  const driverSigRef = useRef<any>(null);
  const inspectorSigRef = useRef<any>(null);

  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]); // Lista da frota
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  // Estado derivado (calculado quando seleciona o veiculo)
  const [vehicleType, setVehicleType] = useState<'auto' | 'equipment'>('auto'); 
  
  const [fuelLevel, setFuelLevel] = useState('1/4');
  const [formData, setFormData] = useState({
    odometer: '',
    hourMeter: '',
    belongings: '',
    observations: '',
    checkedItems: {} as Record<string, boolean>,
  });

  // --- EFEITOS ---
  // 1. Carregar Veículos ao abrir a página
  useEffect(() => {
    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate, model, type') // Certifique-se que sua tabela vehicles tem essas colunas
        .order('plate');
      
      if (data) setVehicles(data);
      if (error) console.error('Erro ao buscar veículos:', error);
    };
    fetchVehicles();
  }, []);

  // 2. Quando seleciona um veículo, define o tipo automaticamente
  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value;
    setSelectedVehicleId(vId);

    const vehicle = vehicles.find(v => v.id === vId);
    if (vehicle) {
      // Se no banco estiver 'equipment' ou 'caminhao', ajusta a lógica aqui
      // Assumindo que no banco type é 'auto' ou 'equipment'
      setVehicleType(vehicle.type === 'equipment' ? 'equipment' : 'auto');
    }
  };

  // --- LÓGICA ---
  const toggleItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checkedItems: {
        ...prev.checkedItems,
        [id]: !prev.checkedItems[id]
      }
    }));
  };

  const clearSignature = (ref: any) => {
    ref.current?.clear();
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!selectedVehicleId) {
        alert('Selecione um veículo da frota.');
        setLoading(false);
        return;
      }
      if (!formData.odometer) {
        alert('Informe o odômetro.');
        setLoading(false);
        return;
      }
      if (driverSigRef.current?.isEmpty() || inspectorSigRef.current?.isEmpty()) {
        alert('As assinaturas são obrigatórias.');
        setLoading(false);
        return;
      }

      // Payload para envio
      const payload = {
        vehicle_id: selectedVehicleId, // Link com a tabela vehicles
        vehicle_type: vehicleType,     // Redundante mas útil para histórico rápido
        odometer: parseFloat(formData.odometer),
        hour_meter: vehicleType === 'equipment' && formData.hourMeter ? parseFloat(formData.hourMeter) : null,
        fuel_level: fuelLevel,
        belongings: formData.belongings,
        observations: formData.observations,
        checklist_data: formData.checkedItems,
        // Salvando assinaturas como Base64 (string longa)
        driver_signature: driverSigRef.current.getTrimmedCanvas().toDataURL('image/png'),
        inspector_signature: inspectorSigRef.current.getTrimmedCanvas().toDataURL('image/png'),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('inspections').insert([payload]);

      if (error) throw error;

      alert('Vistoria salva com sucesso!');
      router.push('/vistorias');

    } catch (error: any) {
      console.error('Erro:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const activeItems = [
    ...CHECKLIST_DATA.common,
    ...(vehicleType === 'auto' ? CHECKLIST_DATA.automobile : CHECKLIST_DATA.equipment)
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden mb-20">
      
      {/* Cabeçalho */}
      <div className="bg-gray-50 p-6 border-b">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Nova Vistoria</h2>
        
        {/* SELEÇÃO DE VEÍCULO */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Selecione o Veículo</label>
          <select 
            className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            value={selectedVehicleId}
            onChange={handleVehicleChange}
          >
            <option value="">-- Escolha a placa --</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.plate} - {v.model}
              </option>
            ))}
          </select>
        </div>

        {/* Indicador visual do Tipo (Automático) */}
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-200 p-2 rounded w-fit">
          {vehicleType === 'auto' ? <Car className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
          <span>Tipo definido: {vehicleType === 'auto' ? 'Automóvel' : 'Equipamento'}</span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Km e Horas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Odômetro (Km) *</label>
            <input 
              type="number" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: 87728"
              value={formData.odometer}
              onChange={e => setFormData({...formData, odometer: e.target.value})}
            />
          </div>

          {vehicleType === 'equipment' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Horímetro (Horas)</label>
              <input 
                type="number" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: 149720"
                value={formData.hourMeter}
                onChange={e => setFormData({...formData, hourMeter: e.target.value})}
              />
            </div>
          )}
        </div>

        {/* Combustível */}
        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <Fuel className="w-4 h-4 mr-2" /> Nível de Combustível
          </label>
          <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2">
            {['Reserva', '1/4', '1/2', '3/4', '1/1'].map((level) => (
              <label key={level} className="flex flex-col items-center cursor-pointer min-w-[50px]">
                <input 
                  type="radio" 
                  name="fuel" 
                  value={level}
                  checked={fuelLevel === level}
                  onChange={() => setFuelLevel(level)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs mt-1 text-gray-600 whitespace-nowrap">{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Checklist Itens */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Itens de Verificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeItems.map((item) => (
              <label key={item.id} className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox"
                  checked={!!formData.checkedItems[item.id]}
                  onChange={() => toggleItem(item.id)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0" 
                />
                <span className="ml-3 text-sm text-gray-700 leading-tight">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Campos de Texto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pertences Retirados</label>
            <textarea 
              className="w-full p-3 border rounded-lg h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Liste os itens..."
              value={formData.belongings}
              onChange={e => setFormData({...formData, belongings: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Observações / Avarias</label>
            <textarea 
              className="w-full p-3 border rounded-lg h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Descreva avarias..."
              value={formData.observations}
              onChange={e => setFormData({...formData, observations: e.target.value})}
            />
          </div>
        </div>

        {/* Fotos (Placeholder) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Camera className="w-5 h-5 mr-2" /> Registro Fotográfico
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PHOTO_LABELS.map((label, index) => (
              <div key={index} className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-gray-50">
                <Camera className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-[10px] sm:text-xs text-center font-medium text-gray-600 px-1 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- ASSINATURAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
          
          {/* Assinatura Motorista */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <PenTool className="w-4 h-4 mr-2" /> Assinatura Motorista
              </label>
              <button 
                onClick={() => clearSignature(driverSigRef)}
                className="text-xs text-red-500 flex items-center hover:text-red-700"
              >
                <Eraser className="w-3 h-3 mr-1" /> Limpar
              </button>
            </div>
            <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden touch-none">
              <SignatureCanvas 
                ref={driverSigRef}
                canvasProps={{
                  className: 'w-full h-40 bg-gray-50'
                }}
              />
            </div>
          </div>

          {/* Assinatura Vistoriador */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <PenTool className="w-4 h-4 mr-2" /> Assinatura Vistoriador
              </label>
              <button 
                onClick={() => clearSignature(inspectorSigRef)}
                className="text-xs text-red-500 flex items-center hover:text-red-700"
              >
                <Eraser className="w-3 h-3 mr-1" /> Limpar
              </button>
            </div>
            <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden touch-none">
              <SignatureCanvas 
                ref={inspectorSigRef}
                canvasProps={{
                  className: 'w-full h-40 bg-gray-50'
                }}
              />
            </div>
          </div>

        </div>

        {/* Botão Salvar */}
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 flex items-center justify-center transition-transform active:scale-[0.99] disabled:opacity-50 mt-6"
        >
          {loading ? 'Enviando...' : (
            <>
              <Save className="w-5 h-5 mr-2" /> Finalizar Vistoria
            </>
          )}
        </button>
      </div>
    </div>
  );
}