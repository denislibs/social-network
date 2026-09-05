import { Show } from 'solid-js'
import { meshGradient } from '../../lib/mesh'
import s from './Avatar.module.css'

export type AvatarProps = {
  size?: 24 | 32 | 48 | 96 | 128
  src?: string | null
  seed?: number | string
  alt?: string
  online?: boolean
  class?: string
}
export function Avatar(props: AvatarProps) {
  const size = () => props.size ?? 48
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role="img" allows aria-label when applied
    <span
      class={`${s.root} ${props.class ?? ''}`}
      style={{
        width: `${size()}px`,
        height: `${size()}px`,
        'background-image': props.src ? undefined : meshGradient(props.seed ?? 0),
      }}
      role={!props.src && props.alt ? 'img' : undefined}
      aria-label={!props.src && props.alt ? props.alt : undefined}
      aria-hidden={!props.src && !props.alt ? 'true' : undefined}
    >
      <Show when={props.src}>
        {(src) => (
          <img class={s.img} src={src()} alt={props.alt ?? ''} width={size()} height={size()} />
        )}
      </Show>
      <Show when={props.online}>
        <i data-online class={s.online} />
      </Show>
    </span>
  )
}
