/**
 * Sonido corto para la cocina cuando entra un pedido. Los navegadores no dejan
 * sonar nada hasta que la persona toca la pantalla, así que el sonido se activa
 * con el primer toque (unlockSound) y recién ahí suena.
 */
let context: AudioContext | null = null
const listeners = new Set<() => void>()

export const soundReady = () => context?.state === 'running'

/** Activa el sonido (llamar desde un toque). */
export function unlockSound(): void {
  try {
    context ??= new AudioContext()
    void context.resume().then(() => listeners.forEach((l) => l()))
  } catch {
    /* sin audio en este navegador */
  }
}

/** Avisa cuando el sonido queda activado. */
export function onSoundReady(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Dos tonos cortos ("din-don"). */
export function beep(): void {
  if (!context || context.state !== 'running') return
  const start = context.currentTime
  for (const [i, freq] of [880, 660].entries()) {
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start + i * 0.18)
    gain.gain.exponentialRampToValueAtTime(0.25, start + i * 0.18 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.18 + 0.16)
    osc.connect(gain).connect(context.destination)
    osc.start(start + i * 0.18)
    osc.stop(start + i * 0.18 + 0.17)
  }
}
