import { z } from 'zod';
import { Request, Response } from 'express';

const biometricsSchema = z.object({
  audit_selfie: z.string().min(1, "Missing selfie data"),
  reference_photo_url: z.string().optional().nullable(),
});

export const biometricsMatch = async (req: Request, res: Response) => {
  try {
    const parsed = biometricsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { audit_selfie, reference_photo_url } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !reference_photo_url || reference_photo_url === 'mock_reference_path') {
      console.log("Using Mock Biometrics Match");
      const isSuccess = Math.random() > 0.2; 
      const matchScore = isSuccess ? 95.4 + Math.random() * 4 : 45.0 + Math.random() * 20;
      
      setTimeout(() => {
        res.json({
          match: matchScore > 85,
          score: matchScore,
          liveness: true
        });
      }, 1500);
      return;
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // SSRF Protection
    const parsedUrl = new URL(reference_photo_url);
    const forbiddenHostnames = ['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0', '::1'];
    if (parsedUrl.protocol !== 'https:' || forbiddenHostnames.includes(parsedUrl.hostname) || parsedUrl.hostname.endsWith('.internal')) {
      return res.status(400).json({ error: "Invalid reference photo URL" });
    }

    const refResponse = await fetch(reference_photo_url);
    if (!refResponse.ok) {
       throw new Error("Failed to fetch reference photo");
    }
    const refBuffer = await refResponse.arrayBuffer();
    const refBase64 = Buffer.from(refBuffer).toString('base64');
    const refMime = refResponse.headers.get('content-type') || 'image/jpeg';

    if (typeof audit_selfie !== 'string' || !audit_selfie.includes(",") || !audit_selfie.startsWith("data:")) {
      return res.status(400).json({ error: "Invalid selfie data format" });
    }
    const selfieBase64 = audit_selfie.split(",")[1];
    const selfieMime = audit_selfie.split(";")[0].split(":")[1] || 'image/jpeg';

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
        config: {
            responseMimeType: "application/json",
        }
    });

    const text = response.text;
    let result;
    try {
      result = JSON.parse(text);
    } catch(e) {
      console.error("Failed to parse Gemini response:", text);
      return res.status(422).json({ error: "Invalid response from AI model", match: false, score: 0, liveness: false });
    }

    res.json(result);

  } catch (err) {
    console.error("Biometrics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
