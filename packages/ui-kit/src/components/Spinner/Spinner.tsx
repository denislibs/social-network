import s from './Spinner.module.css'
export function Spinner(props: { size?: number; class?: string }) {
  const size = () => props.size ?? 16
  return (
    <svg
      data-spinner
      class={`${s.root} ${props.class ?? ''}`}
      width={size()}
      height={size()}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-dasharray="30 12"
      />
    </svg>
  )
}
