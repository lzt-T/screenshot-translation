import styled from 'styled-components';
import { Input } from 'antd';

// Theme colors (ensure consistency)
const secondaryTextColor = '#aaaaaa';
const borderColor = '#444';

export const Container = styled.div`
  padding: 20px;
  // Remove font-family override to inherit global style
`;

export const FormGroup = styled.div`
  margin-bottom: 20px; // Increase spacing
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 8px; // Increase spacing
  font-weight: 500; // Slightly less bold
  color: ${secondaryTextColor}; // Lighter text for labels
  font-size: 14px;
`;

export const ApiKeySection = styled.div`
  margin-top: 30px; // Increase spacing
  padding-top: 20px; // Increase spacing
  border-top: 1px solid ${borderColor}; // Darker border color
`;

export const ApiKeyInputGroup = styled.div`
  margin-bottom: 15px; // Increase spacing
`;

// Remove old StatusMessage if no longer needed
// export const StatusMessage = styled.p`
//   margin-top: 10px;
// `;
