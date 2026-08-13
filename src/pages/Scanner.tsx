import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import { generateEpiReceiptPDF } from '../lib/pdfGenerator';
import { uploadToStorage } from '../lib/storage';
import { User, Package, AlertCircle, X, Check } from 'lucide-react';
import { BiometricScanner } from '../components/BiometricScanner';
import { SuccessView } from '../components/scanner/SuccessView';
import { QRCodeScanner } from '../components/scanner/QRCodeScanner';
import { SignaturePad } from '../components/scanner/SignaturePad';
import { WorkerMap } from '../components/scanner/WorkerMap';

type ScanStep = 'SCAN_WORKER' | 'SCAN_EPI' | 'BIOMETRICS' | 'SIGNATURE' | 'SUCCESS';

export function Scanner() {
  const [step, setStep] = useState<ScanStep>('SCAN_WORKER');
  const [worker, setWorker] = useState<any>(null);
  const [epis, setEpis] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricsData, setBiometricsData] = useState<{selfieUrl: string, score: number, liveness: boolean} | null>(null);
  
  const sigCanvas = useRef<SignatureCanvas>(null);

  const onScanSuccess = async (decodedText: string) => {
    setError('');
    setLoading(true);
    
    if (step === 'SCAN_WORKER') {
      const searchTerm = decodedText.replace('CPF:', '').replace('MAT:', '').trim();
      let { data, error } = await supabase
        .from('workers')
        .select('*, site:construction_sites(name, latitude, longitude)')
        .or(`cpf.eq.${searchTerm},registration_number.eq.${searchTerm},id.eq.${searchTerm}`)
        .single();
        
      if (error && error.message === 'Failed to fetch') {
         setError('Falha de conexão. Verifique sua rede e tente novamente.');
         setLoading(false);
         return;
      }
        
      if (data) {
        setWorker(data);
        setStep('SCAN_EPI');
      } else {
        setError('Colaborador não encontrado.');
      }
    } else if (step === 'SCAN_EPI') {
      const searchTerm = decodedText.trim();
      let { data, error } = await supabase
        .from('epi_inventory')
        .select('*')
        .or(`tracking_code.eq.${searchTerm},id.eq.${searchTerm}`)
        .single();
        
      if (error && error.message === 'Failed to fetch') {
         setError('Falha de conexão. Verifique sua rede e tente novamente.');
         setLoading(false);
         return;
      }
        
      if (data) {
        if (data.status !== 'AVAILABLE') {
          setError(`EPI não disponível. Status atual: ${data.status}`);
        } else if (epis.some(e => e.id === data.id)) {
          setError('EPI já escaneado nesta ficha.');
        } else {
          setEpis(prev => [...prev, data]);
        }
      } else {
        setError('EPI não encontrado.');
      }
    }
    
    setLoading(false);
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleConfirmSignature = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setError('Por favor, colete a assinatura do colaborador.');
      return;
    }
    
    setLoading(true);
    try {
      const signatureDataUrl = sigCanvas.current!.getTrimmedCanvas().toDataURL('image/png');
      const pdfBase64 = await generateEpiReceiptPDF(worker, epis, signatureDataUrl);
      
      const timestamp = new Date().getTime();
      
      const [signatureUrl, pdfUrl, selfieUrl] = await Promise.all([
        uploadToStorage(signatureDataUrl, 'epi-receipts', `signatures/${worker.id}_${timestamp}.png`),
        uploadToStorage(pdfBase64, 'epi-receipts', `pdfs/${worker.id}_${timestamp}.pdf`),
        biometricsData?.selfieUrl ? uploadToStorage(biometricsData.selfieUrl, 'epi-receipts', `selfies/${worker.id}_${timestamp}.jpg`) : Promise.resolve(null)
      ]);
      
      const assignments = epis.map(item => {
        const expectedReturn = new Date();
        expectedReturn.setDate(expectedReturn.getDate() + (item.recommended_lifespan_days || 180));
        
        return {
          epi_id: item.id, 
          worker_id: worker.id,
          expected_return_date: expectedReturn.toISOString(),
          digital_signature_url: signatureUrl,
          generated_pdf_url: pdfUrl,
          audit_selfie_url: selfieUrl || biometricsData?.selfieUrl,
          biometric_match_score: biometricsData?.score,
          liveness_verified: biometricsData?.liveness
        };
      });

      let { error: assignError } = await supabase.from('epi_assignments').insert(assignments);
      
      if (assignError) throw assignError;
      
      const epiIds = epis.map(e => e.id);
      const { error: updateError } = await supabase.from('epi_inventory')
        .update({ status: 'IN_USE' })
        .in('id', epiIds);
      
      setStep('SUCCESS');
    } catch (err: any) {
      setError(`Erro ao confirmar: ${err.message}`);
    }
    setLoading(false);
  };

  const resetFlow = () => {
    setWorker(null);
    setEpis([]);
    setBiometricsData(null);
    setError('');
    setStep('SCAN_WORKER');
  };

  return (
    <div className="w-[95%] sm:w-full max-w-lg mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Almoxarifado</h1>
          <p className="text-muted mt-1">Fluxo rápido de entrega e assinatura de EPI.</p>
        </div>
        <button 
          onClick={resetFlow}
          className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-surface-hover text-muted"
        >
          Resetar Fluxo
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-between relative mb-8">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10"></div>
        
        <div className={`flex flex-col items-center gap-2 ${step !== 'SCAN_WORKER' ? 'opacity-50' : ''}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 ${worker ? 'bg-primary border-primary text-background' : 'bg-surface border-primary text-primary'}`}>
            {worker ? <Check className="w-5 h-5" /> : '1'}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold">Colaborador</span>
        </div>
        
        <div className={`flex flex-col items-center gap-2 ${step !== 'SCAN_EPI' ? 'opacity-50' : ''}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 ${epis.length > 0 ? 'bg-primary border-primary text-background' : 'bg-surface border-border text-muted'} ${(step === 'SCAN_EPI' && epis.length === 0) ? 'border-primary text-primary' : ''}`}>
            {epis.length > 0 ? <Check className="w-5 h-5" /> : '2'}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold">EPI</span>
        </div>

        <div className={`flex flex-col items-center gap-2 ${step !== 'BIOMETRICS' ? 'opacity-50' : ''}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 ${biometricsData ? 'bg-primary border-primary text-background' : 'bg-surface border-border text-muted'} ${(step === 'BIOMETRICS' && !biometricsData) ? 'border-primary text-primary' : ''}`}>
            {biometricsData ? <Check className="w-5 h-5" /> : '3'}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold">Biometria</span>
        </div>
        
        <div className={`flex flex-col items-center gap-2 ${step !== 'SIGNATURE' ? 'opacity-50' : ''}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 ${step === 'SUCCESS' ? 'bg-primary border-primary text-background' : 'bg-surface border-border text-muted'} ${step === 'SIGNATURE' ? 'border-primary text-primary' : ''}`}>
            {step === 'SUCCESS' ? <Check className="w-5 h-5" /> : '4'}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold">Assinatura</span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden p-6">
        {(step === 'SCAN_WORKER' || step === 'SCAN_EPI') && (
          <div className="space-y-6">
            <QRCodeScanner
              key={step} // ensures a fresh scanner instance per step
              onScanSuccess={onScanSuccess}
              title={step === 'SCAN_WORKER' ? 'Escaneie o Crachá do Colaborador' : 'Escaneie o QR Code do EPI'}
              subtitle="Aponte a câmera para o QR code ou código de barras."
              manualInputLabel={step === 'SCAN_WORKER' ? 'Digite o CPF ou ID (Ex: MAT123)' : 'Digite o Tracking Code (Ex: CAP01)'}
            />

            {step === 'SCAN_EPI' && epis.length > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-foreground">EPIs na Ficha ({epis.length})</h3>
                  <button 
                    onClick={() => setStep('BIOMETRICS')}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                  >
                    Avançar <Check className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {epis.map((e, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{e.category}</p>
                          <p className="text-[10px] text-muted font-mono">{e.tracking_code}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEpis(epis.filter(item => item.id !== e.id))}
                        className="p-2 text-muted hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'BIOMETRICS' && (
          <BiometricScanner 
            workerName={worker.full_name}
            referencePhotoUrl={worker.reference_photo_url}
            onMatchSuccess={(selfieUrl, score, liveness) => {
              setBiometricsData({ selfieUrl, score, liveness });
              setStep('SIGNATURE');
            }}
            onMatchFailed={() => {
              // Auto-fallback for demo
              setBiometricsData({ selfieUrl: 'FALLBACK_MANUAL', score: 0, liveness: false });
              setStep('SIGNATURE');
            }}
          />
        )}

        {step === 'SIGNATURE' && worker && epis.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background border border-border p-4 rounded-lg flex items-start gap-3">
                <div className="p-2 bg-surface-hover rounded-md shrink-0"><User className="w-5 h-5 text-muted" /></div>
                <div>
                  <p className="text-[10px] uppercase text-muted font-bold tracking-wider">Colaborador</p>
                  <p className="font-medium text-sm mt-0.5">{worker.full_name}</p>
                  <p className="text-xs text-muted font-mono mt-1">{worker.registration_number}</p>
                </div>
              </div>
              
              <div className="bg-background border border-border p-4 rounded-lg flex flex-col gap-2 max-h-[120px] overflow-y-auto">
                <p className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1 sticky top-0 bg-background">Equipamentos ({epis.length})</p>
                {epis.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{e.category}</p>
                      <p className="text-[10px] text-muted font-mono">{e.tracking_code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {worker.site && worker.site.latitude && worker.site.longitude && (
              <WorkerMap 
                siteName={worker.site.name}
                latitude={worker.site.latitude}
                longitude={worker.site.longitude}
              />
            )}
            
            <SignaturePad ref={sigCanvas} onClear={clearSignature} />

            <div className="text-[10px] text-muted leading-relaxed">
              Ao assinar, o colaborador declara ter recebido o EPI acima descrito, comprometendo-se a usá-lo exclusivamente para a finalidade a que se destina e zelar pela sua conservação. Uma cópia em PDF (NR-6) será gerada automaticamente.
            </div>
            
            <button
              onClick={handleConfirmSignature}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-background font-bold py-4 rounded-lg transition-colors text-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando NR-6...' : 'Confirmar Entrega'}
            </button>
          </div>
        )}

        {step === 'SUCCESS' && <SuccessView onNext={resetFlow} />}
      </div>
    </div>
  );
}
