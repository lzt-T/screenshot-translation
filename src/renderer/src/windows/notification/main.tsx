import './../../assets/main.css'
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Notification from './index'; // 导入 ScreenshotSelector 组件

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Notification />
    </StrictMode>
  );
} else {
  console.error('Notification entry point: Root element #root not found!');
} 