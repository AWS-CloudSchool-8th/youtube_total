import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import AuroraBackground from '../AuroraBackground/AuroraBackground';
import TopBar from '../TopBar/TopBar';
import Footer from '../Footer/Footer';
import styles from './AnalysisStatus.module.css';

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
    <div className={styles.pageContainer}>
      <AuroraBackground />
      <TopBar />
      <div className={styles.content}>
        <div className={styles.statusCard}>
          <div className={`${styles.statusIcon} ${styles[status]}`}>
            {getStatusIcon()}
          </div>
          
          <h1 className={styles.statusTitle}>{getStatusTitle()}</h1>
          <p className={styles.statusMessage}>{message}</p>

          {status === 'processing' && (
            <>
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className={styles.progressText}>{progress}% 완료</div>
              </div>

              <div className={styles.stepsList}>
                {steps.map((step, index) => (
                  <div key={index} className={`${styles.step} ${index < currentStep ? styles.completed : ''}`}>
                    <div className={`${styles.stepIcon} ${index < currentStep ? styles.completed : ''}`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {status === 'completed' && (
            <div className={styles.buttonContainer}>
              <button className={styles.actionButton} onClick={handleViewResult}>
                결과 확인하기
              </button>
              <button className={styles.secondaryButton} onClick={handleBackToDashboard}>
                대시보드로
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className={styles.buttonContainer}>
              <button className={styles.secondaryButton} onClick={handleBackToDashboard}>
                대시보드로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AnalysisStatus; 