// src/renderer/src/components/Select/index.tsx
import React from 'react';
import { Select as AntdSelect, SelectProps } from 'antd';
import { BaseSelectRef } from 'rc-select'; // Keep this import simple
import styled, { createGlobalStyle } from 'styled-components';

// --- Theme Colors (ensure consistency) ---
const techyAccentColor = '#64ffda';
const darkBg = '#121212';
const elementBg = '#2a2a2a'; // Slightly lighter bg for inputs/selects
const lightTextColor = '#e0e0e0';
const secondaryTextColor = '#aaaaaa';
const placeholderColor = '#666';
const borderColor = '#444';
const focusBorderColor = techyAccentColor;
const focusGlow = `0 0 0 2px rgba(100, 255, 218, 0.2)`; // Antd-like focus ring

// --- Styled Antd Select ---
// We explicitly type the styled component to help TypeScript inference
const StyledAntdSelect: typeof AntdSelect = styled(AntdSelect)`
  // Copy styles from setting/style.ts StyledSelect here
  &.ant-select .ant-select-selector {
    background-color: ${elementBg} !important;
    border: 1px solid ${borderColor} !important;
    color: ${lightTextColor} !important;
    border-radius: 2px !important;
  }

  &.ant-select .ant-select-arrow {
    color: ${secondaryTextColor} !important;
  }

  &.ant-select .ant-select-selection-placeholder {
     color: ${placeholderColor} !important;
  }

  &:hover .ant-select-selector {
    border-color: ${focusBorderColor} !important;
  }

  &.ant-select-focused .ant-select-selector {
    border-color: ${focusBorderColor} !important;
    box-shadow: ${focusGlow} !important;
    outline: 0;
  }
`;

// --- Global Dropdown Style ---
// Export this so it can be rendered at the app root
export const SelectDropdownStyle = createGlobalStyle`
  .ant-select-dropdown {
    // Copy styles from setting/style.ts SelectDropdownStyle here
    background-color: ${elementBg} !important;
    border: 1px solid ${borderColor} !important;
    border-radius: 2px !important;
    box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.3), 0 6px 16px 0 rgba(0, 0, 0, 0.2), 0 9px 28px 8px rgba(0, 0, 0, 0.15);

    .ant-select-item {
      color: ${lightTextColor} !important;

      &:hover:not(.ant-select-item-option-disabled) {
        background-color: rgba(100, 255, 218, 0.1) !important;
      }
    }

    .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
      background-color: ${techyAccentColor} !important;
      color: ${darkBg} !important;
      font-weight: 600;
    }

     .ant-empty-description {
       color: ${secondaryTextColor} !important;
     }
  }
`;

// --- TechSelect Component ---
// Define an interface for the component including static properties
// Remove generic arguments from SelectProps here
interface TechSelectComponent extends React.ForwardRefExoticComponent<SelectProps & React.RefAttributes<BaseSelectRef>> {
  Option: typeof AntdSelect.Option;
  OptGroup: typeof AntdSelect.OptGroup;
}

// Use BaseSelectRef for the ref type
// Cast the forwarded component to the interface type
const TechSelect = React.forwardRef<BaseSelectRef, SelectProps>((props, ref) => {
  // Pass down props and the ref
  return <StyledAntdSelect {...props} ref={ref} />;
}) as TechSelectComponent; // <-- Cast here

TechSelect.displayName = 'TechSelect';

// Attach Option and OptGroup to TechSelect if needed for convenience
// This allows using TechSelect.Option like AntdSelect.Option
TechSelect.Option = AntdSelect.Option;
TechSelect.OptGroup = AntdSelect.OptGroup;

export default TechSelect;
