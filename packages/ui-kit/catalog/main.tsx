import type { JSX } from 'solid-js'
import { createSignal, For } from 'solid-js'
import { render } from 'solid-js/web'
import '../src/tokens/tokens.css'
import '../src/tokens/typography.css'
import spriteUrl from '../src/icons/sprite.svg?url'
import {
  Avatar,
  Button,
  Cell,
  configureIcons,
  FormItem,
  ICON_NAMES,
  Icon,
  Input,
  Modal,
  Skeleton,
  SnackbarHost,
  type TabItem,
  Tabs,
  useSnackbar,
} from '../src/index'

configureIcons({ spriteUrl })

const BUTTON_MODES = ['primary', 'secondary', 'tertiary', 'outline'] as const
const BUTTON_SIZES = ['s', 'm', 'l'] as const
const AVATAR_SIZES = [24, 32, 48, 96, 128] as const
const INPUT_STATUSES = ['default', 'error', 'valid'] as const
const TAB_ITEMS: TabItem[] = [
  { id: 'all', label: 'Все' },
  { id: 'req', label: 'Заявки', counter: 3 },
  { id: 'muted', label: 'Отключено' },
]

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section style={{ margin: '0 0 40px' }}>
      <h2 class="vk-title3" style={{ margin: '0 0 12px' }}>
        {props.title}
      </h2>
      {props.children}
    </section>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light')
  const toggle = () => {
    const next = theme() === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.vk = next
  }
  return (
    <Button mode="secondary" onClick={toggle}>
      Тема: {theme() === 'light' ? 'светлая' : 'тёмная'}
    </Button>
  )
}

function ButtonGallery() {
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
      <For each={BUTTON_MODES}>
        {(mode) => (
          <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
            <For each={BUTTON_SIZES}>
              {(size) => (
                <Button mode={mode} size={size}>
                  {mode} {size}
                </Button>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}

function AvatarGallery() {
  return (
    <div style={{ display: 'flex', gap: '16px', 'align-items': 'flex-end' }}>
      <For each={AVATAR_SIZES}>
        {(size, i) => (
          <Avatar size={size} seed={i() + 1} online={i() === AVATAR_SIZES.length - 1} />
        )}
      </For>
    </div>
  )
}

function CellExample() {
  return (
    <div style={{ 'max-width': '360px' }}>
      <Cell
        before={<Avatar size={48} seed={7} />}
        after={<Icon name="chevron_right_20" label="Открыть" />}
        subtitle="онлайн"
      >
        Денис Кораблев
      </Cell>
    </div>
  )
}

function TabsExample() {
  const [value, setValue] = createSignal<string>('all')
  return <Tabs value={value()} onChange={setValue} items={TAB_ITEMS} />
}

function InputExamples() {
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px', 'max-width': '360px' }}>
      <For each={INPUT_STATUSES}>
        {(status) => (
          <FormItem
            top={`status: ${status}`}
            bottom={status === 'error' ? 'Проверьте поле' : undefined}
            status={status}
          >
            <Input status={status} placeholder="Логин" />
          </FormItem>
        )}
      </For>
    </div>
  )
}

function ModalExample() {
  const [open, setOpen] = createSignal(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть модалку</Button>
      <Modal open={open()} onClose={() => setOpen(false)} title="Выйти?">
        <p style={{ margin: 0 }}>Содержимое модального окна.</p>
      </Modal>
    </>
  )
}

function SnackbarTrigger() {
  const snack = useSnackbar()
  return (
    <Button
      onClick={() =>
        snack.show('Ссылка скопирована', {
          action: { label: 'Отменить', onClick: () => {} },
        })
      }
    >
      Показать снекбар
    </Button>
  )
}

function SkeletonExample() {
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', 'max-width': '280px' }}>
      <Skeleton height={16} width="80%" />
      <Skeleton height={16} width="60%" />
      <Skeleton height={96} radius={12} />
    </div>
  )
}

function IconGrid() {
  const names = ICON_NAMES.slice(0, 200)
  return (
    <div
      style={{
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fill, minmax(88px, 1fr))',
        gap: '12px',
      }}
    >
      <For each={names}>
        {(name) => (
          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              gap: '6px',
              padding: '8px',
              'text-align': 'center',
            }}
          >
            <Icon name={name} />
            <span
              style={{
                'font-size': '10px',
                'word-break': 'break-all',
                color: 'var(--vk-text_secondary)',
              }}
            >
              {name}
            </span>
          </div>
        )}
      </For>
    </div>
  )
}

function App() {
  return (
    <SnackbarHost>
      <div style={{ padding: '24px', 'max-width': '960px', margin: '0 auto' }}>
        <div
          style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}
        >
          <h1 class="vk-display_title3" style={{ margin: '0 0 24px' }}>
            ui-kit catalog
          </h1>
          <ThemeToggle />
        </div>
        <Section title="Button">
          <ButtonGallery />
        </Section>
        <Section title="Avatar">
          <AvatarGallery />
        </Section>
        <Section title="Cell">
          <CellExample />
        </Section>
        <Section title="Tabs">
          <TabsExample />
        </Section>
        <Section title="Input / FormItem">
          <InputExamples />
        </Section>
        <Section title="Modal">
          <ModalExample />
        </Section>
        <Section title="Snackbar">
          <SnackbarTrigger />
        </Section>
        <Section title="Skeleton">
          <SkeletonExample />
        </Section>
        <Section title="Иконки (первые 200)">
          <IconGrid />
        </Section>
      </div>
    </SnackbarHost>
  )
}

const root = document.getElementById('root')
if (root) render(() => <App />, root)
