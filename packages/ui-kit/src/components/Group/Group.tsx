import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import s from './Group.module.css'
export function Group(props: {
  header?: JSX.Element
  children: JSX.Element
  class?: string
  padded?: boolean
}) {
  return (
    <section class={`${s.root} ${props.padded ? s.padded : ''} ${props.class ?? ''}`}>
      <Show when={props.header}>
        <header class={s.header}>{props.header}</header>
      </Show>
      {props.children}
    </section>
  )
}
