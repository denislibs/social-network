import '@vkc/ui-kit/tokens.css'
import '@vkc/ui-kit/typography.css'
import { configureIcons } from '@vkc/ui-kit'
import spriteUrl from '@vkc/ui-kit/icons/sprite.svg?url'
import { render } from 'solid-js/web'
import { App } from './App'
import { applySavedTheme } from './theme'

configureIcons({ spriteUrl })
applySavedTheme()

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')
render(() => <App />, root)
