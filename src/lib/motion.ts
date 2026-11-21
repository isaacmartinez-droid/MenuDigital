/** 'smooth' salvo que la persona haya pedido menos movimiento en su sistema. */
export function scrollBehavior(): ScrollBehavior {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  } catch {
    return 'auto'
  }
}
