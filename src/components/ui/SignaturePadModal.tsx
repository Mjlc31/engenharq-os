import React, { useRef, useState, useCallback, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Eraser, Check, Loader2, Camera, Video, RefreshCw, Upload } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string, photoFile?: File) => void | Promise<void>;
  title?: string;
  description?: React.ReactNode;
}

export function SignaturePadModal({ isOpen, onClose, onSave, title = "Assinatura Digital", description }: SignaturePadModalProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const stopCamera = useCallback(() => {
    if (pendingStreamRef.current) {
      pendingStreamRef.current.getTracks().forEach(track => track.stop());
      pendingStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // When the video element mounts (isCameraActive becomes true), attach the stream
  useEffect(() => {
    if (isCameraActive && videoRef.current && pendingStreamRef.current) {
      videoRef.current.srcObject = pendingStreamRef.current;
      videoRef.current.play().catch(err => {
        console.error('Video play failed:', err);
      });
    }
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      if (pendingStreamRef.current) {
        pendingStreamRef.current.getTracks().forEach(track => track.stop());
        pendingStreamRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      // Store the stream, then trigger re-render to mount the <video> element
      pendingStreamRef.current = stream;
      setIsCameraActive(true);
      // The useEffect above will attach stream to video element after render
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoFile(file);
        setPhotoPreview(dataUrl);
        stopCamera();
      }
    }, 'image/jpeg', 0.85);
  };

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleClear = () => {
    sigCanvas.current?.clear();
    setError('');
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty() && !photoFile) {
      setError('Por favor, assine ou tire uma foto para confirmar.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const dataUrl = sigCanvas.current?.isEmpty() ? '' : sigCanvas.current?.getCanvas().toDataURL('image/png');
      await onSave(dataUrl || '', photoFile || undefined);
      stopCamera();
      resetPhoto();
      sigCanvas.current?.clear();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    resetPhoto();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-hover/30">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={handleClose} disabled={isSaving}
            className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col items-center overflow-y-auto">
          {description && (
            <div className="w-full mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-foreground leading-relaxed">{description}</p>
            </div>
          )}

          <p className="text-sm text-muted mb-4 self-start">
            Tire uma foto do funcionário e/ou assine abaixo. Pelo menos um dos dois é obrigatório.
          </p>

          {/* Camera Section */}
          <div className="w-full mb-4">
            {!photoPreview && !isCameraActive && (
              <div className="flex gap-2">
                <button type="button" onClick={startCamera}
                  className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-primary/40 rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                  <Video className="w-8 h-8 text-primary mb-2" />
                  <span className="text-sm font-medium text-foreground">Tirar Foto em Tempo Real</span>
                  <span className="text-xs text-muted mt-1">Abre a câmera do dispositivo</span>
                </button>
                <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer bg-surface hover:bg-surface-hover transition-colors">
                  <Upload className="w-8 h-8 text-muted mb-2" />
                  <span className="text-sm font-medium text-foreground">Selecionar Arquivo</span>
                  <span className="text-xs text-muted mt-1">Do dispositivo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileCapture} />
                </label>
              </div>
            )}

            {isCameraActive && (
              <div className="relative rounded-lg overflow-hidden border-2 border-primary">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-48 object-cover bg-black"
                />
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                  <button type="button" onClick={capturePhoto}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg">
                    <Camera className="w-4 h-4" /> Capturar
                  </button>
                  <button type="button" onClick={stopCamera}
                    className="px-4 py-2 bg-surface text-foreground rounded-lg font-bold text-sm border border-border">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {photoPreview && (
              <div className="relative rounded-lg overflow-hidden border-2 border-emerald-500">
                <img src={photoPreview} alt="Foto capturada" className="w-full h-48 object-cover" />
                <div className="absolute top-2 right-2">
                  <button type="button" onClick={resetPhoto}
                    className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded">
                  ✓ Foto Capturada
                </div>
              </div>
            )}
          </div>

          {/* Signature Section */}
          <p className="text-xs text-muted self-start mb-2 font-medium uppercase tracking-wider">Assinatura (opcional se já tirou foto)</p>
          <div className="w-full border-2 border-dashed border-border rounded-lg bg-background overflow-hidden relative">
            {isSaving && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{ className: "w-full h-36 sm:h-48 cursor-crosshair bg-white" }}
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium mt-2 self-start">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between gap-3 bg-surface-hover/10">
          <button type="button" onClick={handleClear} disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-surface border border-border hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50">
            <Eraser className="w-4 h-4" /> Limpar
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={handleClose} disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-background bg-primary hover:bg-primary-dark rounded-md transition-colors shadow-sm disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}