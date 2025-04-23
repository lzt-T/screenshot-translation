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
    /**
     * 嵌套路由。通过<Outlet />可以设置那里放置子路由
     * 对于嵌套路由没有 / 会自动拼接  /home/contacts/12 ,有/则表示具体的路径
     */
    children: [
      {
        path: '/',
        element: <Navigate to='/home' />
      },
      {
        //params传参
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
  // Add route for the screenshot selector window
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
