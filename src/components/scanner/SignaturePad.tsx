import React, { forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool } from 'lucide-react';

interface SignaturePadProps {
  onClear: () => void;
}

export const SignaturePad = forwardRef<SignatureCanvas, SignaturePadProps>(({ onClear }, ref) => {
  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden relative">
      <div className="p-3 border-b border-border flex justify-between items-center bg-surface-hover">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-muted" />
          <span className="text-xs font-bold text-muted uppercase tracking-wider">Ficha de EPI • Assinatura Legal</span>
        </div>
        <button onClick={onClear} className="text-xs text-primary hover:underline">Limpar</button>
      </div>
      
      <SignatureCanvas 
        ref={ref} 
        canvasProps={{
          className: 'w-full h-48 cursor-crosshair touch-none',
        }}
        penColor="#f4f4f5"
        backgroundColor="#121212"
      />
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <span className="text-zinc-600 font-medium text-xs select-none">Assine aqui</span>
      </div>
    </div>
  );
});
