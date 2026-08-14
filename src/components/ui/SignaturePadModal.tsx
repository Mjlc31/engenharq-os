import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Eraser, Check } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
}

export function SignaturePadModal({ isOpen, onClose, onSave, title = "Assinatura Digital" }: SignaturePadModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClear = () => {
    sigCanvas.current?.clear();
    setError('');
  };

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) {
      setError('Por favor, desenhe sua assinatura antes de salvar.');
      return;
    }
    
    // Get the base64 string
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-hover/30">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col items-center">
          <p className="text-sm text-muted mb-4 self-start">
            Utilize o mouse ou o dedo (em telas sensíveis a toque) para assinar abaixo.
          </p>

          <div className="w-full border-2 border-dashed border-border rounded-lg bg-background overflow-hidden">
            <SignatureCanvas 
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                className: "w-full h-48 sm:h-64 cursor-crosshair bg-white"
              }}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium mt-2 self-start">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between gap-3 bg-surface-hover/10">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-surface border border-border hover:bg-surface-hover rounded-md transition-colors"
          >
            <Eraser className="w-4 h-4" />
            Limpar
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-background bg-primary hover:bg-primary-dark rounded-md transition-colors shadow-sm"
            >
              <Check className="w-4 h-4" />
              Salvar Assinatura
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
