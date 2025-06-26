import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import AuroraBackground from './AuroraBackground';
import TopBar from './TopBar';
import Footer from './Footer';
import { colors } from '../styles/colors';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: white;
  font-family: Arial, sans-serif;
`;

const Content = styled.div`
  flex: 1;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const StatusCard = styled.div`
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 3rem;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.2);
  text-align: center;
  width: 100%;
  max-width: 500px;
`;

const StatusIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  color: ${props => {
    if (props.status === 'completed') return '#4ade80';
    if (props.status === 'error') return '#ef4444';
    return '#eaffb7';
  }};
`;

const StatusTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: ${colors.white};
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
`;

const StatusMessage = styled.p`
  font-size: 1.1rem;
  color: ${colors.white};
  opacity: 0.8;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const ProgressContainer = styled.div`
  width: 100%;
  margin-bottom: 2rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #eaffb7 0%, #4ade80 100%);
  border-radius: 4px;
  width: ${props => props.progress}%;
  transition: width 0.5s ease;
`;

const ProgressText = styled.div`
  font-size: 0.9rem;
  color: ${colors.white};
  opacity: 0.7;
  text-align: center;
`;

const StepsList = styled.div`
  text-align: left;
  margin-bottom: 2rem;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  color: ${colors.white};
  opacity: ${props => props.completed ? 1 : 0.5};
`;

const StepIcon = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${props => props.completed ? '#4ade80' : 'rgba(255,255,255,0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
`;

const ActionButton = styled.button`
  background: #111;
  color: ${colors.white};
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: #222;
    color: ${colors.white};
    transform: translateY(-2px);
  }
`;

const SecondaryButton = styled(ActionButton)`
  background: #222;
  color: ${colors.white};
  margin-left: 1rem;
  &:hover {
    background: #111;
    color: ${colors.white};
  }
`;

const AnalysisStatus = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('분석을 시작하고 있습니다...');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    '콘텐츠 추출',
    'AI 분석 진행',
    '보고서 생성',
    '시각화 생성',
    '최종 결과 정리'
  ];

  useEffect(() => {
    // 실제로는 WebSocket이나 polling으로 상태 확인
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 10, 100);
        
        if (newProgress >= 100) {
          setStatus('completed');
          setMessage('분석이 완료되었습니다!');
          setCurrentStep(steps.length);
          clearInterval(interval);
        } else {
          const step = Math.floor((newProgress / 100) * steps.length);
          setCurrentStep(step);
          setMessage(`${steps[step]}을 진행하고 있습니다...`);
        }
        
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleViewResult = () => {
    navigate('/editor', {
      state: {
        analysisData: {
          final_output: {
            sections: [{ content: '분석 결과가 여기에 표시됩니다.' }]
          }
        }
      }
    });
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle />;
      case 'error':
        return <FaExclamationCircle />;
      default:
        return <FaSpinner className="fa-spin" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'completed':
        return '분석 완료';
      case 'error':
        return '분석 실패';
      default:
        return '분석 진행 중';
    }
  };

  return (
    <PageContainer>
      <AuroraBackground />
      <TopBar />
      <Content>
        <StatusCard>
          <StatusIcon status={status}>
            {getStatusIcon()}
          </StatusIcon>
          
          <StatusTitle>{getStatusTitle()}</StatusTitle>
          <StatusMessage>{message}</StatusMessage>

          {status === 'processing' && (
            <>
              <ProgressContainer>
                <ProgressBar>
                  <ProgressFill progress={progress} />
                </ProgressBar>
                <ProgressText>{progress}% 완료</ProgressText>
              </ProgressContainer>

              <StepsList>
                {steps.map((step, index) => (
                  <Step key={index} completed={index < currentStep}>
                    <StepIcon completed={index < currentStep}>
                      {index < currentStep ? '✓' : index + 1}
                    </StepIcon>
                    <span>{step}</span>
                  </Step>
                ))}
              </StepsList>
            </>
          )}

          {status === 'completed' && (
            <div>
              <ActionButton onClick={handleViewResult}>
                결과 확인하기
              </ActionButton>
              <SecondaryButton onClick={handleBackToDashboard}>
                대시보드로
              </SecondaryButton>
            </div>
          )}

          {status === 'error' && (
            <div>
              <SecondaryButton onClick={handleBackToDashboard}>
                대시보드로 돌아가기
              </SecondaryButton>
            </div>
          )}
        </StatusCard>
      </Content>
      <Footer />
    </PageContainer>
  );
};

export default AnalysisStatus;