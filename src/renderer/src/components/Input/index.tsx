// src/renderer/src/components/Input/index.tsx
import React from 'react';
import { Input as AntdInput, InputProps, InputRef } from 'antd'; // Import InputRef
import { PasswordProps } from 'antd/es/input';
import styled from 'styled-components';

// --- Theme Colors (ensure consistency) ---
const techyAccentColor = '#64ffda';
const elementBg = '#2a2a2a'; // Slightly lighter bg for inputs/selects
const lightTextColor = '#e0e0e0';
const placeholderColor = '#666';
const borderColor = '#444';
const focusBorderColor = techyAccentColor;
const focusGlow = `0 0 0 2px rgba(100, 255, 218, 0.2)`; // Antd-like focus ring

// --- Base Input Styles ---
const baseInputStyles = `
  background-color: ${elementBg} !important;
  border: 1px solid ${borderColor} !important;
  color: ${lightTextColor} !important;
  border-radius: 2px !important;
  box-shadow: none !important; // Remove default antd shadows

  &::placeholder {
    color: ${placeholderColor} !important;
    opacity: 1; // Ensure placeholder is visible
  }

  &:hover {
    border-color: ${focusBorderColor} !important;
  }

  &:focus,
  &.ant-input-focused {
    border-color: ${focusBorderColor} !important;
    box-shadow: ${focusGlow} !important;
    outline: 0;
  }
`;

// --- Styled Components ---
const StyledAntdInput = styled(AntdInput)`
  ${baseInputStyles}
`;

const StyledAntdPassword = styled(AntdInput.Password)`
  ${baseInputStyles}

  // Style for password input eye icon
  .ant-input-password-icon {
     color: ${placeholderColor} !important;
     &:hover {
       color: ${lightTextColor} !important;
     }
  }

  // Ensure input within password component also gets base styles
  input {
    background-color: ${elementBg} !important;
    color: ${lightTextColor} !important;
    &::placeholder {
       color: ${placeholderColor} !important;
       opacity: 1;
    }
  }
`;

// --- Combined Props Type ---
type TechInputProps = InputProps | PasswordProps;

// --- TechInput Component ---
// Adjust ref type: The ref can point to either InputRef or the specific Password component instance (if methods needed)
// Using InputRef covers the basic input element access.
const TechInput = React.forwardRef<InputRef, TechInputProps>((props, ref) => {
  const isPassword = 'type' in props && props.type === 'password';

  if (isPassword) {
    // Pass the ref directly; antd handles the underlying ref connection
    return <StyledAntdPassword {...(props as PasswordProps)} ref={ref} />;
  }

  // Pass the ref directly
  return <StyledAntdInput {...(props as InputProps)} ref={ref} />;
});

TechInput.displayName = 'TechInput';

export default TechInput;
