import type { JSX } from 'solid-js'
import { onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Icon } from '../../icons/Icon'
import { Tappable } from '../Tappable/Tappable'
import s from './Modal.module.css'

export function Modal(props: {
  open: boolean
  onClose: () => void
  title?: string
  size?: 's' | 'm' | 'l'
  children: JSX.Element
}) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.open) props.onClose()
  }
  onMount(() => document.addEventListener('keydown', onKey))
  onCleanup(() => document.removeEventListener('keydown', onKey))
  return (
    <Show when={props.open}>
      <Portal>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay closes on click-outside; Escape is handled globally via document keydown */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard dismissal is handled by the document-level Escape listener above */}
        <div
          class={s.overlay}
          data-testid="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onClose()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={props.title}
            class={`${s.card} ${s[`size-${props.size ?? 's'}`] ?? ''}`}
          >
            <Show when={props.title}>
              <header class={s.header}>
                <span class="vk-title3">{props.title}</span>
                <Tappable
                  as="button"
                  hoverMode="opacity"
                  aria-label="Закрыть"
                  onClick={props.onClose}
                >
                  <Icon name="cancel_24" />
                </Tappable>
              </header>
            </Show>
            <div class={s.body}>{props.children}</div>
          </div>
        </div>
      </Portal>
    </Show>
  )
}
