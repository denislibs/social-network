import type { JSX, ValidComponent } from 'solid-js'
import { Dynamic } from 'solid-js/web'
export type TypographyRole =
  | 'title1'
  | 'display_title1'
  | 'display_title2'
  | 'title2'
  | 'display_title3'
  | 'title3'
  | 'display_title4'
  | 'headline1'
  | 'headline'
  | 'text'
  | 'headline2'
  | 'paragraph'
  | 'subhead'
  | 'footnote'
  | 'footnote_caps'
  | 'caption1'
  | 'caption1_caps'
  | 'caption2'
  | 'caption2_caps'
  | 'caption3'
  | 'caption3_caps'
export function Typography(props: {
  role: TypographyRole
  as?: ValidComponent
  class?: string
  children: JSX.Element
  muted?: boolean
}) {
  return (
    <Dynamic
      component={props.as ?? 'span'}
      class={`vk-${props.role} ${props.class ?? ''}`}
      style={props.muted ? { color: 'var(--vk-text_secondary)' } : undefined}
    >
      {props.children}
    </Dynamic>
  )
}
