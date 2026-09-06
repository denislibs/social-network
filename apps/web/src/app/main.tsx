import { AdaptivityProvider, AppRoot, ConfigProvider } from '@vkontakte/vkui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { SessionProvider } from '@/entities/session'
import { DiProvider } from '@/shared/di'
import { useColorScheme } from '@/shared/lib'
import { createAppContainer } from './composition/container'
import { NotificationSync } from './composition/NotificationSync'
import { QueryProvider } from './composition/QueryProvider'
import { router } from './router'
import './styles/global.css'

function App() {
  const { scheme } = useColorScheme()
  return (
    <ConfigProvider colorScheme={scheme} platform="vkcom">
      <AdaptivityProvider density="compact" hasPointer>
        <AppRoot mode="full">
          <QueryProvider>
            <SessionProvider>
              <NotificationSync />
              <RouterProvider router={router} />
            </SessionProvider>
          </QueryProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  )
}

const container = createAppContainer()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root not found')
createRoot(rootElement).render(
  <StrictMode>
    <DiProvider container={container}>
      <App />
    </DiProvider>
  </StrictMode>,
)
