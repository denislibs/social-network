import { createSignal } from 'solid-js'

const [spriteUrl, setSpriteUrl] = createSignal<string>('')

export function configureIcons(opts: { spriteUrl: string }) {
  setSpriteUrl(opts.spriteUrl)
}

export { spriteUrl }
