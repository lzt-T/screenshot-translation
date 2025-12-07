import Home from '../pages/home/index'
import About from '../pages/about/index'
import App from '../App'
import { Navigate } from 'react-router-dom'
import { createHashRouter } from 'react-router-dom'
import ScreenshotSelector from '@renderer/windows/screenshotSelector'
import ResultOverlay from '@renderer/windows/resultOverlay'
import Setting from '@renderer/pages/setting'
const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <Navigate to="/home" />
      },
      {
        path: 'home',
        element: <Home />
      },
      {
        path: 'about',
        element: <About />
      },
      {
        path: 'setting',
        element: <Setting />
      }
    ]
  },
  {
    path: '/windows/screenshotSelector',
    element: <ScreenshotSelector />
  },
  {
    path: '/windows/resultOverlay',
    element: <ResultOverlay />
  }
])

export default router
