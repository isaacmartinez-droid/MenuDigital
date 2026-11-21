import { cx } from '../lib/cx'

interface PhotoProps {
  src?: string
  alt?: string
  className?: string
  /** Carga inmediata (para la foto principal visible al abrir). */
  eager?: boolean
  dimmed?: boolean
}

/**
 * Foto de plato con espacio reservado: el contenedor tiene el tamaño y el
 * fondo foto-vacía desde el inicio, así la carga no mueve el diseño.
 */
export function Photo({ src, alt = '', className, eager = false, dimmed = false }: PhotoProps) {
  return (
    <div className={cx('relative overflow-hidden bg-foto-vacia', className)}>
      {src && (
        <img
          src={src}
          alt={alt}
          width={800}
          height={800}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          className={cx('absolute inset-0 h-full w-full object-cover', dimmed && 'opacity-40')}
        />
      )}
    </div>
  )
}
