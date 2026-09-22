import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { User, Package, CheckCircle2, AlertCircle, X, Check, ScanFace, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { BiometricScanner } from '../components/BiometricScanner';
import { Worker, EpiCatalog } from '../types';
import { MapContainer, TileLayer, Marker as LeafletMarker } from 'react-leaflet';
import { useScanner } from '../hooks/useScanner';
import { useEpiAssets } from '../hooks/useEpiAssets';
import { SignaturePadModal } from '../components/ui/SignaturePadModal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = new L.Icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

type ScanStep = 'SCAN_WORKER' | 'SCAN_EPI' | 'BIOMETRICS' | 'SIGNATURE' | 'SUCCESS';

export function Scanner() {
  const { catalogs } = useEpiAssets();
  const [step, setStep] = useState<ScanStep>('SCAN_WORKER');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [epis, setEpis] = useState<any[]>([]);
  const { 
    loading, 
    error, 
    setError, 
    setLoading, 
    fetchWorker, 
    fetchEpi, 
    confirmAssignment 
  } = useScanner();
  const [biometricsData, setBiometricsData] = useState<{selfieUrl: string, score: number, liveness: boolean} | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  
  const [manualInputOpen, setManualInputOpen] = useState<'WORKER' | 'EPI' | null>(null);
  const [manualInputValue, setManualInputValue] = useState('');

  // Clean up scanner when component unmounts
  const groupedEpis = epis.reduce((acc, current) => {
    const existing = acc.find(item => item.id === current.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      acc.push({ ...current, quantity: 1 });
    }
    return acc;
  }, [] as (EpiCatalog & { quantity: number })[]);

  useEffect(() => {
  return () => {
      const el = document.getElementById('qr-reader');
      if (el) el.innerHTML = '';
    };
  }, []);

  // Initialize scanner when step changes
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if ((step === 'SCAN_WORKER' || step === 'SCAN_EPI') && !manualInputOpen) {
      scanner = new Html5QrcodeScanner(
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
            facingMode: "environment" // Always use back camera on mobile
          }
        },
        false
      );
      
      scanner.render(onScanSuccess, (err) => {
        // Ignorar erros de log contínuos
      });
    }
    
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [step, manualInputOpen]);

  const onScanSuccess = async (decodedText: string) => {
    if (loading) return;
    setManualInputOpen(null);
    setManualInputValue('');
    
    if (step === 'SCAN_WORKER') {
      const searchTerm = decodedText.replace('CPF:', '').replace('MAT:', '').trim();
      const w = await fetchWorker(searchTerm);
      if (w) {
        setWorker(w);
        setStep('SCAN_EPI');
      }
    } else if (step === 'SCAN_EPI') {
      const searchTerm = decodedText.trim();
      const e = await fetchEpi(searchTerm);
      if (e) {
        if (e.status !== 'AVAILABLE') {
          setError(`EPI não disponível. Status atual: ${e.status}`);
        } else if (epis.some(item => item.id === e.id)) {
          setError('EPI já escaneado nesta ficha.');
        } else {
          setEpis(prev => [...prev, e]);
        }
      }
    }
  };

  const handleManualWorker = async () => {
    setManualInputOpen('WORKER');
  };

  const handleManualEpi = async () => {
    setManualInputOpen('EPI');
  };

  const submitManualInput = () => {
    if (!manualInputValue.trim()) {
      setError('Digite a matrícula ou CPF do colaborador.');
      return;
    }
    onScanSuccess(manualInputValue.trim());
  };

  const handleSignatureSave = async (dataUrl: string, photoFile?: File) => {
    if (!worker || epis.length === 0) return;
    
    setLoading(true);
    let uploadedPhotoUrl = '';
    
    if (photoFile) {
      try {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `deliveries/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('epi-evidence')
          .upload(filePath, photoFile);
          
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('epi-evidence').getPublicUrl(filePath);
        uploadedPhotoUrl = data.publicUrl;
      } catch (err) {
        console.error("Upload error", err);
      }
    }

    const success = await confirmAssignment(
      worker.id,
      epis,
      dataUrl,
      uploadedPhotoUrl || undefined,
      biometricsData
    );
    
    if (success) {
      setStep('SUCCESS');
    }
  };

  const resetFlow = () => {
    setWorker(null);
    setEpis([]);
    setBiometricsData(null);
    setError('');
    setStep('SCAN_WORKER');
  };

  return (
    <div data-testid="scanner-container" className="max-w-2xl mx-auto space-y-6">
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
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: [-10, 10, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
          className="bg-red-600 border-2 border-red-500 text-white p-4 rounded-md flex items-start gap-3 shadow-lg shadow-red-500/20"
        >
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-bold tracking-wide">{error}</p>
        </motion.div>
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
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                <ScanFace className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {step === 'SCAN_WORKER' ? 'Identificação do Trabalhador' : 'Registro de Equipamento'}
              </h2>
              <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
                {step === 'SCAN_WORKER' 
                  ? 'Aponte a câmera para o QR Code no crachá do colaborador.' 
                  : 'Aponte a câmera para o QR Code fixado no EPI.'}
              </p>
            </div>
            
            {/* Always keep qr-reader in DOM so scanner.clear() doesn't throw, just hide it */}
            <div className={manualInputOpen ? "hidden" : "block"}>
              <div className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-[3px] border-primary/50 relative shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <div className="absolute inset-0 border-2 border-primary/20 pointer-events-none z-10 rounded-xl m-4 border-dashed animate-pulse"></div>
                <div id="qr-reader" className="w-full bg-black/50 backdrop-blur-sm min-h-[250px] relative">
                  {/* Camera Placeholder */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted -z-10">
                    <ScanFace className="w-12 h-12 opacity-20 mb-2" />
                    <span className="text-xs font-medium uppercase tracking-widest opacity-50">Câmera Inicializando</span>
                  </div>
                </div>
              </div>
            </div>

            {manualInputOpen && (
              <div className="mx-auto w-full max-w-sm p-5 bg-background rounded-xl border border-border shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <label className="block text-xs font-bold uppercase tracking-wider mb-3 text-muted">
                  {manualInputOpen === 'WORKER' ? 'Entrada Manual - Trabalhador' : 'Entrada Manual - Equipamento'}
                </label>
                <div className="flex gap-2">
                  {manualInputOpen === 'WORKER' ? (
                    <input 
                      type="text" 
                      value={manualInputValue}
                      onChange={(e) => setManualInputValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitManualInput(); }}
                      className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
                      placeholder="CPF ou Matrícula..."
                      autoFocus
                    />
                  ) : (
                    <select 
                      value={manualInputValue}
                      onChange={e => setManualInputValue(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="">Selecione um EPI...</option>
                      {catalogs.map(epi => (
                        <option key={epi.id} value={'EPI-' + epi.id}>{epi.name} (CA: {epi.ca_number})</option>
                      ))}
                    </select>
                  )}
                  <button 
                    onClick={submitManualInput}
                    className="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors"
                  >
                    OK
                  </button>
                  <button 
                    onClick={() => { setManualInputOpen(null); setManualInputValue(''); }}
                    className="bg-surface-hover hover:bg-border text-muted hover:text-foreground px-4 py-3 rounded-lg text-sm transition-colors border border-border"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {!manualInputOpen && (
              <div className="text-center">
                <button 
                  onClick={step === 'SCAN_WORKER' ? handleManualWorker : handleManualEpi}
                  className="text-primary hover:text-primary-dark text-sm font-medium underline underline-offset-4"
                >
                  Entrada Manual (Simulação)
                </button>
              </div>
            )}

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
                  {groupedEpis.map((e, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{e.name}</p>
                            {e.quantity > 1 && (
                              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold">
                                x{e.quantity}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted font-mono">CA: {e.ca_number}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEpis(epis.filter(item => item.id !== e.id))}
                        className="p-2 text-muted hover:text-red-500 transition-colors"
                        title="Remover todos"
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

        {step === 'BIOMETRICS' && worker && (
          <div className="space-y-4">
            <BiometricScanner 
              workerName={worker.full_name}
              referencePhotoUrl={worker.reference_photo_url}
              onMatchSuccess={(selfieUrl, score, liveness) => {
                setBiometricsData({ selfieUrl, score, liveness });
                setStep('SIGNATURE');
              }}
              onMatchFailed={() => {
                setError(`Validação biométrica REJEITADA para o colaborador ${worker.full_name}. Rosto não cadastrado ou sem correspondência facial.`);
                setStep('SCAN_WORKER');
              }}
            />
            <div className="text-center mt-6">
              <button 
                onClick={() => {
                  setBiometricsData({ selfieUrl: 'https://via.placeholder.com/300', score: 100, liveness: true });
                  setStep('SIGNATURE');
                }}
                className="text-primary hover:text-primary-dark text-sm font-medium underline underline-offset-4"
              >
                Pular Biometria (Simulação / Sem Câmera)
              </button>
            </div>
          </div>
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
                {groupedEpis.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-xs truncate">{e.name}</p>
                        <p className="text-[10px] text-muted font-mono">CA: {e.ca_number}</p>
                      </div>
                      {e.quantity > 1 && (
                        <span className="text-xs font-bold text-primary">x{e.quantity}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {worker.site && worker.site.latitude && worker.site.longitude && (
              <div className="border border-border rounded-lg bg-background overflow-hidden relative">
                <div className="p-3 border-b border-border flex items-center gap-2 bg-surface-hover">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Local de Alocação: {worker.site.name}</span>
                </div>
                <div className="h-40 w-full bg-surface">
                  <MapContainer 
                    center={[worker.site.latitude, worker.site.longitude]} 
                    zoom={15} 
                    scrollWheelZoom={false}
                    zoomControl={false}
                    dragging={false}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      className="dark-tiles"
                    />
                    <LeafletMarker position={[worker.site.latitude, worker.site.longitude]} icon={defaultIcon} />
                  </MapContainer>
                </div>
              </div>
            )}
            
            <div className="text-[10px] text-muted leading-relaxed">
              Ao assinar, o colaborador declara ter recebido o EPI acima descrito, comprometendo-se a usá-lo exclusivamente para a finalidade a que se destina e zelar pela sua conservação. Uma cópia em PDF (NR-6) será gerada automaticamente.
            </div>
            
            <button
              onClick={() => setIsSignatureModalOpen(true)}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-background font-bold py-4 rounded-lg transition-colors text-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Assinar e Confirmar Entrega'}
            </button>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Entrega Registrada</h2>
            <p className="text-muted max-w-sm mx-auto">
              A Ficha de EPI foi gerada digitalmente com a assinatura do colaborador e vinculada ao banco de dados em conformidade com a NR-6.
            </p>
            <div className="pt-8">
              <button
                onClick={resetFlow}
                className="bg-surface-hover border border-border hover:bg-border text-foreground font-medium py-3 px-8 rounded-lg transition-colors"
              >
                Próximo Atendimento
              </button>
            </div>
          </div>
        )}
      </div>

      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSignatureSave}
        title="Assinatura do Recebimento"
      />
    </div>
  );
}
