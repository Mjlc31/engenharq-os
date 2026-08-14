import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, ScanFace, CheckCircle2, AlertTriangle, Fingerprint } from 'lucide-react';
import { cn } from '../lib/utils';

interface BiometricScannerProps {
  workerName: string;
  referencePhotoUrl?: string;
  onMatchSuccess: (selfieUrl: string, score: number, liveness: boolean) => void;
  onMatchFailed: () => void;
}

type ScanStatus = 'IDLE' | 'SCANNING' | 'ANALYZING' | 'SUCCESS' | 'FAILED';

export function BiometricScanner({ workerName, referencePhotoUrl, onMatchSuccess, onMatchFailed }: BiometricScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [status, setStatus] = useState<ScanStatus>('IDLE');
  const [failCount, setFailCount] = useState(0);

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

  const captureAndAnalyze = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setStatus('ANALYZING');
    
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (!imageSrc) {
      setStatus('FAILED');
      setFailCount(prev => prev + 1);
      return;
    }

    // API Call to /api/biometrics/match
    try {
      const response = await fetch('/api/biometrics/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audit_selfie: imageSrc,
          reference_photo_url: referencePhotoUrl || 'unregistered'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.match) {
        setStatus('SUCCESS');
        setTimeout(() => {
          onMatchSuccess(imageSrc, result.score, result.liveness);
        }, 1500);
      } else {
        setStatus('FAILED');
        setFailCount(prev => prev + 1);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        
        setTimeout(() => {
          if (failCount < 2) {
            setStatus('SCANNING'); // Retry automatically
          } else {
            onMatchFailed(); // Hand over to manual fallback / rejection
          }
        }, 2500);
      }
    } catch (err) {
      console.error("Biometric validation error:", err);
      setStatus('FAILED');
      setFailCount(prev => prev + 1);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      
      setTimeout(() => {
        if (failCount < 2) {
          setStatus('SCANNING');
        } else {
          onMatchFailed();
        }
      }, 2500);
    }
  }, [failCount, referencePhotoUrl, onMatchSuccess, onMatchFailed]);

  const getBorderColor = () => {
    switch (status) {
      case 'SCANNING': return 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
      case 'ANALYZING': return 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]';
      case 'SUCCESS': return 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
      case 'FAILED': return 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
      default: return 'border-border';
    }
  };

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
            videoConstraints={{ facingMode: "user" }}
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
        <div className="p-4 bg-background border-t border-border flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center shrink-0">
              <span className="text-xs font-bold font-mono text-muted">{failCount}/3</span>
           </div>
           <div>
             <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Auditoria de Segurança</p>
             <p className="text-xs text-foreground mt-0.5">Autorizando: <span className="font-bold">{workerName}</span></p>
           </div>
        </div>

      </div>
    </div>
  );
}
