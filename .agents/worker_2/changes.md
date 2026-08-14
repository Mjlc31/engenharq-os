# Relatório de Mudanças - Hardening de Biometria e Backend

**Data**: 2026-08-08  
**Agente**: Biometrics & Backend Hardening Specialist (`worker_2`)  
**Repositório**: `EngenharQ OS` (`c:\Users\arthu\Documents\engenharq-os`)

---

## 1. Resumo das Alterações

### A. Refinamento de `computeFeatureMatch` em `server.ts`
- **Centralização na Média (Mean-Centering)**: Implementada a centralização de vetores de características (`vecA[i] - meanA` e `vecB[i] - meanB`), permitindo a computação do Coeficiente de Correlação de Pearson ($r$) em vez da simples similaridade de cossenos em vetores não-centralizados. Isso elimina falsos positivos onde diferenças de brilho/offset médio dominavam a comparação.
- **Detecção de Variância Quase Nula (Imagens Planas / Cores Sólidas)**: Adicionada verificação de variância de luminância/textura (`varA < 1e-4 || varB < 1e-4`). Se duas imagens não forem idênticas e uma delas (ou ambas) possuir variância de textura quase nula (como amostras sintéticas de cor sólida: Branco vs Cinza, Branco vs Cinza Escuro, Cinza vs Cinza Escuro, Branco vs Preto), o sistema rejeita imediatamente com `match: false`, `score: 0` e motivo `"Variância de textura/luminância insuficiente"`.
- **Igualdade Exata de Payloads Idênticos**: Adicionada verificação prévia de igualdade exata de buffers (`selfieBuf.equals(refBuf)`). Imagens 100% idênticas (incluindo payloads de estresse de 2MB) retornam instantaneamente `match: true` e `score: 100` sem recálculos redundantes.
- **Clamping do Coeficiente de Correlação**: O coeficiente de correlação $r$ é limitado ao intervalo $[-1.0, 1.0]$, garantindo pontuações seguras entre 0 e 100.

### B. Correção do Efeito Colateral `EADDRINUSE` no `server.ts`
- **Execução Condicional do Servidor HTTP (`startServer`)**: Ajustado o gatilho de inicialização do servidor HTTP para disparar `startServer()` apenas quando `server.ts` for executado diretamente como script principal (`const isMain = process.argv[1]?.includes('server.ts')`) e fora do ambiente Vercel.
- **Eliminação de Port Blocking**: Evita que a simples importação do módulo `server.ts` em suítes de teste (como `test_biometrics.ts`, `test_biometrics_empirical_vulnerabilities.ts`, `test_biometrics_adversarial.ts`) abra o servidor Express na porta 3000 ou inicie middleware do Vite (porta 24678), solucionando 100% das exceções `EADDRINUSE`.

---

## 2. Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `server.ts` | Atualização das funções `computeFeatureMatch` e da condicional de inicialização `isMain` / `startServer()`. |

---

## 3. Resultados de Verificação

### Suítes de Teste Biométrico
1. `npx tsx scripts/test_biometrics.ts`
   - **Resultado**: `15/15 Passed` (100% PASS, sem erro `EADDRINUSE`).
2. `npx tsx scripts/test_biometrics_empirical_vulnerabilities.ts`
   - **Resultado**: `6/6 PASS` (Zero falsos positivos em pares sintéticos White vs Grey, White vs Dark Grey, Pattern A vs Pattern B, etc.).
3. `npx tsx scripts/test_biometrics_adversarial.ts`
   - **Resultado**: `16/16 PASSED` (100% PASS, tempo total para 100 requisições concorrentes: 9.3ms, payload de 2MB processado em 5.2ms).

### Build de Produção
- `npm run build`
   - **Resultado**: Compilação 100% bem-sucedida (`vite build` + `esbuild server.ts -> dist/server.cjs`).
