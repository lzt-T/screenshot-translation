import './../../assets/main.css'
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ResultOverlay from './index'; // 导入 ScreenshotSelector 组件

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ResultOverlay />
    </StrictMode>
  );
} else {
  console.error('ResultOverlay entry point: Root element #root not found!');
} 