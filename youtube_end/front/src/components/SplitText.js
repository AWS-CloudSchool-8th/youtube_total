import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.95);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.04);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Char = styled.span`
  display: inline-block;
  opacity: 0;
  animation: ${fadeUp} 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: ${({ idx }) => idx * 0.045}s;
`;

const SplitText = ({ text }) => {
  return (
    <span aria-label={text} style={{ display: 'inline-block' }}>
      {text.split('').map((char, i) => (
        <Char key={i} idx={i} aria-hidden="true">
          {char === ' ' ? '\u00A0' : char}
        </Char>
      ))}
    </span>
  );
};

export default SplitText; 