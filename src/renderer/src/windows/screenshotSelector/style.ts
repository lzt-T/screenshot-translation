import styled from 'styled-components'

/** 选区矩形属性 */
interface RectProps {
  /* 矩形坐标与尺寸 */
  $rect: { x: number; y: number; width: number; height: number }
}

/** 截图全屏容器 */
export const FullScreenContainer = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  z-index: 9998;
  background: rgba(0, 0, 0, 0.01);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
`

/** 选区外遮罩片段 */
export const OverlayPiece = styled.div.attrs<RectProps>((props) => ({
  style: {
    left: `${props.$rect.x}px`,
    top: `${props.$rect.y}px`,
    width: `${props.$rect.width}px`,
    height: `${props.$rect.height}px`
  }
}))<RectProps>`
  position: fixed;
  z-index: 9999;
  background: var(--capture-mask);
  pointer-events: none;
`

/** 当前截图选区 */
export const SelectionBox = styled.div.attrs<RectProps>((props) => ({
  style: {
    left: `${props.$rect.x}px`,
    top: `${props.$rect.y}px`,
    width: `${props.$rect.width}px`,
    height: `${props.$rect.height}px`
  }
}))<RectProps>`
  position: absolute;
  z-index: 10000;
  box-sizing: border-box;
  border: 2px solid var(--floating-accent);
  background: transparent;
  box-shadow: 0 0 0 1px var(--floating-border);
  pointer-events: none;

`

/** 选区尺寸与操作提示 */
export const SizeInfo = styled.div`
  position: absolute;
  z-index: 10001;
  padding: 6px 9px;
  border: 1px solid color-mix(in oklab, var(--floating-accent) 24%, var(--floating-border));
  border-radius: 7px;
  color: var(--floating-foreground);
  background: var(--floating-surface-strong);
  box-shadow: 0 8px 24px -18px rgba(0, 0, 0, 0.72);
  font-family: var(--font-measure);
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
`
