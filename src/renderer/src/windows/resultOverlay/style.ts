import styled from 'styled-components'
export const OverlayContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; // 使用系统字体
  background-color: rgba(0, 0, 0, 0.65); // 整体背景稍微不那么透明
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
