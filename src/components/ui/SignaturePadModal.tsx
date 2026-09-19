import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Eraser, Check, Loader2 } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void | Promise<void>;
  title?: string;
  description?: React.ReactNode;
}

export function SignaturePadModal({ isOpen, onClose, onSave, title = "Assinatura Digital" }: SignaturePadModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    sigCanvas.current?.clear();
    setError('');
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setError('Por favor, desenhe sua assinatura antes de salvar.');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      // Get the base64 string
      const dataUrl = sigCanvas.current?.getCanvas().toDataURL('image/png');
      if (dataUrl) {
        await onSave(dataUrl);
        onClose();
      }
    } catch (err: any) {
      console.error("Erro ao salvar assinatura:", err);
      setError(err.message || 'Erro ao processar assinatura. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-hover/30">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col items-center">
          <p className="text-sm text-muted mb-4 self-start">
            Utilize o mouse ou o dedo (em telas sensíveis a toque) para assinar abaixo.
          </p>

          <div className="w-full border-2 border-dashed border-border rounded-lg bg-background overflow-hidden relative">
            {isSaving && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
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
            type="button"
            onClick={handleClear}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-surface border border-border hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
          >
            <Eraser className="w-4 h-4" />
            Limpar
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-background bg-primary hover:bg-primary-dark rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? 'Salvando...' : 'Salvar Assinatura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}