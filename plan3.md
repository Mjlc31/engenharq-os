# Plano 3 - Fix Import/Export

## 1. Baixar Modelo sem extensão (.csv)
- O navegador está baixando o arquivo com o ID do Blob (ex: `e1f16493...`) ao invés do nome estipulado.
- Causa comum: O uso de `link.setAttribute('download', 'nome.csv')` pode falhar em algumas versões de React/Blink se o elemento não for tratado estritamente.
- Solução: Modificar `src/hooks/useWorkers.ts` para usar a propriedade direta `link.download = 'modelo.csv'`.

## 2. Botão Importar não funciona
- A tag `<input type="file" className="hidden" />` tem `display: none`. Alguns navegadores bloqueiam o clique via `label` por segurança quando o input está totalmente invisível/desabilitado visualmente pelo CSS.
- Solução: Alterar no arquivo `src/pages/Workers.tsx` a classe do input de `hidden` para `sr-only`. Isso torna o elemento oculto visualmente mas mantido acessível ao clique indireto via label no DOM.

## 3. Execução
- Disparo paralelo via `/dispatching-parallel-agents`!
