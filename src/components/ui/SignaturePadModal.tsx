import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import SignatureCanvas from 'react-signature-canvas';
import { X, Camera, Check, Loader2, RefreshCw, PenTool, Image as ImageIcon } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void | Promise<void>;
  title?: string;
  description?: React.ReactNode;
}

export function SignaturePadModal({ isOpen, onClose, onSave, title = "Validação da Operação", description }: SignaturePadModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeMode, setActiveMode] = useState<'photo' | 'draw'>('photo');

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
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setError('');
  };

  const handleSave = async () => {
    let finalData = capturedPhoto;
    
    if (activeMode === 'draw') {
      if (sigCanvasRef.current?.isEmpty()) {
        setError('Por favor, faça a assinatura antes de salvar.');
        return;
      }
      try {
        finalData = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png') || null;
      } catch (e) {
        finalData = sigCanvasRef.current?.getCanvas().toDataURL('image/png') || null;
      }
    } else {
      if (!capturedPhoto) {
        setError('Por favor, tire a foto antes de salvar.');
        return;
      }
    }
    
    if (!finalData) return;
    
    setIsSaving(true);
    setError('');
    
    try {
      await onSave(finalData);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError(err.message || 'Erro ao processar validação. Tente novamente.');
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

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { setActiveMode('photo'); handleClear(); }}
            className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-medium transition-colors ${activeMode === 'photo' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}
          >
            <ImageIcon className="w-4 h-4" />
            Foto (Webcam)
          </button>
          <button
            onClick={() => { setActiveMode('draw'); handleClear(); }}
            className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-medium transition-colors ${activeMode === 'draw' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}
          >
            <PenTool className="w-4 h-4" />
            Assinar na Tela
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col items-center">
          {description && (
            <div className="text-sm text-muted mb-4 self-start text-left w-full">
              {description}
            </div>
          )}

          <div className="w-full border-2 border-dashed border-border rounded-lg bg-black overflow-hidden relative aspect-video flex items-center justify-center">
            {isSaving && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            
            {activeMode === 'photo' ? (
              <>
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
              </>
            ) : (
              <div className="absolute inset-0 bg-white">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{
                    className: 'w-full h-full cursor-crosshair'
                  }}
                  backgroundColor="white"
                  penColor="black"
                />
              </div>
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
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-surface border border-border hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Limpar / Refazer
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
              {isSaving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
