# Original User Request

## Initial Request — 2026-08-08T21:18:44Z

<USER_REQUEST>
O EngenharQ OS é um sistema operacional web (React + Vite + TailwindCSS + Supabase) de gestão de Equipamentos de Proteção Individual (EPIs) para construtoras e obras civis. A plataforma possui módulos de Dashboard, Scanner (QR Code/Biometria), Inventário de EPIs, Trabalhadores, Obras, Mapa interativo, Etiquetas e Auditoria NR-6.

Working directory: c:\Users\arthu\Documents\engenharq-os
Integrity mode: development

## Verification Resources
- **Schema do Supabase**: Arquivo disponível em `supabase/schema.sql` dentro do working directory.

## Requirements

### R1. Desenvolvimento Frontend e Integração
Construir a interface web para todos os 8 módulos (Dashboard, Scanner, Assets, Workers, Sites, Map, Tags, Audit) utilizando React, Vite e TailwindCSS. O frontend deve se conectar ao Supabase utilizando o schema fornecido, realizando autenticação e operações de CRUD necessárias para cada módulo.

### R2. Verificação Biométrica
Implementar a verificação biométrica facial real (utilizando bibliotecas como face-api.js ou outra API adequada) no módulo de Scanner para controle de entrega/devolução de EPIs.

## Acceptance Criteria

### Compilação e Execução
- [ ] O projeto frontend compila com sucesso (`npm run build`) sem erros críticos.
- [ ] O servidor de desenvolvimento inicia corretamente e a página inicial carrega sem erros no console (verificável via script ou log).

### Funcionalidade (Validação via Agente-Juiz ou Script E2E)
- [ ] É possível realizar login via Supabase Auth e acessar o Dashboard.
- [ ] A navegação entre os 8 módulos principais funciona corretamente.
- [ ] A verificação biométrica rejeita rostos não cadastrados e aprova rostos com correspondência válida (pode ser validado por script de teste enviando imagens de referência).
</USER_REQUEST>
