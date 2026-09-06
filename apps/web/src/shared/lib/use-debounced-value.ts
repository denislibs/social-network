import { useEffect, useState } from 'react'

/**
 * Real, timer-based debounce: returns `value` unchanged at first, then only ever catches up
 * `delayMs` after the last change. Typing "durov" one keystroke at a time therefore produces a
 * single settled value instead of five.
 *
 * `useDeferredValue` is not a substitute here: it lags one render, so React catches up as soon as
 * it is idle — which, on a fast machine with a fast connection, is between every keystroke. What
 * we want is a request floor, not a rendering-priority hint.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (Object.is(debounced, value)) return
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs, debounced])

  return debounced
}
