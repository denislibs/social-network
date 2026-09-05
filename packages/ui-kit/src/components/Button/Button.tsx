import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'
import { Spinner } from '../Spinner/Spinner'
import { Tappable } from '../Tappable/Tappable'
import s from './Button.module.css'

export type ButtonProps = {
  mode?: 'primary' | 'secondary' | 'tertiary' | 'outline'
  size?: 's' | 'm' | 'l'
  appearance?: 'accent' | 'neutral' | 'negative'
  stretched?: boolean
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  before?: JSX.Element
  after?: JSX.Element
  class?: string
  children?: JSX.Element
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    'mode',
    'size',
    'appearance',
    'stretched',
    'loading',
    'disabled',
    'type',
    'before',
    'after',
    'class',
    'children',
    'onClick',
  ])
  const mode = () => local.mode ?? 'primary'
  const classes = () =>
    [
      s.root,
      s[`mode-${mode()}`],
      s[`size-${local.size ?? 'm'}`],
      s[local.appearance ?? 'accent'],
      local.stretched ? s.stretched : '',
      local.loading ? s.loading : '',
      local.class ?? '',
    ]
      .join(' ')
      .trim()
  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (e) => {
    if (local.loading || local.disabled) return
    if (typeof local.onClick === 'function') {
      local.onClick(e as MouseEvent & { currentTarget: HTMLButtonElement; target: Element })
    }
  }
  return (
    <Tappable
      as="button"
      hoverMode={mode() === 'primary' ? 'none' : 'background'}
      type={local.type ?? 'button'}
      class={classes()}
      disabled={Boolean(local.disabled || local.loading)}
      aria-busy={local.loading ? 'true' : undefined}
      onClick={handleClick}
      {...rest}
    >
      <Show when={local.before}>
        <span class={s.slot}>{local.before}</span>
      </Show>
      <span class={s.label}>{local.children}</span>
      <Show when={local.after}>
        <span class={s.slot}>{local.after}</span>
      </Show>
      <Show when={local.loading}>
        <span class={s.spinner}>
          <Spinner />
        </span>
      </Show>
    </Tappable>
  )
}
