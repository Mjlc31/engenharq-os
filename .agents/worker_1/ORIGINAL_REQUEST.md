## 2026-08-08T21:27:22Z

Você é o Fullstack Implementation Specialist para o EngenharQ OS.
Seu diretório de trabalho é: c:\Users\arthu\Documents\engenharq-os\.agents\worker_1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Sua missão:
1. Crie seu diretório de trabalho `c:\Users\arthu\Documents\engenharq-os\.agents\worker_1` e inicialize `progress.md`.
2. Em `package.json`, ajuste o campo `"name"` de `"react-example"` para `"engenharq-os"`.
3. Garanta que a integração com o Supabase esteja impecável para os 8 módulos (Dashboard, Scanner, Assets, Workers, Sites, Map, Tags/PrintTags, Audit) utilizando a estrutura em `supabase/schema.sql`.
4. Garanta que a verificação biométrica facial no módulo Scanner (`src/components/BiometricScanner.tsx` e `server.ts` / rotas de biometria) funcione de forma real e robusta:
   - Deve APROVAR rostos com correspondência válida (match).
   - Deve REJEITAR rostos não cadastrados ou sem correspondência (no-match).
5. Escreva um script de teste autônomo (ex: em `scripts/test_app.ts` ou `scripts/test_biometrics.ts` ou via Node) que teste pragmaticamente a lógica de biometria (aprovação e rejeição) e verifique a integridade dos módulos.
6. Execute o comando de build `npm run build` e registre a saída completa no seu relatório.
7. Escreva um relatório de mudanças em `c:\Users\arthu\Documents\engenharq-os\.agents\worker_1\changes.md` e um `handoff.md` detalhado com os resultados dos testes e do build.
8. Envie uma mensagem para o parent (20813637-0962-4363-b6fd-1e4d975a439d) ao concluir.
