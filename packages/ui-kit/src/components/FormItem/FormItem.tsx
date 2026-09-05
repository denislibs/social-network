import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import s from './FormItem.module.css'

export function FormItem(props: {
  top?: JSX.Element
  bottom?: JSX.Element
  status?: 'default' | 'error' | 'valid'
  children: JSX.Element
  class?: string
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control (Input/Textarea) is passed opaquely via `children`
    <label class={`${s.root} ${props.class ?? ''}`}>
      <Show when={props.top}>
        <span class={s.top}>{props.top}</span>
      </Show>
      {props.children}
      <Show when={props.bottom}>
        <span class={`${s.bottom} ${props.status === 'error' ? s.error : ''}`}>{props.bottom}</span>
      </Show>
    </label>
  )
}
