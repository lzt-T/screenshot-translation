import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { cn } from '@renderer/lib/utils' // Import cn utility
import { Button } from '@renderer/components/ui/button' // Import shadcn Button
import useLocalForage from '@renderer/hooks/useLocalForage'

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

  return (
    // Use Tailwind classes for layout
    <div className="flex h-screen w-screen text-foreground bg-[#f9f9fa]">
      {/* Sidebar with Tailwind */}
      <div className="w-52 min-w-52 flex-shrink-0 border-r border-border bg-card p-4 flex flex-col">
        {/* Sidebar Title with Tailwind */}
        <h1 className="mb-4 border-b border-primary pb-2 text-center text-lg font-semibold text-primary">
          截图翻译
        </h1>
        {/* Navigation Links using shadcn Button */}
        <nav className="flex flex-col gap-2 ">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start cursor-pointer',
              isLinkActive('/home') && 'bg-accent text-accent-foreground'
            )}
            onClick={() => handleNavigate('/home')}
          >
            首页
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start cursor-pointer',
              isLinkActive('/version') && 'bg-accent text-accent-foreground'
            )}
            onClick={() => handleNavigate('/version')}
          >
            版本
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start cursor-pointer',
              isLinkActive('/setting') && 'bg-accent text-accent-foreground'
            )}
            onClick={() => handleNavigate('/setting')}
          >
            设置
          </Button>
        </nav>
      </div>
      {/* Content Area with Tailwind */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-6">
        <Outlet />
      </div>
    </div>
  )
}

export default App
