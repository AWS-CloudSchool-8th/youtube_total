import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import { colors } from "../styles/colors";
import { useNavigate } from 'react-router-dom';

const TopBarContainer = styled.div`
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(255,255,255,0.1);
  color: ${colors.white};
  box-shadow: none;
  z-index: 10;
  position: relative;
  backdrop-filter: blur(12px);
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Logo = styled.div`
  font-size: 1.35rem;
  font-weight: bold;
  color: ${colors.white};
  text-shadow: 0 0 8px rgba(0,0,0,0.5);
  cursor: pointer;
`;

const NavMenu = styled.button`
  background: none;
  border: none;
  color: ${colors.white};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  text-shadow: 0 0 8px rgba(0,0,0,0.5);
  transition: background 0.2s;
  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;

const LoginButton = styled.button`
  background: #111;
  color: ${colors.white};
  font-weight: 600;
  border: none;
  border-radius: 18px;
  padding: 8px 22px;
  font-size: 1.05rem;
  box-shadow: 0 0 8px #222;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  &:hover {
    background: #222;
    color: ${colors.white};
  }
`;

const TopBar = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 로그인 상태 확인
    const token = localStorage.getItem('access_token');
    const idToken = localStorage.getItem('id_token');
    if (token && idToken) {
      try {
        const { jwtDecode } = require('jwt-decode');
        const decoded = jwtDecode(idToken);
        setUser({
          username: decoded['cognito:username'] || decoded.email,
          email: decoded.email
        });
      } catch (error) {
        console.error('토큰 디코딩 실패:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
      }
    }
  }, []);

  const handleLoginSuccess = (loginData) => {
    setUser(loginData.user);
    setShowLogin(false);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <TopBarContainer>
        <LeftSection>
          <Logo onClick={() => navigate('/')}>aurora report</Logo>
          <NavMenu onClick={() => navigate('/dashboard')}>대시보드</NavMenu>
          <NavMenu onClick={() => navigate('/editor')}>에디터</NavMenu>
        </LeftSection>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: colors.white, fontSize: '0.9rem' }}>
              {user.email}님
            </span>
            <LoginButton onClick={handleLogout}>Logout</LoginButton>
          </div>
        ) : (
          <LoginButton onClick={() => setShowLogin(true)}>Login</LoginButton>
        )}
      </TopBarContainer>
      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)}
          onSignupClick={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onLoginClick={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
        />
      )}
    </>
  );
};

export default TopBar; 