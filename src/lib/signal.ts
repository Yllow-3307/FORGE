declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let ctx: AudioContext | null = null;

/** Débloque le contexte audio. À appeler dans un gestionnaire de clic utilisateur :
 * iOS Safari refuse toute lecture audio non initiée par un geste. */
export function amorcerAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
      }
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // Silencieux
  }
}

/** Un bip. freq en Hz, duree en ms. */
function bip(freq: number, duree: number, depart: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, depart);

  const t = depart;
  const dSec = duree / 1000;

  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(0.18, t + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + dSec);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + dSec);
}

/** Trois bips à 880 Hz, 200 ms, espacés de 300 ms. */
export function signalFin(): void {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
      }
    }
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      bip(880, 200, t + i * 0.5);
    }
  } catch {
    // try/catch silencieux : l'audio ne doit jamais casser la séance.
  }
}

/** Vibration, sans throw si l'API est absente (iOS Safari ne l'a pas). */
export function vibrer(motif: number | number[] = [200, 100, 200, 100, 200]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(motif);
  }
}
