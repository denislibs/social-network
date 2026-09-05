import { createBrowserRouter, Navigate } from 'react-router'
import { NotFoundPage } from '@/pages/not-found'

// Все маршруты, кроме `*`, временно ведут на NotFoundPage — реальные страницы появятся в Task 6.
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/feed" replace /> },
  { path: '/feed', element: <NotFoundPage /> },
  { path: '/login', element: <NotFoundPage /> },
  { path: '/register', element: <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
])
