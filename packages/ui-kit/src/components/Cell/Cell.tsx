import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { Tappable } from '../Tappable/Tappable'
import s from './Cell.module.css'

export type CellProps = {
  before?: JSX.Element
  after?: JSX.Element
  subtitle?: JSX.Element
  children: JSX.Element
  href?: string
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>
  multiline?: boolean
  class?: string
}
export function Cell(props: CellProps) {
  const as = () => (props.href ? 'a' : props.onClick ? 'button' : 'div')
  const content = (
    <>
      <Show when={props.before}>
        <span class={s.before}>{props.before}</span>
      </Show>
      <span class={s.main}>
        <span class={`${s.title} ${props.multiline ? s.multiline : ''}`}>{props.children}</span>
        <Show when={props.subtitle}>
          <span class={s.subtitle}>{props.subtitle}</span>
        </Show>
      </span>
      <Show when={props.after}>
        <span class={s.after}>{props.after}</span>
      </Show>
    </>
  )
  return (
    <Show
      when={as() !== 'div'}
      fallback={<div class={`${s.root} ${props.class ?? ''}`}>{content}</div>}
    >
      <Tappable
        as={as()}
        class={`${s.root} ${props.class ?? ''}`}
        {...(props.href !== undefined ? { href: props.href } : {})}
        {...(props.onClick !== undefined ? { onClick: props.onClick } : {})}
      >
        {content}
      </Tappable>
    </Show>
  )
}
