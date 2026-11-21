import { Star } from 'lucide-react'

/** Cinco estrellas llenas (calificación de Google, decorativas: el número va al lado). */
export function GoogleStars({ size }: { size: number }) {
  return (
    <span aria-hidden className="flex gap-1 text-ambar">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  )
}
