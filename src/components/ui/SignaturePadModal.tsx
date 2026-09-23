import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { X, Camera, Check, Loader2, RefreshCw } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void | Promise<void>;
  title?: string;
  description?: React.ReactNode;
}

export function SignaturePadModal({ isOpen, onClose, onSave, title = "Foto de Evidência", description }: SignaturePadModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleCapture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedPhoto(imageSrc);
      setError('');
    }
  };

  const handleClear = () => {
    setCapturedPhoto(null);
    setError('');
  };

  const handleSave = async () => {
    if (!capturedPhoto) {
      setError('Por favor, tire a foto antes de salvar.');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      await onSave(capturedPhoto);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar foto:", err);
      setError(err.message || 'Erro ao processar foto. Tente novamente.');
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
          {description ? (
            <div className="text-sm text-muted mb-4 self-start text-left w-full">
              {description}
            </div>
          ) : (
            <p className="text-sm text-muted mb-4 self-start">
              Utilize a câmera para tirar uma foto como evidência da operação.
            </p>
          )}

          <div className="w-full border-2 border-dashed border-border rounded-lg bg-black overflow-hidden relative aspect-video flex items-center justify-center">
            {isSaving && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            
            {!capturedPhoto ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  onUserMediaError={(err) => setError("Erro ao acessar câmera: " + (typeof err === 'string' ? err : err.message || 'Permissão negada ou dispositivo indisponível.'))}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                  <button 
                    onClick={handleCapture}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-lg border-4 border-background transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                </div>
              </>
            ) : (
              <img src={capturedPhoto} alt="Evidência Capturada" className="w-full h-full object-cover" />
            )}
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
            disabled={isSaving || !capturedPhoto}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-surface border border-border hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Tirar Novamente
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
              disabled={isSaving || !capturedPhoto}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-background bg-primary hover:bg-primary-dark rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? 'Salvando...' : 'Confirmar Foto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}