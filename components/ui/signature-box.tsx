'use client';

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface SignatureBoxProps {
  label: string;
  onSave: (base64Image: string | null) => void;
}

export function SignatureBox({ label, onSave }: SignatureBoxProps) {
  const sigCanvas = useRef<any>({});

  const clear = () => {
    sigCanvas.current.clear();
    onSave(null);
  };

  const handleEnd = () => {
    // Salva a assinatura como imagem Base64 string ao levantar o dedo
    const image = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    onSave(image);
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
      <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clear}
          className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Eraser className="w-3 h-3 mr-1" /> Limpar
        </Button>
      </div>
      <SignatureCanvas 
        ref={sigCanvas}
        penColor="black"
        canvasProps={{
          className: 'signature-canvas w-full h-40 bg-white cursor-crosshair'
        }}
        onEnd={handleEnd}
      />
      <div className="bg-slate-50 p-1 text-[10px] text-center text-slate-400 border-t">
        Assine dentro do quadro branco
      </div>
    </div>
  );
}