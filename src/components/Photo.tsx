import { useState } from 'react'
import { cx } from '../lib/cx'

interface PhotoProps {
  src?: string
  alt?: string
  className?: string
  /** 'thumb' (listas, carrusel: versión de 400 px) o 'full' (detalle: 800 px). */
  size?: 'thumb' | 'full'
  /** Carga inmediata (para la foto principal visible al abrir). */
  eager?: boolean
  dimmed?: boolean
}

/** "/img/enchilada.webp" → "/img/enchilada-400.webp" (la genera `npm run images`). */
const thumbOf = (src: string) => (/\.webp$/i.test(src) ? src.replace(/\.webp$/i, '-400.webp') : src)

/**
 * Foto de plato con espacio reservado: el contenedor tiene el tamaño y el
 * fondo foto-vacía desde el inicio, así la carga no mueve el diseño.
 * En listas usa la miniatura liviana; si no existe, cae a la foto original.
 */
export function Photo({ src, alt = '', className, size = 'thumb', eager = false, dimmed = false }: PhotoProps) {
  const [thumbFailed, setThumbFailed] = useState(false)
  const url = src && size === 'thumb' && !thumbFailed ? thumbOf(src) : src

  return (
    <div className={cx('relative overflow-hidden bg-foto-vacia', className)}>
      {url && (
        <img
          src={url}
          alt={alt}
          width={size === 'thumb' ? 400 : 800}
          height={size === 'thumb' ? 400 : 800}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          onError={() => {
            if (url !== src) setThumbFailed(true)
          }}
          className={cx('absolute inset-0 h-full w-full object-cover', dimmed && 'opacity-40')}
        />
      )}
    </div>
  )
}
