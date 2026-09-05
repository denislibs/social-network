import s from './Skeleton.module.css'

export function Skeleton(props: {
  width?: string | number
  height?: string | number
  radius?: string | number
  class?: string
}) {
  const px = (v: string | number | undefined, d: string) =>
    v === undefined ? d : typeof v === 'number' ? `${v}px` : v
  return (
    <span
      class={`${s.root} ${props.class ?? ''}`}
      style={{
        width: px(props.width, '100%'),
        height: px(props.height, '16px'),
        'border-radius': px(props.radius, '6px'),
      }}
      aria-hidden="true"
    />
  )
}
