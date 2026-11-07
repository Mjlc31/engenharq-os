import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.22.4";
import { encodeBase64 } from "jsr:@std/encoding/base64";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A foto de referência vem do cadastro do colaborador no banco, nunca do cliente
const biometricsSchema = z.object({
  audit_selfie: z.string().min(1, "Missing selfie data"),
  worker_id: z.string().uuid("Invalid worker_id"),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = biometricsSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.errors[0].message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { audit_selfie, worker_id } = parsed.data;
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Sem chave não há verificação: falha fechado em vez de sortear um resultado
    if (!apiKey) {
      return json({ error: "Biometric verification unavailable", match: false, score: 0, liveness: false }, 503);
    }

    // Lê o cadastro com o token de quem chamou: a RLS só deixa usuário ativo ler colaboradores
    const workerRes = await fetch(`${supabaseUrl}/rest/v1/workers?id=eq.${worker_id}&select=reference_photo_url`, {
      headers: {
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        Authorization: req.headers.get('Authorization') ?? '',
      },
    });
    const [worker] = workerRes.ok ? await workerRes.json() : [];
    const reference_photo_url: string | null = worker?.reference_photo_url ?? null;
    if (!reference_photo_url) {
      return json({ error: "Worker has no reference photo", match: false, score: 0, liveness: false }, 422);
    }

    // Só busca imagens do storage deste projeto (evita usar a função como proxy para outros endereços)
    const parsedUrl = new URL(reference_photo_url);
    if (parsedUrl.origin !== new URL(supabaseUrl).origin || !parsedUrl.pathname.startsWith('/storage/v1/object/')) {
      return json({ error: "Invalid reference photo URL" }, 400);
    }

    const refResponse = await fetch(reference_photo_url);
    if (!refResponse.ok) {
       throw new Error("Failed to fetch reference photo");
    }
    const refBuffer = await refResponse.arrayBuffer();
    const refBase64 = encodeBase64(refBuffer);
    const refMime = refResponse.headers.get('content-type') || 'image/jpeg';

    if (typeof audit_selfie !== 'string' || !audit_selfie.includes(",") || !audit_selfie.startsWith("data:")) {
      return new Response(JSON.stringify({ error: "Invalid selfie data format" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const selfieBase64 = audit_selfie.split(",")[1];
    const selfieMime = audit_selfie.split(";")[0].split(":")[1] || 'image/jpeg';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
            {
               role: 'user',
               parts: [
                  { text: "Você é um perito em biometria facial e segurança. Avalie as duas imagens fornecidas. A primeira imagem é a foto de referência (documento). A segunda imagem é a selfie tirada agora. Eles são a mesma pessoa? Considere pequenas mudanças como óculos, barba e iluminação. Retorne APENAS um objeto JSON válido com as seguintes chaves:\n- match: booleano (true se for a mesma pessoa)\n- score: número de 0 a 100 indicando o grau de similaridade\n- liveness: booleano (true se a selfie parece ser uma pessoa real tirando foto, e não uma foto de foto)" },
                  { inlineData: { data: refBase64, mimeType: refMime } },
                  { inlineData: { data: selfieBase64, mimeType: selfieMime } }
               ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
        }
      })
    });

    const aiResult = await response.json();
    const text = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let result;
    try {
      result = JSON.parse(text || "{}");
    } catch(e) {
      console.error("Failed to parse Gemini response:", text, "Full AI result:", aiResult);
      return new Response(JSON.stringify({ error: "Invalid response from AI model", match: false, score: 0, liveness: false }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Biometrics error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
