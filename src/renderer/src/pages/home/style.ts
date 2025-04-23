import styled from 'styled-components';

const techyAccentColor = '#64ffda'; // 与 App.tsx 保持一致
const lightTextColor = '#e0e0e0';    // 与 App.tsx 保持一致
const secondaryTextColor = '#aaaaaa'; // 与 App.tsx 保持一致
const hintTextColor = '#777777';    // 更暗的提示文本颜色
const darkBg = '#121212';          // 与 App.tsx 保持一致

export const PageContainer = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  // background-color: ${darkBg}; // 背景色通常由 ContentArea 提供，除非需要特定背景
`;

export const Title = styled.h2`
  margin-top: 0;
  margin-bottom: 15px; // 调整间距
  color: ${lightTextColor}; // 标题颜色
  font-family: 'Orbitron', sans-serif; // 尝试一个科技感的字体 (需要引入)
  font-weight: 500;
  letter-spacing: 1px; // 增加字母间距
`;

export const Description = styled.p`
  margin-top: 0;
  margin-bottom: 20px; // 调整间距
  color: ${secondaryTextColor}; // 描述文本颜色
  font-size: 15px; // 稍微增大字体
  line-height: 1.6; // 增加行高
`;

export const HintText = styled.p`
  margin: 0;
  font-size: 13px; // 调整字体大小
  color: ${hintTextColor}; // 提示文本颜色
`;
