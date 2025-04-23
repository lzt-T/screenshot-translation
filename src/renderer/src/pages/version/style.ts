import styled from 'styled-components';

// Re-declare or import theme colors if needed, or use values directly
const lightTextColor = '#e0e0e0';
const secondaryTextColor = '#aaaaaa';

export const PageContainer = styled.div`
  padding: 20px;
  // Remove the fixed color here, let it inherit from ContentArea in App.tsx
  // or explicitly set if needed: color: lightTextColor;

  // Style p tags directly within this container
  p {
    color: ${secondaryTextColor}; // Use secondary color for details
    font-size: 14px;
    line-height: 1.8; // Add some line spacing
    margin: 8px 0; // Add vertical spacing
  }
`;

export const Title = styled.h2`
  margin-top: 0;
  margin-bottom: 20px;
  color: ${lightTextColor}; // Use primary light color for the title
  font-weight: 500; // Adjust weight if needed
  letter-spacing: 0.5px; // Optional: add letter spacing
`;
