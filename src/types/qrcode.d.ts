// Tipos mínimos de la librería qrcode (solo lo que usa el panel, P4b).
declare module 'qrcode' {
  export interface QRCodeMatrix {
    modules: { size: number; data: Uint8Array }
  }
  export function create(text: string, options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }): QRCodeMatrix
}
