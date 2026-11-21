import { useCallback, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { restaurant } from '../lib/catalog'
import { captureSource } from '../lib/source'
import { readItem, writeItem } from '../lib/storage'
import { WebWelcome } from './WebWelcome'

/** Ya se vio la bienvenida en este teléfono (no se borra al terminar un pedido). */
const WELCOME_KEY = `${restaurant.id}:web:bienvenida`

/**
 * Todas las pantallas de la web para llevar (/, /menu, /plato/…, /pedido…).
 * La primera vez en este teléfono, arriba de todo va W0 Bienvenida.
 */
export function WebLayout() {
  // Origen de la visita (?src=ig, fb, google o wa): viaja con el pedido para el panel del dueño.
  const { search } = useLocation()
  useState(() => captureSource(search))
  const [showWelcome, setShowWelcome] = useState(() => readItem('local', WELCOME_KEY) !== '1')
  const finishWelcome = useCallback(() => {
    writeItem('local', WELCOME_KEY, '1')
    setShowWelcome(false)
  }, [])

  return (
    <>
      {showWelcome && <WebWelcome onDone={finishWelcome} />}
      <div inert={showWelcome || undefined}>
        <Outlet />
      </div>
      <ScrollRestoration />
    </>
  )
}
