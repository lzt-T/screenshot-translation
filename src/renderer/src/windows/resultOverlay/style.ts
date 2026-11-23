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

// 各原图显示模式的译文文字颜色
const OVERLAY_TEXT_COLORS: Record<OverlayMode, string> = {
  'show-original': 'var(--floating-foreground)',
  'hide-original': 'var(--result-overlay-text-strong)'
}

/** 翻译浮层容器属性 */
interface OverlayContainerProps {
  /* 原图显示模式 */
  $overlayMode: OverlayMode
}

/** 翻译浮层文本属性 */
interface TranslatedTextProps {
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
  border: 1px solid
    ${({ $overlayMode }) =>
      $overlayMode === 'hide-original' ? 'var(--result-overlay-bar-border)' : 'var(--floating-border)'};
  border-radius: var(--radius-md);
  background-color: ${({ $overlayMode }) => OVERLAY_BACKGROUND_COLORS[$overlayMode]};
  cursor: move;
  user-select: none;
  -webkit-app-region: drag;
`

/** 单块译文 */
export const TranslatedTextOverlay = styled.div<TranslatedTextProps>`
  position: absolute;
  box-sizing: border-box;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  color: ${({ $overlayMode }) => OVERLAY_TEXT_COLORS[$overlayMode]};
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  pointer-events: none;
  text-shadow: ${({ $overlayMode }) =>
    $overlayMode === 'show-original' ? '0 1px 2px rgba(0, 0, 0, 0.85)' : 'none'};
`

/** 浮层操作栏 */
export const FooterContainer = styled.div`
  position: absolute;
  right: 8px;
  bottom: 0;
  display: flex;
  align-items: center;
  height: ${RESULT_WINDOW_BAR_HEIGHT}px;
  gap: 2px;
  padding: 0 6px;
  border: 1px solid var(--result-overlay-bar-border);
  border-bottom: 0;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--result-overlay-bar-bg);
  -webkit-app-region: no-drag;
`

/** 浮层文本操作 */
export const CopyButton = styled.button`
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 6px;
  border: 0;
  color: var(--result-overlay-bar-fg);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: var(--radius-sm);
  outline: none;
  transition: color 150ms ease, background-color 150ms ease;

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }

  &:hover:not(:disabled) {
    color: var(--primary);
    background: color-mix(in oklab, var(--primary) 12%, transparent);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 45%, transparent);
  }
`
