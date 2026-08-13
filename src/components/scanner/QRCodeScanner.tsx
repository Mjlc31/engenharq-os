import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  title: string;
  subtitle: string;
  manualInputLabel: string;
}

export function QRCodeScanner({ onScanSuccess, title, subtitle, manualInputLabel }: QRCodeScannerProps) {
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualInputValue, setManualInputValue] = useState('');

  useEffect(() => {
    if (!manualInputOpen) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdgePercentage = 0.7; // 70% of the smallest edge
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
                width: qrboxSize,
                height: qrboxSize
            };
          },
          videoConstraints: {
            facingMode: "environment"
          }
        },
        false
      );
      
      scanner.render(
        (text) => {
          setManualInputOpen(false);
          setManualInputValue('');
          onScanSuccess(text);
        },
        () => {} // ignore errors
      );
      
      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [manualInputOpen, onScanSuccess]);

  const submitManualInput = () => {
    if (manualInputValue.trim()) {
      setManualInputOpen(false);
      onScanSuccess(manualInputValue.trim());
      setManualInputValue('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted mt-1">{subtitle}</p>
      </div>
      
      {manualInputOpen ? (
        <div className="mx-auto w-full max-w-lg p-4 bg-surface-hover rounded-lg border border-border">
          <label className="block text-sm font-medium mb-2 text-foreground">
            {manualInputLabel}
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={manualInputValue}
              onChange={(e) => setManualInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitManualInput(); }}
              className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
              placeholder="Código..."
              autoFocus
            />
            <button 
              onClick={submitManualInput}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded text-sm font-bold"
            >
              OK
            </button>
            <button 
              onClick={() => { setManualInputOpen(false); setManualInputValue(''); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-sm"
            >
              X
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-lg rounded-lg overflow-hidden border-2 border-primary/50 relative">
          <div id="qr-reader" className="w-full"></div>
        </div>
      )}
      
      {!manualInputOpen && (
        <div className="text-center">
          <button 
            onClick={() => setManualInputOpen(true)}
            className="text-primary hover:text-primary-dark text-sm font-medium underline underline-offset-4"
          >
            Entrada Manual (Simulação)
          </button>
        </div>
      )}
    </div>
  );
}
