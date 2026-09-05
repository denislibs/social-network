const target = new EventTarget()

export function emitUnauthorized(): void {
  target.dispatchEvent(new Event('unauthorized'))
}

export function onUnauthorized(handler: () => void): () => void {
  target.addEventListener('unauthorized', handler)
  return () => target.removeEventListener('unauthorized', handler)
}
