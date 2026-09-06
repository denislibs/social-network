export class UnauthorizedBus {
  private readonly target = new EventTarget()
  emit(): void {
    this.target.dispatchEvent(new Event('unauthorized'))
  }
  on(handler: () => void): () => void {
    this.target.addEventListener('unauthorized', handler)
    return () => this.target.removeEventListener('unauthorized', handler)
  }
}
