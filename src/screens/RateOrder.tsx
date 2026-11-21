import { useId, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ExternalLink, Frown, Smile } from 'lucide-react'
import { PageHeader } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { NoticeBanner } from '../components/NoticeBanner'
import { Photo } from '../components/Photo'
import { StarRating } from '../components/StarRating'
import { rateDishes } from '../lib/api'
import { TAKEOUT } from '../lib/channel'
import { getDish, restaurant } from '../lib/catalog'
import { cx } from '../lib/cx'
import { isRated, markRated, reviewsToSend, type DishEntry, type Overall } from '../lib/reviews'
import { fmt, t } from '../lib/text'
import { useGoBack } from '../lib/useGoBack'
import { paths } from '../lib/useMesa'
import { useComandas } from '../store/comandas'

const ratedText = (n: number) => (n === 1 ? t.web.ratedOne : fmt(t.web.ratedMany, { n }))

/**
 * W10 Calificación y W10b ¡Gracias! (para llevar). Es la única vía para que
 * quien pide para llevar deje reseña (no ve la placa del local).
 * Como en la mesa: con hasta ratings.perDishMax platos, estrellas por plato
 * (con un solo plato queda igual al Figma: tarjeta, estrellas grandes y
 * "Contanos más"); con más, "¿Todo estuvo rico?". Al enviar, W10b invita a
 * dejar la reseña en Google.
 */
