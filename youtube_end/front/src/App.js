import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AuroraBackground from './components/AuroraBackground';
import styled from 'styled-components';
import InputBox from './components/InputBox';
import SplitText from './components/SplitText';
import TopBar from './components/TopBar';
import Footer from './components/Footer';
import BedrockChat from './components/BedrockChat';
import { colors } from "./styles/colors";

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: white;
  font-family: Arial, sans-serif;
`;

const Content = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.2rem;
  margin-top: 2.5rem;
`;

const MainTitle = styled.h1`
  font-size: 2.1rem;
  font-weight: bold;
  margin-bottom: 0.7rem;
  line-height: 1.18;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
`;

const SubText = styled.p`
  font-size: 1.13rem;
  color: ${colors.white};
  font-weight: 400;
  margin: 0.5rem 0 0.5rem 0;
  line-height: 1.0;
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
  background: none;
  border: none;
  display: block;
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  background: none;
`;

const GuideText = styled.div`
  margin-top: 11px;
  color: ${colors.white};
  font-size: 0.8rem;
  text-align: center;
  line-height: 1.0;
  font-weight: 500;
  background: none;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  display: block;
  text-shadow: 0 0 8px rgba(0,0,0,0.8);
`;

const NavigationButtons = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
  justify-content: center;
`;

const NavButton = styled(Link)`
  background: ${colors.primary};
  border: 2px solid ${colors.primary};
  border-radius: 12px;
  padding: 12px 24px;
  color: ${colors.white};
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: transparent;
    color: ${colors.primary};
    transform: translateY(-2px);
  }
`;

const ChatContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

function HomePage() {
  return (
    <MainArea>
      <Content>
        <MainTitle><SplitText text="유튜브 영상, 이제 읽듯이 확인하세요." /></MainTitle>
        <SubText>핵심 요약부터 시각 자료까지, 영상 하나로 리포트를 완성합니다.</SubText>
        <SubText>챗봇과 대화하며 원하는 정보를 쉽게 찾고, 요약 내용을 음성으로 들을 수도 있어요.</SubText>
        <InputBox />
        <GuideText>예시: YouTube URL 또는 PDF/텍스트 파일을 드래그하세요</GuideText>
      </Content>
    </MainArea>
  );
}

function ChatPage() {
  return (
    <ChatContainer>
      <BedrockChat />
    </ChatContainer>
  );
}

function App() {
  return (
    <AppContainer>
      <AuroraBackground />
      <TopBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
      <Footer />
    </AppContainer>
  );
}

export default App;