import React from 'react';
import styled from 'styled-components';
import { colors } from "../styles/colors";

const FooterContainer = styled.footer`
  width: 100%;
  padding: 16px 0;
  text-align: center;
  color: ${colors.white};
  background: rgba(255,255,255,0.1);
  z-index: 10;
  margin-top: auto;
  font-size: 0.92rem;
  backdrop-filter: blur(12px);
  text-shadow: 0 0 8px rgba(0,0,0,0.5);
`;

const Footer = () => {
  return (
    <FooterContainer>
      © 2024 Aurora Report. All rights reserved.
    </FooterContainer>
  );
};

export default Footer;