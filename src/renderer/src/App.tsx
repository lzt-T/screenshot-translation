import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import localForage from 'localforage'
import { useCallback, useEffect } from 'react'
import styled, { css } from 'styled-components'
import { Model } from '@src/type/model'
import { SendEnum } from '@src/type/ipc-constants'

const techyAccentColor = '#64ffda' // 科技感强调色 (Teal A400 like)
const darkBg = '#121212' // 主要深色背景
const sidebarBg = '#1e1e1e' // 侧边栏稍亮背景
const lightTextColor = '#e0e0e0' // 主要浅色文本
const secondaryTextColor = '#aaaaaa' // 次要浅色文本
const hoverBg = '#2a2a2a' // 悬停背景

// --- Styled Components Definition ---

const LayoutContainer = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: ${darkBg}; // 使用深色背景
  color: ${lightTextColor}; // 默认文本颜色设为浅色
`

const Sidebar = styled.div`
  width: 200px;
  background-color: ${sidebarBg}; // 侧边栏背景
  padding: 20px 0;
  // box-shadow: 2px 0 6px rgba(0, 21, 41, 0.1); // 移除阴影，或换成细边框
  border-right: 1px solid #333; // 添加右侧细边框
  display: flex;
  flex-direction: column;
`

// 新增：侧边栏标题
const SidebarTitle = styled.h1`
  font-size: 1.2em;
  font-weight: 600;
  color: ${lightTextColor}; // 标题颜色
  padding: 0 20px 20px 20px;
  margin: 0;
  border-bottom: 1px solid ${techyAccentColor}; // 使用强调色作为分隔线
  text-align: center; // 居中
`

// 修改 NavLink 以接受 isActive prop
const NavLink = styled.div<{ isActive?: boolean }>`
  padding: 12px 20px; // 增加 padding
  margin: 4px 0;
  cursor: pointer;
  color: ${secondaryTextColor}; // 默认链接颜色
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
  position: relative; // 为了伪元素定位

  &:hover {
    background-color: ${hoverBg}; // 悬停背景
    color: ${techyAccentColor}; // 悬停文字颜色
  }

  // 活动状态样式
  ${({ isActive }) =>
    isActive &&
    css`
      background-color: ${hoverBg}; // 活动链接背景色
      color: ${techyAccentColor}; // 活动链接文字颜色
      font-weight: 600;
      // 添加左侧指示条
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background-color: ${techyAccentColor};
      }
    `}
`

const ContentArea = styled.div`
  flex-grow: 1;
  padding: 30px; // 增加内边距
  overflow-y: auto;
  background-color: ${darkBg}; // 确保内容区域背景也是深的
`

// --- App Component ---

function App(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation() // 获取 location 对象

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  /** 初始化 */
  const onInit = useCallback(async () => {
    let result = {
      activeModel: Model.GEMINI,
      apiKeys: {
        [Model.GEMINI]: '',
        [Model.GLM]: ''
      }
    }
    const apiKeys = await localForage.getItem('apiKeys')
    const activeModel = await localForage.getItem('activeModel')

    if (activeModel) {
      result.activeModel = activeModel as Model
    }

    if (apiKeys) {
      result.apiKeys = apiKeys as { [key in Model]: string }
    }

    window.electron.ipcRenderer.send(SendEnum.INIT_LOCAL_FORAGE, result)
  }, [])

  useEffect(() => {
    onInit()
  }, [])

  return (
    <LayoutContainer>
      <Sidebar>
        <SidebarTitle>截图翻译</SidebarTitle>
        <NavLink
          onClick={() => handleNavigate('/home')}
          isActive={location.pathname === '/home' || location.pathname === '/'} // 判断是否活动
        >
          首页
        </NavLink>
        <NavLink
          onClick={() => handleNavigate('/version')}
          isActive={location.pathname === '/version'} // 判断是否活动
        >
          版本
        </NavLink>
        <NavLink
          onClick={() => handleNavigate('/setting')}
          isActive={location.pathname === '/setting'} // 判断是否活动
        >
          设置
        </NavLink>
      </Sidebar>
      <ContentArea>
        <Outlet />
      </ContentArea>
    </LayoutContainer>
  )
}

export default App
