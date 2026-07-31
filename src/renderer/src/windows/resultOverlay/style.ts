import styled from 'styled-components'
import { getConfig } from '@src/utils/config'

// 翻译浮层底栏高度
const { RESULT_WINDOW_BAR_HEIGHT } = getConfig()

/** 翻译浮层容器属性 */
interface OverlayContainerProps {
  /* 原图显示模式 */
  $overlayMode: 'show-original' | 'hide-original'
}

/** 翻译浮层容器 */
export const OverlayContainer = styled.div<OverlayContainerProps>`
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
  padding: 5px;
  border-radius: 6px;
  background-color: ${({ $overlayMode }) =>
    $overlayMode === 'hide-original'
      ? 'var(--floating-surface-strong)'
      : 'var(--floating-surface)'};
  cursor: pointer;
  user-select: none;
  -webkit-app-region: drag;
`

/** 单块译文 */
export const TranslatedTextOverlay = styled.div`
  position: absolute;
  box-sizing: border-box;
  padding: 4px 6px;
  border-radius: 4px;
  color: var(--floating-foreground);
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  pointer-events: none;
  text-shadow: 0 1px 2px var(--floating-surface-strong);
`

/** 浮层操作栏 */
export const FooterContainer = styled.div`
  position: absolute;
  right: 10px;
  bottom: 0;
  display: flex;
  align-items: center;
  height: ${RESULT_WINDOW_BAR_HEIGHT}px;
  gap: 10px;
  padding: 0 8px;
  background: none;
  -webkit-app-region: no-drag;
`

/** 浮层文本操作 */
export const CopyButton = styled.div`
  z-index: 1000;
  padding: 2px 4px;
  color: var(--floating-foreground);
  background: none;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    color: var(--floating-accent);
  }
`
