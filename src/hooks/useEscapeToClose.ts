import { useEffect } from 'react';

// Esc fecha o modal do topo acionando o botão "Fechar" dele (o último visível no DOM).
// shortcut: depende de aria-label="Fechar" nos botões X dos modais; trocar por um <Modal> compartilhado quando os ~40 modais forem unificados.
export function useEscapeToClose() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const closeButtons = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label="Fechar"]:not(:disabled)')]
        .filter(button => button.getClientRects().length > 0);
      const topmost = closeButtons[closeButtons.length - 1];
      if (!topmost) return;
      event.preventDefault();
      topmost.click();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
