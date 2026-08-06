import React, { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, LibraryBig, MessageCircleMore, Package, ScanLine, Settings } from 'lucide-react'
import { SendEnum } from '@src/type/ipc-constants'
import SelectionTranslator from '@renderer/components/SelectionTranslator'
import UpdateDialog from '@renderer/components/UpdateDialog'
import { cn } from '@renderer/lib/utils'
import useLocalForage from '@renderer/hooks/useLocalForage'

/** 导航项目配置 */
const NAVIGATION_ITEMS = [
  { path: '/home', label: '翻译台', icon: Home },
  { path: '/conversation', label: '对话练习', icon: MessageCircleMore },
  { path: '/collection', label: '学习收藏', icon: LibraryBig },
  { path: '/setting', label: '设置', icon: Settings },
  { path: '/about', label: '关于', icon: Package }
] as const

/**
 * 渲染 Bai_Ze 主窗口工作台
 * @returns {React.JSX.Element} 应用外壳
 */
function App(): React.JSX.Element {
  // 路由跳转方法
  const navigate = useNavigate()
  // 当前路由位置
  const location = useLocation()
  // 本地应用设置
  const { isInit, storeSetting } = useLocalForage()
  // 归一化后的当前路径
  const activePath = location.pathname === '/' ? '/home' : location.pathname

  /**
   * 跳转到指定页面
   * @param {string} path 目标路径
   * @returns {void} 无返回值
   */
  const handleNavigate = (path: string): void => {
    navigate(path)
  }

  /** 首次加载时同步本地设置 */
  useEffect(() => {
    if (!isInit) {
      window.electron.ipcRenderer.send(SendEnum.INIT_LOCAL_FORAGE, storeSetting)
    }
  }, [isInit, storeSetting])

  /** 首次加载时检查应用更新 */
  useEffect(() => {
    window.electron.ipcRenderer.send(SendEnum.CHECK_UPDATE)
    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.CHECK_UPDATE_RESULT)
    }
  }, [])

  return (
    <div className="app-shell flex h-dvh w-screen overflow-hidden bg-background text-foreground">
      <aside className="lab-sidebar flex w-50 min-w-50 flex-col border-r border-border bg-sidebar px-3 py-4">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="brand-aperture flex size-8 items-center justify-center rounded-lg">
            <ScanLine size={17} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg tracking-[-0.02em]">Bai Ze</h1>
            <p className="whitespace-nowrap text-[10px] text-muted-foreground">
              从看懂到开口
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="主导航">
          {NAVIGATION_ITEMS.map((item) => {
            // 当前导航图标
            const NavigationIcon = item.icon
            // 当前导航是否激活
            const isActive = activePath === item.path

            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex h-9 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/65 hover:text-foreground'
                )}
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                type="button"
              >
                <NavigationIcon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-border pt-3">
          <div className="mb-2.5 flex items-center justify-between px-2 text-[11px] text-muted-foreground">
            <span>截图快捷键</span>
            <kbd className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground">
              F2
            </kbd>
          </div>
          <UpdateDialog />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background">
        <SelectionTranslator
          className={cn(activePath === '/conversation' && 'lg:h-full lg:min-h-0')}
        >
          <Outlet />
        </SelectionTranslator>
      </main>
    </div>
  )
}

export default App
