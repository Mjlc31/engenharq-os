# Relatório de Avaliação Mobile - EngenharQ OS

**Role**: Especialista Mobile (React Native/Flutter)
**Data da Avaliação**: 18/08/2026
**Framework Identificado**: React Native (Expo SDK 52, Expo Router)

## 1. Avaliação de Performance
- **Otimização de Listas**: Embora o projeto seja embrionário e ainda não possua listas complexas, é mandatório, conforme as diretrizes do `mobile-design`, que listagens futuras de EPIs ou trabalhadores utilizem `FlatList` ou `FlashList`. Funções como `renderItem` precisarão de `useCallback` e envelopamento com `React.memo` para evitar recálculos e gargalos de memória.
- **Animações e JS Thread**: Quando animações entrarem, devem ser aceleradas por hardware (ex: `useNativeDriver: true` ou `react-native-reanimated`), alterando apenas propriedades como `transform` e `opacity` para garantir os 60fps.

## 2. UI / UX (Touch-first)
- **Alvos de Toque (Touch Targets)**: A tela principal `index.tsx` atende perfeitamente à recomendação mínima de alvos de toque, possuindo altura mínima de 48px (`minHeight: 48` e `paddingVertical: 16`), contemplando bem a psicomotricidade descrita na Lei de Fitts (44pt iOS / 48dp Android).
- **Zonas de Polegar (Thumb Zone)**: O botão primário precisará sempre ser planejado levando em consideração a ergonomia do usuário portando o celular com apenas uma mão.
- **Safe Area**: Atualmente o arquivo `index.tsx` faz uso de `View` regular para o container da página. O ideal seria adotar `SafeAreaView` oriundo de `react-native-safe-area-context` (já instalado), assegurando que o conteúdo não colida com "notches" ou barra de navegação no iOS e Android.
- **Acessibilidade**: Foi incluído o `accessibilityLabel` no botão principal. Excelente prática e deve continuar em todos os demais elementos clicáveis e inputs.
- **Falta de Dark Mode / Cores Dinâmicas**: Há valores estáticos Hex (`#f9fafb`, `#ef4444`) e o sistema de cores do Expo (`userInterfaceStyle: "automatic"`) ainda não foi alavancado via tema, o que não obedece ao requisito de design battery-aware em telas OLED caso o usuário utilize Dark Mode.

## 3. Segurança (Crítico)
- **Armazenamento Inseguro de Sessão**: Esta é a violação mais grave encontrada neste diagnóstico prévio. O arquivo `lib/supabase.ts` gerencia o cache e a sessão do Supabase de autenticação através do `AsyncStorage`. Segundo as diretrizes do `mobile-design`, salvar tokens no AsyncStorage é um pecado de segurança, pois é de fácil leitura em dispositivos "rooted" ou com jailbreak. **Correção Necessária**: Utilizar o `expo-secure-store` (que já consta no `package.json`!) criando um adaptador de storage antes de passar ao cliente do Supabase.

## 4. Offline-Capability
- **Mecanismos de Sincronização**: O app declara intenção de realizar "Inspeção Offline" na interface, mas sob a estrutura atual de pacotes e setup de Supabase via API regular (com Axios/Fetch via SDK), não dispõe das fundações de persistência robusta local e background sync. 
- **Recomendação**: Será necessário incorporar soluções que suportem uma arquitetura "Local-First", como `WatermelonDB`, ou `expo-sqlite` aliado a uma abstração de estados e filas no background, para garantir que as inspeções da EngenharQ OS continuem sem gargalos na ausência de rede (graceful degradation).

## 5. Decisões Multiplataforma
- **Navegação**: Emprego adequado do `expo-router` no `_layout.tsx`, porém deve-se ter o cuidado para que modais e navegação preservem a naturalidade (ex: swipe back no iOS vs hardware back do Android).
- **Feedbacks Interativos**: Utilizou-se `TouchableOpacity`. Num modelo unificado e polido de multi-plataforma, é sugerido utilizar a API `Pressable`, aplicando comportamentos condicionais (`android_ripple` nativo e alteração de opacidade simples em iOS) como um componente base reutilizável.

---

## 🛠️ Plano de Ação Sugerido
1. **Refatorar Supabase Auth**: Criar a implementação wrapper baseada no `expo-secure-store` no lugar de `AsyncStorage` no `lib/supabase.ts`.
2. **Setup SafeArea e Tema**: Implementar Layout que resguarde o conteúdo na SafeArea da tela e providenciar o alicerce para alternância Light/Dark Mode no `_layout.tsx`.
3. **Criar UI Kit Mobile Base**: Estender componentes core (`Button`, `Card`, `ListItem`) blindando o uso das melhores práticas de usabilidade (touch targets, accesibility, ripple) para o desenvolvimento em escala das features do projeto.
4. **Definir Estrutura Offline**: Eleger uma base sólida de banco de dados offline-first para possibilitar a coleta de vistorias sem interrupção para o engenheiro ou inspetor no ambiente fabril.
