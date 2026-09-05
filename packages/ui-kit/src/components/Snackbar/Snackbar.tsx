import type { JSX } from 'solid-js'
import { createContext, createSignal, For, useContext } from 'solid-js'
import { Button } from '../Button/Button'
import s from './Snackbar.module.css'

type Snack = {
  id: number
  text: string
  appearance: 'default' | 'negative'
  action?: { label: string; onClick: () => void }
}
type Api = {
  show: (
    text: string,
    opts?: { action?: Snack['action']; duration?: number; appearance?: Snack['appearance'] },
  ) => void
}
const Ctx = createContext<Api>()

export function SnackbarHost(props: { children: JSX.Element }) {
  const [items, setItems] = createSignal<Snack[]>([])
  let seq = 0
  const api: Api = {
    show(text, opts) {
      const id = ++seq
      setItems((xs) => [
        ...xs,
        {
          id,
          text,
          appearance: opts?.appearance ?? 'default',
          ...(opts?.action ? { action: opts.action } : {}),
        },
      ])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), opts?.duration ?? 4000)
    },
  }
  return (
    <Ctx.Provider value={api}>
      {props.children}
      <div class={s.host} aria-live="polite">
        <For each={items()}>
          {(x) => (
            <div class={`${s.snack} ${x.appearance === 'negative' ? s.negative : ''}`}>
              <span class={s.text}>{x.text}</span>
              {x.action && (
                <Button
                  mode="tertiary"
                  size="s"
                  onClick={() => {
                    x.action?.onClick()
                    setItems((xs) => xs.filter((y) => y.id !== x.id))
                  }}
                >
                  {x.action.label}
                </Button>
              )}
            </div>
          )}
        </For>
      </div>
    </Ctx.Provider>
  )
}
export function useSnackbar(): Api {
  const api = useContext(Ctx)
  if (!api) throw new Error('useSnackbar outside SnackbarHost')
  return api
}
