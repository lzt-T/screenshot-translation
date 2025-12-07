import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { cn } from '@renderer/lib/utils' // Import cn utility
import { Button } from '@renderer/components/ui/button' // Import shadcn Button
import useLocalForage from '@renderer/hooks/useLocalForage'
import { Home, Settings, Package } from 'lucide-react' // 导入图标
import UpdateDialog from './components/UpdateDialog'

function App(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation() // 获取 location 对象
  const { isInit, storeSetting } = useLocalForage()
  const handleNavigate = (path: string) => {
    navigate(path)
  }

  useEffect(() => {
    if (!isInit) {
      window.electron.ipcRenderer.send(SendEnum.INIT_LOCAL_FORAGE, storeSetting)
    }
  }, [isInit])

  // Helper function to determine if a link is active
  const isLinkActive = (path: string): boolean => {
    if (path === '/home') {
      return location.pathname === path || location.pathname === '/'
    }
    return location.pathname === path
  }

  useEffect(() => {
    window.electron.ipcRenderer.send(SendEnum.CHECK_UPDATE)
    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.CHECK_UPDATE_RESULT)
    }
  }, [])

  return (
    // Use Tailwind classes for layout
    <div className="flex h-screen w-screen text-foreground bg-[#f9f9fa]">
      {/* Sidebar with Tailwind */}
      <div className="w-52 min-w-52 flex-shrink-0 border-r border-border bg-card p-4 flex flex-col">
        <h1 className="mb-1 text-center text-lg font-semibold text-primary">Bai_Ze</h1>
        <p className="mb-4 border-b border-primary pb-2 text-center text-xs text-muted-foreground italic">
          The Enlightened Beast
        </p>
        {/* Navigation Links using shadcn Button */}
        <nav className="flex flex-col gap-2 flex-1 ">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start cursor-pointer',
              isLinkActive('/home') && 'bg-accent text-accent-foreground'
            )}
            onClick={() => handleNavigate('/home')}
          >
            <Home size={18} className="mr-2" /> 首页
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start cursor-pointer',
              isLinkActive('/setting') && 'bg-accent text-accent-foreground'
            )}
            onClick={() => handleNavigate('/setting')}
          >
            <Settings size={18} className="mr-2" /> 设置
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start cursor-pointer',
              isLinkActive('/version') && 'bg-accent text-accent-foreground'
            )}
            onClick={() => handleNavigate('/about')}
          >
            <Package size={18} className="mr-2" /> 关于
          </Button>
        </nav>

        <div>
          <UpdateDialog />
        </div>
      </div>
      {/* Content Area with Tailwind */}
      <div className="overflow-y-auto overflow-x-hidden p-6 flex-1 h-full">
        <Outlet />
      </div>
    </div>
  )
}

export default App
