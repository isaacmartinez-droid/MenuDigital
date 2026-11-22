/** "/img/enchilada.webp" → "/img/enchilada-400.webp", la miniatura que genera `npm run images`. */
export const thumbOf = (src: string): string =>
  /^\/.*\.webp$/i.test(src) ? src.replace(/\.webp$/i, '-400.webp') : src
