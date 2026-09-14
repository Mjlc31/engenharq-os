const fs = require('fs');
let code = fs.readFileSync('src/pages/Operations.tsx', 'utf-8');

// Add imports
code = code.replace(
  "import { SignaturePadModal } from '../components/ui/SignaturePadModal';",
  `import { SignaturePadModal } from '../components/ui/SignaturePadModal';
import { ReturnForm } from '../components/features/operations/ReturnForm';
import { ReplacementForm } from '../components/features/operations/ReplacementForm';
import { LossForm } from '../components/features/operations/LossForm';`
);

// Add pending replacement state
code = code.replace(
  "const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);",
  `const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [pendingReplacement, setPendingReplacement] = useState<{workerId: string, oldEpiId: string, newEpiId: string} | null>(null);`
);

// Modify modal onSave logic to handle both Entrega and Substituicao
code = code.replace(
  "onSave={processEntrega}",
  "onSave={pendingReplacement ? processReplacement : processEntrega}"
);

// Close modal handler to also clear pending replacement
code = code.replace(
  "onClose={() => setIsSignatureModalOpen(false)}",
  "onClose={() => { setIsSignatureModalOpen(false); setPendingReplacement(null); }}"
);

// Inject processReplacement function
code = code.replace(
  "  return (",
  `  const processReplacement = async (signatureDataUrl: string) => {
    if (!pendingReplacement) return;
    setSubmitting(true);
    try {
      // 1. Devolve o antigo
      const { error: returnError } = await supabase.rpc('return_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_epi_id: pendingReplacement.oldEpiId,
        p_condition: 'DAMAGED'
      });
      if (returnError) throw returnError;

      // 2. Entrega o novo
      const { error: assignError } = await supabase.rpc('assign_epi', {
        p_worker_id: pendingReplacement.workerId,
        p_epi_id: pendingReplacement.newEpiId
      });
      if (assignError) throw assignError;

      // 3. Assina
      const { error: sigError } = await supabase
        .from('epi_assignments')
        .update({ digital_signature_url: signatureDataUrl })
        .eq('epi_id', pendingReplacement.newEpiId)
        .eq('worker_id', pendingReplacement.workerId)
        .is('returned_at', null);
      if (sigError) throw sigError;

      toast({ type: 'success', title: 'Sucesso', message: 'Substituição concluída e assinada com sucesso.' });
      setPendingReplacement(null);
    } catch (err: any) {
      toast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setSubmitting(false);
      window.location.reload();
    }
  };

  return (`
);

// Replace placeholders with real components
code = code.replace(
  `{activeTab !== 'entregas' && (
          <div className="text-center py-12 text-muted">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Módulo em Desenvolvimento</h3>
            <p>O fluxo de {activeTab} está planejado para a próxima iteração do MVP.</p>
          </div>
        )}`,
  `{activeTab === 'devolucoes' && <ReturnForm workers={workers} />}
        {activeTab === 'substituicoes' && <ReplacementForm workers={workers} catalogs={catalogs} epis={epis} setIsSignatureModalOpen={setIsSignatureModalOpen} setPendingReplacement={setPendingReplacement} />}
        {activeTab === 'extravios' && <LossForm workers={workers} />}`
);

fs.writeFileSync('src/pages/Operations.tsx', code);
