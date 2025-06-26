import React from 'react';
import styled, { keyframes } from 'styled-components';
import { colors } from "../styles/colors";

const auroraAnimation = keyframes`
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  z-index: -1;
`;

const Aurora = styled.div`
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background: #000;
  animation: ${auroraAnimation} 20s infinite linear;
  filter: blur(60px);
`;

const AuroraBg = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  background: #000;
`;

const AuroraBackground = () => {
  return (
    <Container>
      <Aurora />
    </Container>
  );
};

export default AuroraBackground; 