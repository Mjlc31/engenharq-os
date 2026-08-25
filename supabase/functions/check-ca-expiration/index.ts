import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

// createClient fora do handler é ok para Service Role, 
// mas a invocação DEVE ser autenticada.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // 1. Segurança: Verificar webhook secret
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Lógica: Apenas métodos permitidos (POST)
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Buscar EPIs em uso com CA vencendo em <= 30 dias
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);
    
    // 3. Correção de Modelagem: É melhor buscar a assignment ativa diretamente.
    // Usando inner join para garantir que pegamos a atribuição que AINDA NÃO FOI DEVOLVIDA.
    const { data: assignments, error } = await supabase
      .from('epi_assignments')
      .select(`
        *,
        epi:epi_inventory!inner(*),
        worker:workers(*)
      `)
      .is('returned_at', null)
      .eq('epi.status', 'IN_USE')
      .lte('epi.ca_expiration_date', futureDate.toISOString().split('T')[0]);

    if (error) throw error;

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring CAs found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${assignments.length} active EPI assignments with CAs expiring soon.`);

    // 4. Performance: Paralelizar chamadas de rede com Promise.all (com limite de concorrência se necessário, mas all é melhor que sequencial)
    const emailPromises = assignments.map(async (assignment) => {
       const epi = assignment.epi;
       const worker = assignment.worker?.full_name || 'Desconhecido';
       console.log(`[ALERTA EMAIL] EPI ${epi.category} (${epi.tracking_code}) do trabalhador ${worker} vence em ${epi.ca_expiration_date}`);
       
       if (resendApiKey) {
         return fetch('https://api.resend.com/emails', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${resendApiKey}`
           },
           body: JSON.stringify({
             from: 'EngenharQ OS <alertas@engenharq.com>',
             to: ['engenheiro.seguranca@construtora.com'],
             subject: `[EngenharQ] ALERTA DE VENCIMENTO CA - ${epi.category}`,
             html: `<p>Atenção! O CA ${epi.ca_number} do equipamento <strong>${epi.tracking_code}</strong>, atualmente em uso por <strong>${worker}</strong>, irá expirar em ${epi.ca_expiration_date}. Por favor, providencie a troca preventiva.</p>`
           })
         });
       }
    });

    await Promise.all(emailPromises);

    return new Response(JSON.stringify({ 
      message: `Checked and sent alerts for ${assignments.length} items.` 
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    // Erros desconhecidos não devem vazar mensagens de erro na produção se possível,
    // mas mantido para debug.
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
});
