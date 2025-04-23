import styled from 'styled-components'
export const FullScreenContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  cursor: crosshair;
  user-select: none;
  overflow: hidden;
  z-index: 9998;
`

// 覆盖层片段，用于创建镂空效果
export const OverlayPiece = styled.div.attrs<RectProps>((props) => ({
  style: {
    left: `${props.$rect.x}px`,
    top: `${props.$rect.y}px`,
    width: `${props.$rect.width}px`,
    height: `${props.$rect.height}px`
  }
}))<RectProps>`
  position: fixed;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 9999;
`

interface RectProps {
  $rect: { x: number; y: number; width: number; height: number }
}

// 选区边框
export const SelectionBox = styled.div.attrs<RectProps>((props) => ({
  style: {
    left: `${props.$rect.x}px`,
    top: `${props.$rect.y}px`,
    width: `${props.$rect.width}px`,
    height: `${props.$rect.height}px`
  }
}))<RectProps>`
  position: absolute;
  border: 1px solid #00ff00;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
  box-sizing: border-box;
  z-index: 10000;
`

// 尺寸信息提示框
export const SizeInfo = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10001;
  white-space: nowrap;
`
