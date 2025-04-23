import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { SelectDropdownStyle } from './components/Select'
import router from './routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SelectDropdownStyle></SelectDropdownStyle>
    <RouterProvider router={router} />
  </StrictMode>
)