export function RateOrder() {
  const navigate = useNavigate()
  const { comandaId = '' } = useParams()
  const goBack = useGoBack(paths.tracking(TAKEOUT, comandaId))
  const comanda = useComandas(TAKEOUT, (s) => s.comandas.find((c) => c.id === comandaId))
  const commentId = useId()
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [overall, setOverall] = useState<Overall>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  // Si ya calificó esta orden (o recién envía), se ve W10b.
  const [sent, setSent] = useState(() => isRated(comandaId))

  if (!comanda) return <Navigate to={paths.menu(TAKEOUT)} replace />

  const dishes: DishEntry[] = [...new Map(comanda.items.map((i) => [i.dishId, i.name])).entries()]
  const perDish = dishes.length <= restaurant.ratings.perDishMax
  const single = dishes.length === 1
  const canSend = perDish ? Object.keys(ratings).length > 0 : overall !== null

  const send = async () => {
    if (!canSend || sending) return
    setSending(true)
    const text = comment.trim() || undefined
    // Con un plato, el comentario va en su reseña; con varios, como comentario general.
    const comments = single && text ? { [dishes[0][0]]: text } : {}
    const reviews = reviewsToSend(dishes, ratings, comments, overall, comanda.customerName)
    try {
      await rateDishes(TAKEOUT, reviews, single ? undefined : text)
    } catch {
      /* la calificación no bloquea: igual se agradece */
    }
    markRated(comandaId)
    setSending(false)
    setSent(true)
    window.scrollTo({ top: 0 })
  }

  const dishCard = (dishId: string, name: string, readOnly: boolean) => {
    const stars = ratings[dishId] ?? 0
    return (
      <li key={dishId} className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-grande border border-borde bg-tarjeta p-3">
          <Photo src={getDish(dishId)?.image} className="size-14 shrink-0 rounded-tarjeta" />
          <div className="min-w-0 flex-1">
            <p className="text-dish text-texto">{name}</p>
            <p className="text-small text-texto-2">{stars ? ratedText(stars) : t.web.rateTap}</p>
          </div>
        </div>
        {(!readOnly || stars > 0) && (
          <StarRating
            value={stars}
            onChange={readOnly ? undefined : (n) => setRatings((r) => ({ ...r, [dishId]: n }))}
            label={fmt(t.bill.rateDish, { dish: name })}
            size={36}
            className="justify-center gap-3 self-center"
          />
        )}
      </li>
    )
  }

  return (
    <>
      <div className="app-shell desktop:max-w-[834px]">
        <PageHeader title={sent ? t.web.thanksTitle : t.web.rateTitle} onBack={goBack} />
        <main className="flex flex-col gap-4 px-4 pt-2 tablet:px-8">
          {sent ? (
            <>
              {/* W10b: lo calificado, el aviso y la invitación a Google. */}
              {perDish && Object.keys(ratings).length > 0 && (
                <ul className="flex flex-col gap-4">
                  {dishes.filter(([id]) => ratings[id]).map(([id, name]) => dishCard(id, name, true))}
                </ul>
              )}
              <NoticeBanner
                role="status"
                tone="positivo"
                title={t.web.rateReceivedTitle}
                body={t.web.rateReceivedBody}
              />
              <section
                aria-labelledby="google"
                className="flex flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-4"
              >
                <h2 id="google" className="text-section text-texto">
                  {t.web.googleTitle}
                </h2>
                <p className="text-body text-texto-2">{t.web.googleBody}</p>
                <a
                  href={restaurant.web.google.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-on-dark mt-1 inline-flex h-[52px] items-center justify-center gap-2 rounded-grande bg-verde px-4 text-button text-blanco"
                >
                  {t.web.googleCta}
                  <ExternalLink size={18} strokeWidth={2} aria-hidden />
                  <span className="sr-only"> {t.web.newTab}</span>
                </a>
              </section>
            </>
          ) : perDish ? (
            <>
              <ul className="flex flex-col gap-5">{dishes.map(([id, name]) => dishCard(id, name, false))}</ul>
              <div>
                <label htmlFor={commentId} className="text-dish text-texto">
                  {t.web.rateComment}
                </label>
                <textarea
                  id={commentId}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.web.rateCommentPlaceholder}
                  maxLength={280}
                  className="mt-2 block h-24 w-full resize-none rounded-tarjeta border border-borde bg-tarjeta px-3 pt-3 text-body text-texto outline-none placeholder:text-texto-2 focus:border-2 focus:border-verde"
                />
              </div>
            </>
          ) : (
            <>
              {/* Muchos platos: una sola pregunta, como en la mesa. */}
              <section aria-labelledby="todo-rico">
                <h2 id="todo-rico" className="text-section text-texto">
                  {t.bill.overallTitle}
                </h2>
                <div role="group" aria-labelledby="todo-rico" className="mt-3 grid grid-cols-2 gap-2">
                  {(['rico', 'mal'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={overall === value}
                      onClick={() => {
                        setOverall(value)
                        if (value === 'rico') setRatings({})
                      }}
                      className={cx(
                        'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-grande border px-3 text-dish',
                        overall === value ? 'border-2 border-verde bg-verde-suave text-verde' : 'border-borde bg-tarjeta text-texto',
                      )}
                    >
                      {value === 'rico' ? <Smile size={18} aria-hidden /> : <Frown size={18} aria-hidden />}
                      {value === 'rico' ? t.bill.overallYes : t.bill.overallNo}
                    </button>
                  ))}
                </div>
                {overall === 'mal' && (
                  <div className="mt-4">
                    <p id="que-no" className="text-small font-semibold text-texto">
                      {t.bill.overallWhich}
                    </p>
                    <div role="group" aria-labelledby="que-no" className="mt-2 flex flex-wrap gap-2">
                      {dishes.map(([id, name]) => {
                        const bad = Boolean(ratings[id])
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={bad}
                            onClick={() =>
                              setRatings((r) => {
                                const next = { ...r }
                                if (bad) delete next[id]
                                else next[id] = 2
                                return next
                              })
                            }
                            className={cx(
                              'min-h-10 rounded-completo px-3.5 text-small font-medium',
                              bad ? 'bg-promo text-blanco' : 'border border-borde bg-tarjeta text-texto',
                            )}
                          >
                            {name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>
              <div>
                <label htmlFor={commentId} className="text-dish text-texto">
                  {t.web.rateComment}
                </label>
                <textarea
                  id={commentId}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={overall === 'mal' ? t.bill.overallCommentNo : t.web.rateCommentPlaceholder}
                  maxLength={280}
                  className="mt-2 block h-24 w-full resize-none rounded-tarjeta border border-borde bg-tarjeta px-3 pt-3 text-body text-texto outline-none placeholder:text-texto-2 focus:border-2 focus:border-verde"
                />
              </div>
            </>
          )}
          <DockSpacer />
        </main>
      </div>

      <BottomDock className="desktop:max-w-[834px]">
        {sent ? (
          <Button block variant="secondary" onClick={() => navigate(paths.menu(TAKEOUT))}>
            {t.web.backToMenu}
          </Button>
        ) : (
          <Button block onClick={send} disabled={!canSend || sending}>
            {sending ? t.web.rateSending : t.web.rateSend}
          </Button>
        )}
      </BottomDock>
    </>
  )
}
