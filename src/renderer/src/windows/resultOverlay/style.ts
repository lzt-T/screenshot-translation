import styled from 'styled-components'
import { getConfig } from '@src/utils/config'

// 翻译浮层底栏高度
const { RESULT_WINDOW_BAR_HEIGHT } = getConfig()

/** 原图显示模式 */
export type OverlayMode = 'show-original' | 'hide-original'

// 各原图显示模式的结果区域背景
const OVERLAY_BACKGROUND_COLORS: Record<OverlayMode, string> = {
  'show-original': 'var(--result-overlay-surface)',
  'hide-original': 'var(--result-overlay-surface-strong)'
}

/** 翻译浮层容器属性 */
interface OverlayContainerProps {
  /* 原图显示模式 */
  $overlayMode: OverlayMode
}

/** 翻译浮层容器 */
export const OverlayContainer = styled.div<OverlayContainerProps>`
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  box-sizing: border-box;
  padding: 5px;
  border: 1px solid var(--floating-border);
  border-radius: 6px;
  background-color: ${({ $overlayMode }) => OVERLAY_BACKGROUND_COLORS[$overlayMode]};
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
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  pointer-events: none;
  text-shadow: 0 1px 2px var(--result-overlay-surface-strong);
`

/** 浮层操作栏 */
export const FooterContainer = styled.div`
  position: absolute;
  right: 10px;
  bottom: 0;
  display: flex;
  align-items: center;
  height: ${RESULT_WINDOW_BAR_HEIGHT}px;
  gap: 4px;
  padding: 0 4px;
  border-radius: 6px 6px 0 0;
  background: var(--result-overlay-surface-strong);
  -webkit-app-region: no-drag;
`

/** 浮层文本操作 */
export const CopyButton = styled.button`
  z-index: 1000;
  padding: 2px 4px;
  border: 0;
  color: var(--floating-foreground);
  background: none;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
  border-radius: 4px;
  outline: none;
  transition: color 150ms ease, background-color 150ms ease;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  &:hover {
    color: var(--floating-accent);
    background: color-mix(in oklab, var(--floating-accent) 10%, transparent);
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--floating-accent) 60%, transparent);
  }
`
