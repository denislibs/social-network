import type { JSX, ValidComponent } from 'solid-js'
import { splitProps } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import s from './Tappable.module.css'

export type TappableProps = {
  as?: ValidComponent
  hoverMode?: 'background' | 'opacity' | 'none'
  disabled?: boolean
  class?: string
  children?: JSX.Element
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>
} & Record<string, unknown>

export function Tappable(props: TappableProps) {
  const [local, rest] = splitProps(props, ['as', 'hoverMode', 'disabled', 'class', 'children'])
  const mode = () => local.hoverMode ?? 'background'
  const onPointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (e) => {
    if (local.disabled) return
    const host = e.currentTarget
    const rect = host.getBoundingClientRect()
    const wave = document.createElement('span')
    wave.className = s.wave ?? ''
    wave.dataset.wave = ''
    const left = e.clientX - rect.left
    const top = e.clientY - rect.top
    wave.style.left = `${Number.isFinite(left) ? left : 0}px`
    wave.style.top = `${Number.isFinite(top) ? top : 0}px`
    wave.addEventListener('animationend', () => wave.remove(), { once: true })
    host.appendChild(wave)
  }
  return (
    <Dynamic
      component={(local.as ?? 'div') as ValidComponent}
      class={[
        s.root,
        mode() === 'background' ? s.bg : mode() === 'opacity' ? s.op : '',
        local.disabled ? s.disabled : '',
        local.class ?? '',
      ]
        .join(' ')
        .trim()}
      aria-disabled={local.disabled ? 'true' : undefined}
      disabled={local.as === 'button' && local.disabled ? true : undefined}
      onPointerDown={onPointerDown}
      {...rest}
    >
      {local.children}
    </Dynamic>
  )
}
