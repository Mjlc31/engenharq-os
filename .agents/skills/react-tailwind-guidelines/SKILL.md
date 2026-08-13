---
name: react-tailwind-guidelines
description: Diretrizes de design e desenvolvimento Frontend (React, Vite, Tailwind, Recharts) para o projeto EngenharQ OS.
---

# React & Tailwind Guidelines para EngenharQ OS

Ao atuar como desenvolvedor frontend neste projeto, você deve seguir estritamente estas diretrizes para garantir consistência, responsividade e um visual limpo e moderno.

## 1. Stack e Bibliotecas
- **Framework**: React 19 com Vite.
- **Estilização**: Tailwind CSS v4.
- **Ícones**: `lucide-react`. Sempre prefira os ícones padrão desta biblioteca para botões e cards.
- **Gráficos**: `recharts`. Use para gráficos no Dashboard (ex: PieChart para status de EPIs).
- **Roteamento**: `react-router-dom` v7.

## 2. Princípios de Design e Estética
- **Function-Driven Design**: O foco do EngenharQ OS é ser utilitário. Gerenciar EPIs, mapas e auditorias deve ser prático e requerer poucos cliques.
- **Less, but better**: Evite excesso de cores, texturas desnecessárias ou degradês nas fontes. Prefira fundos sólidos, bordas sutis (`border-gray-200` ou `border-gray-800` no modo escuro) e bom espaçamento (uso generoso de padding).
- **Responsividade**: As tabelas de EPIs e trabalhadores devem colapsar ou usar scroll horizontal `overflow-x-auto` em telas menores. Os modais (ex: leitura de QR code) devem ocupar quase toda a tela no celular (`w-[95%]`) e tamanho fixo/máximo (`max-w-lg`) no desktop.

## 3. Padrões de Código
- **Componentes**: Todos os novos componentes de página devem ser exportados em arquivos dedicados dentro de `src/pages/` e os componentes reutilizáveis (botões, modais genéricos, cartões) em `src/components/`.
- **Hooks de Supabase**: Mantenha a lógica de carregamento assíncrono (useEffect com async functions) que consultam o arquivo `src/lib/supabase.ts`.
- **Loading States**: Sempre implemente um "skeleton" ou spinner simples enquanto aguarda os dados do Supabase carregarem.

## 4. Antipatterns a Evitar
- **NUNCA** construa modais aninhados demais. Um nível de modal é suficiente.
- **NUNCA** coloque lógicas complexas de validação biométrica no frontend; o frontend apenas captura a base64 da webcam (`react-webcam`) e envia para `/api/biometrics/match`.
