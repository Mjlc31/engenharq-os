// Peças compartilhadas entre o console do KDS e o telão (/kds/tv).

// Canal de broadcast do Realtime: o console avisa "chamar pedido" e o telão destaca. Não grava nada no banco.
export const KDS_TV_CHANNEL = 'kds-tv';
export const KDS_TV_CALL_EVENT = 'call';

// SLA do balcão: verde < 3 min, amarelo 3 a 5 min, vermelho > 5 min.
export type SlaLevel = 'ok' | 'warning' | 'late';
export function slaLevel(elapsedSec: number): SlaLevel {
  if (elapsedSec > 300) return 'late';
  if (elapsedSec > 180) return 'warning';
  return 'ok';
}

export function formatElapsed(elapsedSec: number): string {
  const s = Math.max(0, Math.floor(elapsedSec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Telão é público: só primeiro nome + inicial do último sobrenome (LGPD), nunca matrícula, CPF ou foto.
const PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
export function publicName(fullName?: string | null): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Colaborador';
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  const surnames = parts.slice(1).filter(p => !PARTICLES.has(p.toLowerCase()));
  const last = surnames[surnames.length - 1];
  return last ? `${cap(parts[0])} ${last.charAt(0).toUpperCase()}.` : cap(parts[0]);
}

// Bipe de dois tons (Web Audio). O navegador só toca depois de uma interação do usuário com a página.
export function playKdsChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const tone = (freq: number, start: number, end: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(volume, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + end);
    };
    tone(783.99, 0, 0.3, 0.2);     // G5
    tone(1046.5, 0.15, 0.55, 0.25); // C6
  } catch (e) {
    console.warn('AudioContext chime blocked or not supported:', e);
  }
}
