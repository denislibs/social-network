import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import { spriteUrl } from './icons.config'
import type { IconName } from './names'

export type IconProps = {
  name: IconName
  size?: number
  label?: string
  class?: string
  style?: JSX.CSSProperties | string
}

export function Icon(props: IconProps) {
  const [local, rest] = splitProps(props, ['name', 'size', 'label', 'class'])
  const size = () => local.size ?? Number(local.name.match(/_(\d+)$/)?.[1] ?? 24)
  return (
    <svg
      class={`vk-icon${local.class ? ` ${local.class}` : ''}`}
      width={size()}
      height={size()}
      role={local.label ? 'img' : undefined}
      aria-label={local.label}
      aria-hidden={local.label ? undefined : 'true'}
      {...rest}
    >
      <use href={`${spriteUrl()}#${local.name}`} />
    </svg>
  )
}
