import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Webcam from 'react-webcam';
import { supabase } from '../lib/supabase';
import { generateEpiReceiptPDF } from '../lib/pdfGenerator';
import { User, Package, CheckCircle2, AlertCircle, X, Camera, Check, ScanFace, MapPin, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Worker, EpiInventory } from '../types';
import { MapContainer, TileLayer, Marker as LeafletMarker } from 'react-leaflet';
import { useScanner } from '../hooks/useScanner';
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

type ScanStep = 'SCAN_WORKER' | 'SCAN_EPI' | 'PHOTO_CAPTURE' | 'SUCCESS';

export function Scanner() {
  const [step, setStep] = useState<ScanStep>('SCAN_WORKER');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [epis, setEpis] = useState<any[]>([]);
  const { 
    loading, 
    error, 
    setError, 
    setLoading, 
    fetchWorker, 
    confirmAssignment 
  } = useScanner();
  
  const webcamRef = useRef<Webcam>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  const [manualInputOpen, setManualInputOpen] = useState<'WORKER' | null>(null);
  const [manualInputValue, setManualInputValue] = useState('');
  const [epiSearch, setEpiSearch] = useState('');

  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      const el = document.getElementById('qr-reader');
      if (el) el.innerHTML = '';
    };
  }, []);

  // Initialize scanner when step changes
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (step === 'SCAN_WORKER' && !manualInputOpen) {
      try {
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdgePercentage = 0.7; // 70% of the smallest edge
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return { width: qrboxSize, height: qrboxSize };
            },
            videoConstraints: {
              facingMode: "environment" // Always use back camera on mobile
            }
          },
          false
        );
        
        scanner.render(onScanSuccess, (_err) => {
          // Ignorar erros de log contínuos
        });
      } catch (err) {
        console.error("Erro ao inicializar scanner:", err);
      }
    }
    
    return () => {
      if (scanner) {
        try {
          scanner.clear().catch(console.error);
        } catch (e) {
          console.error("Erro ao limpar scanner:", e);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, manualInputOpen]);

  useEffect(() => {
    const loadCatalog = async () => {
      const { data } = await supabase.from('epi_catalog').select('*').order('name');
      if (data) setCatalog(data);
    };
    loadCatalog();
  }, []);

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
    }
  };

  const handleManualWorker = async () => {
    setManualInputOpen('WORKER');
  };

  const submitManualInput = () => {
    if (!manualInputValue.trim()) {
      setError('Digite a matrícula ou CPF do colaborador.');
      return;
    }
    onScanSuccess(manualInputValue.trim());
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedPhoto(imageSrc);
    }
  }, [webcamRef]);

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    const match = arr[0].match(/:(.*?);/);
    if (!match) throw new Error("Invalid Data URL");
    const mime = match[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const uploadToStorage = async (dataUrl: string, bucket: string, path: string) => {
    try {
      const blob = dataUrlToBlob(dataUrl);
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob, {
        contentType: blob.type,
        upsert: true
      });
      if (uploadError) {
         if (uploadError.message === 'Failed to fetch') throw new Error('Falha de conexão ao salvar arquivo.');
         throw uploadError;
      }
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrlData.publicUrl;
    } catch (e) {
      console.warn(`Storage upload failed for ${path}`, e);
      throw e;
    }
  };

  const handleConfirmPhoto = async () => {
    if (!capturedPhoto) {
      setError('Por favor, tire uma foto do colaborador com o EPI.');
      return;
    }
    if (!worker) {
      setError('Dados do colaborador não encontrados.');
      return;
    }
    
    setLoading(true);
    try {
      // Create a small placeholder for the signature since we are replacing it
      const canvas = document.createElement('canvas');
      canvas.width = 1; canvas.height = 1;
      const emptySignature = canvas.toDataURL('image/png');
      
      const pdfBase64 = await generateEpiReceiptPDF(worker, epis, emptySignature);
      
      const timestamp = new Date().getTime();
      
      // Upload files to storage (parallel)
      const [photoUrl, ] = await Promise.all([
        uploadToStorage(capturedPhoto, 'epi-receipts', `evidences/${worker.id}_${timestamp}.jpg`),
        uploadToStorage(pdfBase64, 'epi-receipts', `pdfs/${worker.id}_${timestamp}.pdf`)
      ]);
      
      // confirmAssignment sem biometria
      const success = await confirmAssignment(worker.id, epis, photoUrl, undefined, null);
      
      if (success) {
        setStep('SUCCESS');
      }
    } catch (err: unknown) {
      setError(`Erro ao confirmar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setWorker(null);
    setEpis([]);
    setCapturedPhoto(null);
    setError('');
    setStep('SCAN_WORKER');
  };

  return (
    <div data-testid="scanner-container" className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Almoxarifado</h1>
          <p className="text-muted mt-1">Fluxo rápido de entrega e evidência de EPI.</p>
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

        <div className={`flex flex-col items-center gap-2 ${step !== 'PHOTO_CAPTURE' ? 'opacity-50' : ''}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 ${step === 'SUCCESS' ? 'bg-primary border-primary text-background' : 'bg-surface border-border text-muted'} ${step === 'PHOTO_CAPTURE' ? 'border-primary text-primary' : ''}`}>
            {step === 'SUCCESS' ? <Check className="w-5 h-5" /> : '3'}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold">Foto</span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden p-6">
        {(step === 'SCAN_WORKER') && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                <ScanFace className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Identificação do Trabalhador
              </h2>
              <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
                Aponte a câmera para o QR Code no crachá do colaborador.
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
                  Entrada Manual - Trabalhador
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualInputValue}
                    onChange={(e) => setManualInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitManualInput(); }}
                    className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
                    placeholder="CPF ou Matrícula..."
                    autoFocus
                  />
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
                  onClick={handleManualWorker}
                  className="text-primary hover:text-primary-dark text-sm font-medium underline underline-offset-4"
                >
                  Entrada Manual (Simulação)
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'SCAN_EPI' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Selecionar EPI</h2>
              <p className="text-sm text-muted">
                Busque pelo nome ou CA do equipamento.
              </p>
            </div>

            <div className="relative">
              <input 
                type="text" 
                value={epiSearch}
                onChange={(e) => setEpiSearch(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
                placeholder="Buscar EPI (Ex: Capacete, 8304)..."
                autoFocus
              />
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Disponíveis no Estoque</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2">
                {catalog
                  .filter(item => 
                    !epiSearch || 
                    item.name.toLowerCase().includes(epiSearch.toLowerCase()) || 
                    (item.ca_number && item.ca_number.includes(epiSearch))
                  )
                  .map(item => {
                  const isAdded = epis.some(e => e.id === item.id);
                  const isOutOfStock = item.current_stock <= 0;
                  return (
                    <button
                      key={item.id}
                      disabled={isAdded || isOutOfStock}
                      onClick={() => {
                        setEpis(prev => [...prev, item]);
                        setEpiSearch('');
                      }}
                      className={`text-left p-3 rounded-lg border ${isAdded ? 'border-primary bg-primary/10' : isOutOfStock ? 'border-border/50 bg-surface/50 opacity-50 cursor-not-allowed' : 'border-border bg-surface hover:border-primary/50 transition-colors'}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm text-foreground line-clamp-1">{item.name}</p>
                        {isAdded && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted font-mono bg-background px-2 py-0.5 rounded">CA: {item.ca_number || 'N/A'}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isOutOfStock ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {item.current_stock} un
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {epis.length > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-foreground">EPIs Selecionados ({epis.length})</h3>
                  <button 
                    onClick={() => setStep('PHOTO_CAPTURE')}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                  >
                    Avançar <Check className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {epis.map((e, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{e.name}</p>
                          <p className="text-xs text-muted font-mono">CA: {e.ca_number || 'N/A'}</p>
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

        {step === 'PHOTO_CAPTURE' && worker && epis.length > 0 && (
          <div className="space-y-6 animate-in fade-in">
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
                      <p className="font-medium text-xs truncate">{e.name}</p>
                      <p className="text-[10px] text-muted font-mono">CA: {e.ca_number || 'N/A'}</p>
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
            
            <div className="border border-border rounded-lg bg-background overflow-hidden relative flex flex-col">
              <div className="p-3 border-b border-border flex justify-between items-center bg-surface-hover">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-muted" />
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Foto de Evidência da Entrega</span>
                </div>
                {capturedPhoto && (
                  <button 
                    onClick={retakePhoto} 
                    className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Tirar Novamente
                  </button>
                )}
              </div>
              
              <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                {!capturedPhoto ? (
                  <>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user" }} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                      <button 
                        onClick={capturePhoto}
                        className="bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-lg border-4 border-background transition-transform active:scale-95"
                      >
                        <Camera className="w-6 h-6" />
                      </button>
                    </div>
                  </>
                ) : (
                  <img src={capturedPhoto} alt="Evidência" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            <div className="text-[10px] text-muted leading-relaxed text-center px-4">
              Ao capturar a foto, certifique-se de que o <strong>colaborador e o(s) EPI(s) em mãos estão visíveis</strong>. Esta imagem serve como declaração e evidência da entrega dos equipamentos, substituindo a assinatura física.
            </div>
            
            <button
              onClick={handleConfirmPhoto}
              disabled={loading || !capturedPhoto}
              className="w-full bg-primary hover:bg-primary-dark text-background font-bold py-4 rounded-lg transition-colors text-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando NR-6...' : 'Confirmar Entrega'}
            </button>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-12 space-y-6 animate-in zoom-in">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Entrega Registrada</h2>
            <p className="text-muted max-w-sm mx-auto">
              A Ficha de EPI foi gerada digitalmente com a evidência fotográfica e vinculada ao banco de dados em conformidade com a NR-6.
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
    </div>
  );
}
