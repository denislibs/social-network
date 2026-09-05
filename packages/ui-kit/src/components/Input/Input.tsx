import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'
import s from './Input.module.css'

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  before?: JSX.Element
  after?: JSX.Element
  status?: 'default' | 'error' | 'valid'
}
export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['before', 'after', 'status', 'class'])
  return (
    <span class={`${s.root} ${s[local.status ?? 'default'] ?? ''} ${local.class ?? ''}`}>
      <Show when={local.before}>
        <span class={s.slot}>{local.before}</span>
      </Show>
      <input
        class={s.input}
        aria-invalid={local.status === 'error' ? 'true' : undefined}
        {...rest}
      />
      <Show when={local.after}>
        <span class={s.slot}>{local.after}</span>
      </Show>
    </span>
  )
}
