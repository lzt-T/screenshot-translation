import styled from 'styled-components'
import { getConfig } from '../../../../utils/config'

const { RESULT_WINDOW_BAR_HEIGHT } = getConfig()

interface OverlayContainerProps {
  $overlayMode: 'show-original' | 'hide-original'
}

export const OverlayContainer = styled.div<OverlayContainerProps>`
  position: relative;
  width: 100%;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; // 使用系统字体
  background-color: ${({ $overlayMode }) =>
    $overlayMode === 'hide-original' ? 'rgba(0, 0, 0, 0.96)' : 'rgba(0, 0, 0, 0.65)'};
  border-radius: 6px; // 稍小的圆角
  overflow: hidden;
  user-select: none;
  padding: 5px;
  box-sizing: border-box;
  -webkit-app-region: drag;
  cursor: pointer;
`;

export const TranslatedTextOverlay = styled.div`
  position: absolute;
  color: white;
  padding: 4px 6px; // 增加内边距
  font-size: 14px;
  line-height: 1.4; // 略微增加行高
  white-space: pre-wrap;
  pointer-events: none; // 文本本身不阻挡对容器的点击
  box-sizing: border-box;
  border-radius: 4px; // 文本块稍大的圆角
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7); // 添加细微文本阴影
`;


export const FooterContainer = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  height: ${RESULT_WINDOW_BAR_HEIGHT}px;
  bottom: 0px;
  right: 10px;
  gap: 10px;
  padding: 0 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  -webkit-app-region: no-drag;
`;

export const CopyButton = styled.div`
  cursor: pointer;
  color: white;
  font-size: 12px;
  z-index: 1000;
  padding: 2px 4px;
  border-radius: 4px;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #66b2ff;
  }
`;
