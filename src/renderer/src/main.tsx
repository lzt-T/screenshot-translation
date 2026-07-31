import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@renderer/components/ui/sonner'
import ThemeProvider from '@renderer/components/ThemeProvider'
import router from './routes'

// 应用根节点
const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000
        }}
      />
    </ThemeProvider>
  </StrictMode>
)
