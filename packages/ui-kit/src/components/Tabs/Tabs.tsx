import { For, Show } from 'solid-js'
import { Counter } from '../Counter/Counter'
import { Tappable } from '../Tappable/Tappable'
import s from './Tabs.module.css'

export type TabItem<T extends string = string> = { id: T; label: string; counter?: number }
export function Tabs<T extends string>(props: {
  value: T
  onChange: (id: T) => void
  items: TabItem<T>[]
  class?: string
}) {
  return (
    <div role="tablist" class={`${s.root} ${props.class ?? ''}`}>
      <For each={props.items}>
        {(item) => (
          <Tappable
            as="button"
            role="tab"
            aria-selected={props.value === item.id ? 'true' : 'false'}
            class={`${s.tab} ${props.value === item.id ? s.selected : ''}`}
            onClick={() => props.onChange(item.id)}
          >
            <span>{item.label}</span>
            <Show when={item.counter !== undefined}>
              <Counter size="s">{item.counter}</Counter>
            </Show>
          </Tappable>
        )}
      </For>
    </div>
  )
}
