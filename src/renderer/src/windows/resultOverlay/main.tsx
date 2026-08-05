import './../../assets/main.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ThemeProvider from '@renderer/components/ThemeProvider'
import ResultOverlay from './index'

// 翻译浮层根节点
const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <ResultOverlay />
      </ThemeProvider>
    </StrictMode>
  )
} else {
  console.error('ResultOverlay entry point: Root element #root not found!')
}
