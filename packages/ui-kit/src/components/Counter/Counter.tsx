import type { JSX } from 'solid-js'
import s from './Counter.module.css'
export function Counter(props: {
  mode?: 'primary' | 'secondary' | 'prominent'
  size?: 's' | 'm'
  children: JSX.Element
  class?: string
}) {
  return (
    <span
      class={`${s.root} ${s[props.mode ?? 'secondary']} ${s[`size-${props.size ?? 'm'}`]} ${props.class ?? ''}`}
    >
      {props.children}
    </span>
  )
}
