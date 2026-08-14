## 2026-08-08T21:31:33Z
Você é o Biometrics & Backend Hardening Specialist do EngenharQ OS.
Seu diretório de trabalho é: c:\Users\arthu\Documents\engenharq-os\.agents\worker_2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Sua missão:
1. Crie seu diretório de trabalho `c:\Users\arthu\Documents\engenharq-os\.agents\worker_2` e inicialize `progress.md`.
2. Em `server.ts`:
   a. Refine a extração e comparação de vetores em `extractFeatureVector` / `computeFeatureMatch`: adicione centralização na média (mean-centering) e checagem de variância de luminância/textura. Se a imagem tiver variância quase nula (imagem plana de cor sólida como Branco vs Cinza) ou se os padrões forem distintos, garanta que a pontuação seja BAIXA (score < 50) e o resultado seja REJEITADO (`match: false`).
   b. Evite o efeito colateral `EADDRINUSE`: ajuste a inicialização do servidor HTTP para disparar `startServer()` somente se o arquivo for executado diretamente como script principal ou no Vercel (ex: `const isMain = process.argv[1]?.includes('server.ts'); if (isMain && !process.env.VERCEL) { startServer(); }`).
3. Execute as três suítes de teste:
   - `npx tsx scripts/test_biometrics.ts`
   - `npx tsx scripts/test_biometrics_empirical_vulnerabilities.ts`
   - `npx tsx scripts/test_biometrics_adversarial.ts`
   Confirme que 100% dos testes passem (inclusive no-match para solid images e sem exceções `EADDRINUSE`).
4. Execute `npm run build` e confirme que a compilação permanece 100% perfeita.
5. Escreva um relatório de mudanças em `c:\Users\arthu\Documents\engenharq-os\.agents\worker_2\changes.md` e crie seu `handoff.md`.
6. Envie uma mensagem para o parent (20813637-0962-4363-b6fd-1e4d975a439d) ao concluir.
