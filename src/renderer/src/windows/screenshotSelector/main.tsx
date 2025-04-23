import './../../assets/main.css'
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ScreenshotSelector from './index'; // 导入 ScreenshotSelector 组件

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ScreenshotSelector />
    </StrictMode>
  );
} else {
  console.error('ScreenshotSelector entry point: Root element #root not found!');
} 