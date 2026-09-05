import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import s from '../Input/Input.module.css'

export type TextareaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  status?: 'default' | 'error' | 'valid'
}
export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ['status', 'class', 'rows'])
  return (
    <span
      class={`${s.root} ${s[local.status ?? 'default'] ?? ''} ${local.class ?? ''}`}
      style={{ height: 'auto', padding: '8px 12px' }}
    >
      <textarea
        class={s.input}
        rows={local.rows ?? 3}
        style={{ resize: 'vertical', 'line-height': '20px' }}
        aria-invalid={local.status === 'error' ? 'true' : undefined}
        {...rest}
      />
    </span>
  )
}
