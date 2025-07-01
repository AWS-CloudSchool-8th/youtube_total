import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { colors } from '../../styles/colors';

//조윤지
const API_BASE_URL = 'http://localhost:8000';
console.log('API BASE URL:', API_BASE_URL);
//여기까지 

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalBox = styled(motion.div)`
  background: rgba(0,0,0,0.92);
  border-radius: 14px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18);
  padding: 32px 20px 24px 20px;
  min-width: 700px;
  max-width: 96vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #eaffb7;
  cursor: pointer;
`;

const Title = styled.h2`
  font-size: 1.08rem;
  font-weight: bold;
  margin-bottom: 18px;
  color: #fff;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 10px;
  border: 1.2px solid ${colors.primary};
  border-radius: 6px;
  font-size: 0.98rem;
  outline: none;
  background: ${colors.navyDark};
  color: ${colors.white};
  margin-bottom: 0;
`;

const PasswordBox = styled.div`
  width: 65%;
  position: relative;
  margin-bottom: 10px;
`;

const ShowBtn = styled.span`
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: #888;
  cursor: pointer;
  user-select: none;
  background: #fff;
  padding: 0 4px;
`;

const LoginBtn = styled.button`
  width: 65%;
  padding: 10px 0;
  background: #111;
  color: ${colors.white};
  font-weight: bold;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  margin-top: 10px;
  cursor: pointer;
  transition: background 0.18s;
  &:hover {
    background: #222;
    color: ${colors.white};
  }
`;

const Warning = styled.div`
  color: #ff5a5a;
  font-size: 0.92rem;
  margin-bottom: 10px;
  text-align: center;
`;

const Divider = styled.div`
  width: 100%;
  text-align: center;
  color: #aaa;
  font-size: 0.88rem;
  margin: 18px 0 10px 0;
`;

const SnsBtn = styled.button`
  width: 65%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.2px solid #222;
  background: #111;
  color: ${colors.white};
  border-radius: 6px;
  font-size: 0.98rem;
  font-weight: 500;
  padding: 8px 0;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: #222;
    color: ${colors.white};
  }
  img {
    width: 18px;
    height: 18px;
    margin-right: 8px;
    object-fit: contain;
  }
`;

const SignupBox = styled.div`
  margin-top: 16px;
  text-align: center;
  color: #aaa;
  font-size: 0.92rem;
`;

const SignupBtn = styled.button`
  color: ${colors.white};
  background: none;
  border: none;
  font-size: 0.92rem;
  font-weight: 600;
  margin-left: 4px;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
    color: #aaa;
  }
`;

export default function LoginModal({
  onClose,
  onSignupClick,
  onLoginSuccess,
  warningMessage = "",
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [warn, setWarn] = useState(warningMessage);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async () => {
    if (!isValidEmail || !password) {
      setWarn("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }
    setWarn("");
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });
      const { access_token: accessToken, id_token: idToken } = response.data;
      if (!accessToken || !idToken) {
        setWarn("로그인 실패: 토큰이 없습니다.");
        return;
      }
      const decoded = jwtDecode(idToken);
      const user = {
        username: decoded["cognito:username"],
        email: decoded.email,
      };
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("id_token", idToken);
      onLoginSuccess && onLoginSuccess({ accessToken, idToken, user });
    } catch (error) {
      const detail = error.response?.data?.detail;
      setWarn(`로그인 실패: ${detail || error.message}`);
    }
  };

  return (
    <Overlay>
      <ModalBox
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <CloseBtn onClick={onClose} title="닫기">×</CloseBtn>
        <Title>로그인</Title>
        {warn && <Warning>{warn}</Warning>}
        <PasswordBox>
          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
          />
        </PasswordBox>
        <PasswordBox>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
          />
          <ShowBtn onClick={() => setShowPassword(v => !v)}>
            {showPassword ? "숨기기" : "보기"}
          </ShowBtn>
        </PasswordBox>
        <LoginBtn onClick={handleLogin}>로그인</LoginBtn>
        <Divider>또는 SNS로 로그인</Divider>
        <SnsBtn onClick={() => window.location.href = `${API_BASE_URL}/auth/google/login`}>
          <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" />
          Google 계정으로 로그인
        </SnsBtn>
        <SnsBtn onClick={() => alert("애플 로그인") }>
          <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apple/apple-original.svg" alt="Apple" />
          Apple 계정으로 로그인
        </SnsBtn>
        <SignupBox>
          계정이 없으신가요?
          <SignupBtn onClick={onSignupClick}>회원가입</SignupBtn>
        </SignupBox>
      </ModalBox>
    </Overlay>
  );
} 