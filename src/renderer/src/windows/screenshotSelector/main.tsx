import './../../assets/main.css'
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ThemeProvider from '@renderer/components/ThemeProvider'
import ScreenshotSelector from './index'

// 截图选择器根节点
const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <ScreenshotSelector />
      </ThemeProvider>
    </StrictMode>
  )
} else {
  console.error('ScreenshotSelector entry point: Root element #root not found!')
}
