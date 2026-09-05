import { AdaptivityProvider, AppRoot, ConfigProvider } from '@vkontakte/vkui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { useColorScheme } from '@/shared/lib'
import { QueryProvider } from './providers/QueryProvider'
import { router } from './router'
import './styles/global.css'

function App() {
  const { scheme } = useColorScheme()
  return (
    <ConfigProvider colorScheme={scheme} platform="vkcom">
      <AdaptivityProvider density="compact" hasPointer>
        <AppRoot mode="full">
          <QueryProvider>
            <RouterProvider router={router} />
          </QueryProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root not found')
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
