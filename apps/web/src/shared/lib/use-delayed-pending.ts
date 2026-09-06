import { useEffect, useState } from 'react'

/**
 * Delays showing a pending/loading state by `delayMs` so brief loads never flash a
 * skeleton. Returns `false` immediately; flips to `true` only if still pending once
 * the delay elapses, and drops back to `false` immediately as soon as `isPending`
 * turns `false`.
 */
export function useDelayedPending(isPending: boolean, delayMs = 150): boolean {
  const [show, setShow] = useState(false)

  // "Adjusting state when a prop changes" pattern (see react.dev): storing the previous
  // prop in state (not a ref) and comparing during render lets the reset happen in the
  // same commit instead of waiting for an effect to run afterwards.
  const [prevPending, setPrevPending] = useState(isPending)
  if (prevPending !== isPending) {
    setPrevPending(isPending)
    if (!isPending && show) setShow(false)
  }

  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(timer)
  }, [isPending, delayMs])

  return show
}
