---
name: backend-genai-guidelines
description: Diretrizes e arquitetura para o backend (Express) e integração com o Gemini (GenAI) do EngenharQ OS.
---

# Backend & GenAI Guidelines para EngenharQ OS

Ao atuar no backend deste sistema, siga estas instruções de arquitetura para a API Express e integrações de IA, garantindo escalabilidade e facilidade de manutenção.

## 1. Arquitetura da API
- O arquivo principal do servidor é `server.ts`. 
- **Express**: O backend usa ExpressJS para prover as rotas de API.
- As rotas da API (`/api/*`) DEVEM ser registradas **antes** dos middlewares do Vite, para evitar que o Vite as intercepte.

## 2. Tratamento de Arquivos e Imagens
- Ao receber imagens da webcam via requisição POST (ex: selfies de auditoria biométrica), garanta que o Express consiga processar o payload com limites altos: `app.use(express.json({ limit: '50mb' }));`.
- Valide sempre se os parâmetros obrigatórios foram enviados (ex: `audit_selfie`).

## 3. Integração com Gemini API
- A aplicação utiliza o SDK `@google/genai`.
- **Uso do Modelo**: Sempre prefira instanciar a IA com o modelo `gemini-2.5-flash` ou outro modelo especificado que suporte as tarefas multimodais (análise de imagem).
- Para comparar imagens (ex: Biometria), você deve processar o payload base64 (`audit_selfie`) e convertê-lo corretamente antes de enviá-lo como `inlineData`.
- **Configuração de Resposta**: Quando você precisar que o Gemini retorne respostas em um formato estruturado (JSON), sempre use `responseMimeType: "application/json"`.

## 4. Segurança e Fallbacks
- Não exponha chaves de API (`GEMINI_API_KEY`) no frontend, toda comunicação com o LLM deve acontecer exclusivamente via Node.js (`server.ts`).
- Em ambientes de desenvolvimento locais sem acesso a chaves reais ou dados reais, mantenha lógicas de Mock (como o de Biometrics Match atual) para não travar o trabalho do desenvolvedor Frontend.
- Trate exceções da chamada à API de forma silenciosa para o cliente, retornando um status seguro ou um JSON indicando falha técnica, não vazando detalhes internos de erro.
