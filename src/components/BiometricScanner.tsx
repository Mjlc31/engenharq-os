import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, ScanFace, CheckCircle2, AlertTriangle, Fingerprint, Lock, Key } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface BiometricScannerProps {
  workerName: string;
  referencePhotoUrl?: string;
  onMatchSuccess: (selfieUrl: string, score: number, liveness: boolean) => void;
  onMatchFailed: () => void;
}

type ScanStatus = 'IDLE' | 'SCANNING' | 'ANALYZING' | 'SUCCESS' | 'FAILED' | 'PASSWORD_BYPASS';

export function BiometricScanner({ workerName, referencePhotoUrl, onMatchSuccess, onMatchFailed }: BiometricScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [status, setStatus] = useState<ScanStatus>('IDLE');
  const [failCount, setFailCount] = useState(0);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Auto-start scanning when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('SCANNING');
    }, 1500); // Give the camera time to initialize
    return () => clearTimeout(timer);
  }, []);

  // Simulate auto-capture when a face is "detected" in the guide
  useEffect(() => {
    let captureTimer: NodeJS.Timeout;
    
    if (status === 'SCANNING') {
      captureTimer = setTimeout(() => {
        captureAndAnalyze();
      }, 3000); // Simulate detecting face after 3 seconds of holding still
    }
    
    return () => clearTimeout(captureTimer);
  }, [status]);

  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setStatus('ANALYZING');
    
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (!imageSrc) {
      if (isMounted.current) {
        setStatus('FAILED');
        setFailCount(prev => prev + 1);
      }
      return;
    }
    setCapturedImage(imageSrc);

    // API Call to Supabase Edge Function
    try {
      const { data: result, error } = await supabase.functions.invoke('biometrics-match', {
        body: {
          audit_selfie: imageSrc,
          reference_photo_url: referencePhotoUrl || 'unregistered'
        }
      });

      if (error) throw error;
      
      if (result && result.match) {
        if (isMounted.current) setStatus('SUCCESS');
        setTimeout(() => {
          if (isMounted.current) onMatchSuccess(imageSrc, result.score, result.liveness);
        }, 1500);
      } else {
        handleFail();
      }
    } catch (err) {
      console.error("Biometric validation error:", err);
      handleFail();
    }
  }, [failCount, referencePhotoUrl, onMatchSuccess]);

  const handleFail = () => {
    if (isMounted.current) {
      setStatus('FAILED');
      setFailCount(prev => prev + 1);
    }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    setTimeout(() => {
      if (!isMounted.current) return;
      if (failCount < 2) {
        setStatus('SCANNING'); // Retry automatically
      } else {
        setStatus('PASSWORD_BYPASS'); // Hand over to manual fallback
      }
    }, 2500);
  };

  const handlePasswordSubmit = () => {
    if (password === 'ADMIN123') {
      setStatus('SUCCESS');
      setTimeout(() => {
        if (isMounted.current) onMatchSuccess(capturedImage || 'bypass', 100, true);
      }, 1000);
    } else {
      setPasswordError('Senha incorreta.');
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'SCANNING': return 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
      case 'ANALYZING': return 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]';
      case 'SUCCESS': return 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
      case 'FAILED': return 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
      default: return 'border-border';
    }
  };

  if (status === 'PASSWORD_BYPASS') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <div className="w-[95%] sm:w-full sm:max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Biometria Falhou</h3>
              <p className="text-sm text-muted mt-2">
                O reconhecimento facial não pôde validar a identidade de <strong>{workerName}</strong>. 
                Para continuar, um gestor deve aprovar a liberação.
              </p>
            </div>
            
            <div className="w-full mt-4 space-y-3">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePasswordSubmit();
                  }}
                  placeholder="Senha do Gestor..."
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              {passwordError && (
                <p className="text-red-500 text-xs font-bold text-left">{passwordError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={onMatchFailed}
                  className="flex-1 bg-surface-hover hover:bg-border text-muted hover:text-foreground py-3 rounded-lg text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handlePasswordSubmit}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                  Autorizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-[95%] sm:w-full sm:max-w-lg bg-surface border border-border rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Biometria Facial</h3>
          </div>
          <button onClick={onMatchFailed} className="text-xs text-muted hover:text-foreground">
            Cancelar
          </button>
        </div>

        {/* Camera Feed */}
        <div className="relative aspect-[3/4] w-full bg-black flex items-center justify-center overflow-hidden">
          {status === 'IDLE' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-muted">
              <Camera className="w-8 h-8 mb-2 animate-pulse" />
              <p className="text-xs uppercase tracking-widest">Iniciando Câmera...</p>
            </div>
          )}

          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            onUserMediaError={(err) => setPasswordError("Erro ao acessar câmera: verifique permissões ou dispositivo.")}
            className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-500", status === 'IDLE' ? 'opacity-0' : 'opacity-100')}
          />
          
          {/* Dark Overlay with cutout for face guide */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
             <div className="w-full h-full border-[60px] border-black/60"></div>
          </div>

          {/* HUD Overlay */}
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center p-8">
            
            {/* Face Oval Guide */}
            <div className={cn(
              "w-full max-w-[240px] aspect-[3/4] rounded-[100px] border-[3px] border-dashed transition-all duration-300 relative",
              getBorderColor()
            )}>
               {/* Scanning Line Animation */}
               {(status === 'SCANNING' || status === 'ANALYZING') && (
                 <div className="absolute left-0 right-0 h-1 bg-primary/50 blur-[2px] animate-[scan_2s_ease-in-out_infinite]" />
               )}
            </div>
            
          </div>
          
          {/* Status Overlay */}
          <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-6">
             {status === 'SCANNING' && (
               <div className="bg-blue-950/80 border border-blue-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                 <ScanFace className="w-4 h-4 text-blue-400" />
                 <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Enquadre o Rosto</span>
               </div>
             )}
             
             {status === 'ANALYZING' && (
               <div className="bg-amber-950/80 border border-amber-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                 <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Analisando Biometria...</span>
               </div>
             )}

             {status === 'SUCCESS' && (
               <div className="bg-emerald-950/80 border border-emerald-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                 <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Identidade Confirmada</span>
               </div>
             )}

             {status === 'FAILED' && (
               <div className="bg-red-950/80 border border-red-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-red-400" />
                 <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Rosto não reconhecido</span>
               </div>
             )}
          </div>
        </div>
        
        {/* Footer Instructions */}
        <div className="p-4 bg-background border-t border-border flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center shrink-0">
                <span className="text-xs font-bold font-mono text-muted">{failCount}/3</span>
             </div>
             <div>
               <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Auditoria de Segurança</p>
               <p className="text-xs text-foreground mt-0.5">Autorizando: <span className="font-bold">{workerName}</span></p>
             </div>
           </div>
           
           <button 
             onClick={() => setStatus('PASSWORD_BYPASS')}
             className="text-xs font-bold bg-surface-hover hover:bg-border text-foreground px-3 py-2 rounded-md transition-colors"
           >
             Usar Senha
           </button>
        </div>

      </div>
    </div>
  );
}

