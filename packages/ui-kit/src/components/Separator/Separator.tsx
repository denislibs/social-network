import s from './Separator.module.css'
export function Separator(props: { wide?: boolean; class?: string }) {
  return <hr class={`${s.root} ${props.wide ? s.wide : ''} ${props.class ?? ''}`} />
}
