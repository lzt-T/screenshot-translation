import Home from '../pages/home/index'
import Version from '../pages/version/index'
import App from '../App'
import { Navigate } from 'react-router-dom'
import { createHashRouter } from 'react-router-dom'
import ScreenshotSelector from '@renderer/windows/screenshotSelector'
import ResultOverlay from '@renderer/windows/resultOverlay'
import Notification from '@renderer/windows/notification'
import Setting from '@renderer/pages/setting'
const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <Navigate to='/home' />
      },
      {
        path: 'home',
        element: <Home />
      },
      {
        path: 'version',
        element: <Version />
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
  },
  {
    path: '/windows/notification',
    element: <Notification />
  }
])

export default router
