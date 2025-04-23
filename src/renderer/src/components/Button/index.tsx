import React from 'react';
import { Button as AntdButton, ButtonProps } from 'antd';
import styled from 'styled-components';

// --- Theme Colors (ensure consistency with App.tsx/other styles) ---
const techyAccentColor = '#64ffda';
const darkBg = '#121212'; // Or a slightly different dark shade for contrast
const hoverBg = 'rgba(100, 255, 218, 0.1)'; // Subtle accent color background on hover
const focusGlow = `0 0 8px ${techyAccentColor}`;

// --- Styled Antd Button ---
const StyledTechButton = styled(AntdButton)`
  background-color: transparent; // 透明背景
  border: 1px solid ${techyAccentColor}; // 强调色边框
  color: ${techyAccentColor}; // 强调色文字
  border-radius: 2px; // 锐利边角
  font-weight: 500;
  padding: 8px 18px; // 调整内边距
  height: auto; // 覆盖 antd 默认高度，根据内容自适应
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

  // 覆盖 antd 的 :not(:disabled):hover 样式
  &:not(:disabled):hover {
    background-color: ${hoverBg}; // 悬停时带透明度的强调色背景
    color: ${techyAccentColor}; // 保持强调色文字
    border-color: ${techyAccentColor}; // 保持边框颜色
    box-shadow: ${focusGlow}; // 添加辉光效果
  }

  // 覆盖 antd 的 focus-visible 样式
  &:focus-visible {
    outline: none; // 移除默认 outline
    box-shadow: ${focusGlow}; // 添加辉光效果
  }

  // 如果是 primary 类型，可以覆盖样式
  &.ant-btn-primary {
    background-color: ${techyAccentColor};
    color: ${darkBg}; // 深色文字以确保对比度
    border-color: ${techyAccentColor};

    &:not(:disabled):hover {
      background-color: #80ffea; // 悬停时变亮
      border-color: #80ffea;
      color: ${darkBg};
      box-shadow: ${focusGlow};
    }
  }

  // 禁用状态
  &.ant-btn-disabled,
  &[disabled] {
    background-color: transparent !important;
    border-color: #555 !important; // 暗灰色边框
    color: #555 !important; // 暗灰色文字
    cursor: not-allowed;
    box-shadow: none;
  }
`;

// --- Custom Button Component ---
// 修改 Ref 类型以匹配 AntdButton 的可能元素类型
const TechButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>((props, ref) => {
  return <StyledTechButton {...props} ref={ref} />;
});

TechButton.displayName = 'TechButton'; // 设置 displayName 方便调试

export default TechButton;
