import React, { useEffect, useRef } from 'react';

interface ModalProps {
  onClose: () => void;
  /** Bloqueia o Esc enquanto algo está sendo salvo (mesma regra do botão Fechar desabilitado). */
  closeDisabled?: boolean;
  /** Clique no fundo fecha. Só para visualizadores (foto, assinatura); nunca em formulário. */
  closeOnBackdrop?: boolean;
  /** Classes do fundo (overlay); cada tela mantém o visual que já tinha. */
  className: string;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// Pilha de modais abertos: Esc e Tab só valem para o do topo (há modais abertos sobre outros).
const stack: HTMLElement[] = [];

// Diálogo acessível: role/aria-modal, título ligado ao 1º cabeçalho, foco preso e devolvido, Esc e rolagem travada.
// Clicar no fundo NÃO fecha, para não perder formulário preenchido.
export function Modal({ onClose, closeDisabled = false, closeOnBackdrop = false, className, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(closeDisabled);
  onCloseRef.current = onClose;
  disabledRef.current = closeDisabled;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    stack.push(node);
    document.body.style.overflow = 'hidden';

    const heading = node.querySelector<HTMLElement>('h1, h2, h3');
    if (heading) {
      heading.id ||= `modal-title-${Math.random().toString(36).slice(2, 8)}`;
      node.setAttribute('aria-labelledby', heading.id);
    }
    (node.querySelector<HTMLElement>('[autofocus]') ?? node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== node) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!disabledRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.getClientRects().length > 0);
      if (items.length === 0) { event.preventDefault(); node.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(node), 1);
      if (stack.length === 0) document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className={`${className} focus:outline-none`}
      onClick={closeOnBackdrop ? event => { if (event.target === event.currentTarget) onClose(); } : undefined}
    >
      {children}
    </div>
  );
}
