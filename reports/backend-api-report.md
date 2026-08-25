# Relatório de Análise e Melhorias do Backend (EngenharQ OS API)

**Data da Análise:** Agosto de 2026
**Especialista:** engenharq-backend-api

Este relatório detalha a avaliação atual do código do backend, com foco na integração Express, processamento de imagens (Base64), integração com o Gemini 2.5 Flash para biometria e tratamento de erros. A análise foi baseada nas diretrizes do arquivo `backend-genai-guidelines`.

## 1. Arquitetura da API (Express e Rotas)
### Estado Atual
Atualmente, existe uma dualidade na implementação da API:
- O arquivo principal `server.ts` contém diretamente a lógica de negócio, extração de imagens, validação e roteamento (`handleBiometricsMatch` e dependências).
- Existe uma pasta `server/` com uma arquitetura superior (`server/routes/index.ts` e `server/controllers/biometrics.ts`), porém essa estrutura não está sendo consumida pelo `server.ts`.

### Melhorias Propostas
- **Refatoração do `server.ts`**: Remover toda a lógica de biometria de dentro de `server.ts` e passar a importar o `router` exportado por `server/routes/index.ts`. Isso deixará o arquivo `server.ts` enxuto, responsável apenas por gerenciar middlewares, inicialização do Express e integração com o Vite/Vercel.
- **Padronização do Limite de Payload**: O `server.ts` atualmente configura `app.use(express.json({ limit: '10mb' }));`. As diretrizes exigem que o limite seja de `50mb` para lidar corretamente com selfies em alta resolução. O modelo presente em `server/routes/index.ts` faz isso muito bem (limite de 2MB geral, e 50MB específico para a rota de biometria).

## 2. Tratamento de Arquivos e Lógica de Imagens Base64
### Estado Atual
- No `server.ts`, a conversão do base64 é feita manualmente (`extractBuffer`), o que abre espaço para quebras caso o payload seja mal formatado.
- No controller `biometrics.ts`, a conversão é mais robusta e verifica especificamente `audit_selfie.startsWith("data:")` além de buscar a imagem de referência externa lidando com `arrayBuffer`.

### Melhorias Propostas
- **Proteção SSRF**: O código do controller (`biometrics.ts`) possui uma excelente proteção contra *Server-Side Request Forgery* (SSRF) ao impedir a requisição a IPs locais (`localhost`, `127.0.0.1`, etc.) na busca pela foto de referência. Essa lógica deve ser ativada na produção migrando para o uso do controller.
- **Validação de Payload com Zod**: Substituir as validações manuais (ex: `if (!audit_selfie)`) pelo schema já desenhado em `biometrics.ts` usando o `zod`. Isso garante dados sanitizados e centralização de regras.

## 3. Integração com Gemini API (Flash 2.5)
### Estado Atual
- Ambas as implementações instanciam corretamente o modelo `gemini-2.5-flash` usando `@google/genai` e passando as imagens via `inlineData`.
- O `responseMimeType: "application/json"` é configurado corretamente para estruturar a resposta (match, score, liveness).
- O `server.ts` contém um longo motor determinístico (`computeFeatureMatch`) de comparação de matrizes de imagem caso o Gemini falhe ou não tenha API Key.

### Melhorias Propostas
- **Adoção de Mock em Dev (Conforme Diretriz)**: O motor determinístico de `server.ts` adiciona grande complexidade ao código e raramente terá uma acurácia comparável a IA. Conforme a diretriz de *Segurança e Fallbacks*, ambientes locais sem API key devem usar Mock para não travar o Frontend. Recomenda-se remover o `computeFeatureMatch` em favor da lógica de Mock limpa presente em `server/controllers/biometrics.ts` (que gera escores aleatórios com base num setTimeout).
- **Tratamento Seguro do JSON de Retorno**: Caso a IA delire, o parse do JSON na string de retorno pode causar throw. O controller possui um bloco `try/catch` envolta do `JSON.parse` retornando status HTTP `422 (Unprocessable Entity)` em caso de falha. Isso deve ser o padrão.

## 4. Segurança e Fallbacks (Tratamento de Erros)
### Estado Atual
- As chaves de API estão protegidas (lidas apenas via `process.env.GEMINI_API_KEY` no server-side).
- Erros são tratados mascarando detalhes com `res.status(500).json({ error: "Internal server error" })`.

### Melhorias Propostas
- **Tratamento de Erros Centralizado**: Implementar um middleware de tratamento de erro no Express que capture exceções disparadas e retorne formatos JSON padronizados, impedindo o vazamento de stack traces e mantendo os logs ocultos no console do servidor.

## Conclusão
O código em `server/controllers` e `server/routes` reflete com excelência as boas práticas e diretrizes da stack GenAI. O maior ganho imediato a ser implementado será migrar o código atual do `server.ts` para consumir a estrutura limpa já projetada nesses diretórios.
