import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaDownload, FaClock, FaSpinner, FaTasks } from 'react-icons/fa';
import AuroraBackground from './AuroraBackground';
import TopBar from './TopBar';
import Footer from './Footer';
import { colors } from '../styles/colors';
import axios from 'axios';
import BedrockChat from './BedrockChat';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: #fff;
  background: #000;
  font-family: Arial, sans-serif;
`;

const Content = styled.div`
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #fff;
  text-shadow: 0 0 12px #222;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #bbb;
  opacity: 1;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  background: #181818;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #222;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  color: #bbb;
  opacity: 1;
`;

const Section = styled.div`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  color: #fff;
  text-shadow: 0 0 8px #222;
`;

const AnalysisList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AnalysisItem = styled.div`
  background: #181818;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #222;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;
  &:hover {
    background: #222;
    transform: translateY(-2px);
  }
`;

const AnalysisInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Thumbnail = styled.img`
  width: 80px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  background: #222;
`;

const AnalysisDetails = styled.div`
  flex: 1;
`;

const AnalysisTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.5rem;
`;

const AnalysisChannel = styled.div`
  font-size: 0.9rem;
  color: #bbb;
  margin-bottom: 0.3rem;
`;

const AnalysisMeta = styled.div`
  font-size: 0.9rem;
  color: #888;
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: #222;
  border: none;
  border-radius: 8px;
  padding: 0.5rem;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: #111;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #888;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #888;
  gap: 1rem;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #ff6b6b;
  background: #220000;
  border-radius: 12px;
  margin-bottom: 2rem;
`;

const FloatingChatbotButton = styled.button`
  position: fixed;
  bottom: 40px;
  right: 40px;
  background: ${colors.primary};
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: background 0.2s;
  &:hover {
    background: ${colors.secondary};
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.55);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    savedReports: 0,
    audioFiles: 0,
    totalViews: 0
  });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 진행중 작업 상태
  const [processingJobs, setProcessingJobs] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [showChatbot, setShowChatbot] = useState(false);

  // 진행중 작업 목록 및 진행률 주기적 fetch
  useEffect(() => {
    let interval;
    const fetchJobs = async () => {
      try {
        const res = await axios.get('/user/jobs');
        if (res.data && Array.isArray(res.data.jobs)) {
          const processing = res.data.jobs.filter(j => j.status === 'processing');
          setProcessingJobs(processing);
        }
      } catch (e) {
        // 무시
      }
    };
    const fetchProgress = async () => {
      for (const job of processingJobs) {
        try {
          const res = await axios.get(`/user/jobs/${job.id}/progress`);
          setProgressMap(prev => ({ ...prev, [job.id]: res.data }));
        } catch (e) {}
      }
    };
    fetchJobs();
    interval = setInterval(() => {
      fetchJobs();
      fetchProgress();
    }, 3000);
    return () => clearInterval(interval);
  }, [processingJobs.length]);

  // S3에서 보고서 목록 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        
        // 백엔드 API를 통해 보고서 목록 가져오기
        const response = await axios.get('/s3/reports/list');
        console.log('API 응답:', response.data);
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // 보고서 데이터 처리 (메타데이터가 이미 포함됨)
          const reports = response.data.map(report => ({
            id: report.id || '',
            title: report.title || '제목 없음',
            channel: report.youtube_channel || 'Unknown Channel',
            duration: report.youtube_duration || 'Unknown',
            thumbnail: report.youtube_thumbnail || '',
            type: report.type || 'YouTube',
            date: report.last_modified || new Date().toISOString(),
            status: 'completed',
            hasAudio: false,
            reportUrl: report.url || '',
            youtubeUrl: report.youtube_url || '',
            metadata: report.metadata || {}
          }));
          
          // 최신순 정렬
          reports.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          setRecentAnalyses(reports);
          
          // 통계 업데이트
          setStats({
            totalAnalyses: reports.length,
            savedReports: reports.length,
            audioFiles: reports.filter(r => r.hasAudio).length,
            totalViews: reports.length * 3
          });
        } else {
          // 백엔드 API가 없는 경우 S3에서 직접 가져오기 시도
          await fetchReportsFromS3();
        }
      } catch (err) {
        console.error('보고서 목록 가져오기 실패:', err);
        
        // 백엔드 API 실패 시 S3에서 직접 가져오기 시도
        try {
          await fetchReportsFromS3();
        } catch (s3Err) {
          setError('보고서 목록을 가져오는데 실패했습니다.');
          console.error('S3에서 보고서 가져오기 실패:', s3Err);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // S3에서 직접 보고서 가져오기 (백업 방법)
    const fetchReportsFromS3 = async () => {
      try {
        // AWS SDK를 직접 사용하는 대신 백엔드 API를 통해 S3 객체 목록 가져오기
        const response = await axios.get('/s3/list?prefix=reports/');
        console.log('S3 API 응답:', response.data);
        
        if (response.data && Array.isArray(response.data.objects) && response.data.objects.length > 0) {
          const reports = response.data.objects
            .filter(obj => obj.Key && obj.Key.endsWith('.json'))
            .map(obj => ({
              id: obj.Key,
              title: extractTitleFromKey(obj.Key) || '제목 없음',
              type: 'YouTube',
              date: obj.LastModified || new Date().toISOString(),
              status: 'completed',
              hasAudio: false,
              reportUrl: `https://${response.data.bucket}.s3.${response.data.region}.amazonaws.com/${obj.Key}`
            }));
          
          // 최신순 정렬
          reports.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          setRecentAnalyses(reports);
          
          // 통계 업데이트
          setStats({
            totalAnalyses: reports.length,
            savedReports: reports.length,
            audioFiles: 0,
            totalViews: reports.length * 3
          });
        } else {
          // 더미 데이터 (S3 접근도 실패한 경우)
          const dummyReports = [
            {
              id: 'report_1',
              title: '최근 분석한 YouTube 영상',
              type: 'YouTube',
              date: new Date().toISOString(),
              status: 'completed',
              hasAudio: false
            }
          ];
          
          setRecentAnalyses(dummyReports);
          setStats({
            totalAnalyses: 1,
            savedReports: 1,
            audioFiles: 0,
            totalViews: 3
          });
        }
      } catch (err) {
        throw err;
      }
    };
    
    fetchReports();
  }, []);

  // 파일 키에서 제목 추출
  const extractTitleFromKey = (key) => {
    if (!key) return '제목 없음';
    
    // 파일 이름 추출
    const fileName = key.split('/').pop();
    
    // 확장자 제거
    const nameWithoutExt = fileName.replace(/\\.[^/.]+$/, '');
    
    // job_id나 UUID 제거
    const cleanName = nameWithoutExt
      .replace(/_report$/, '')
      .replace(/^report_/, '')
      .replace(/[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12}/i, '');
    
    // 언더스코어를 공백으로 변환
    return cleanName.replace(/_/g, ' ').trim() || '분석 보고서';
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // 보고서 클릭 처리
  const handleAnalysisClick = (analysis) => {
    // 로딩 상태 표시
    setLoading(true);
    
    // 보고서 URL이 있는 경우
    if (analysis.reportUrl) {
      // 직접 데이터 가져오기
      fetch(analysis.reportUrl)
        .then(response => response.text())
        .then(data => {
          let parsedData;
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            parsedData = data;
          }

          navigate('/editor', { 
            state: { 
              analysisData: {
                final_output: parsedData,
                title: analysis.title
              }
            } 
          });
        })
        .catch(error => {
          console.error('데이터 가져오기 실패:', error);
          setError('보고서 데이터를 가져오는데 실패했습니다.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setError('보고서 URL을 찾을 수 없습니다.');
      setLoading(false);
    }
  };

  // 오디오 재생
  const handlePlayAudio = (analysis, e) => {
    e.stopPropagation();
    
    if (analysis.hasAudio) {
      alert('오디오 재생 기능은 아직 구현되지 않았습니다.');
    }
  };

  // 다운로드
  const handleDownload = (analysis, e) => {
    e.stopPropagation();
    
    if (analysis.reportUrl) {
      window.open(analysis.reportUrl, '_blank');
    }
  };

  return (
    <PageContainer>
      <AuroraBackground />
      <TopBar />
      <Content>
        <Header>
          <Title>대시보드</Title>
          <Subtitle>분석 현황과 최근 활동을 확인하세요</Subtitle>
        </Header>

        {/* 진행중 작업 섹션 */}
        {processingJobs.length > 0 && (
          <Section>
            <SectionTitle><FaTasks /> 진행중인 작업</SectionTitle>
            <AnalysisList>
              {processingJobs.map(job => (
                <AnalysisItem key={job.id}>
                  <AnalysisInfo>
                    <AnalysisDetails>
                      <AnalysisTitle>{job.input_data?.youtube_url || 'YouTube 분석'}</AnalysisTitle>
                      <AnalysisMeta>
                        <span>Job ID: {job.id}</span>
                        <span>•</span>
                        <span>상태: {job.status === 'processing' ? '진행중' : job.status}</span>
                        <span>•</span>
                        <span>
                          진행률: {progressMap[job.id]?.progress ?? 0}%
                          {progressMap[job.id]?.message ? ` (${progressMap[job.id].message})` : ''}
                        </span>
                      </AnalysisMeta>
                    </AnalysisDetails>
                  </AnalysisInfo>
                  <ActionButtons>
                    <FaSpinner className="fa-spin" />
                  </ActionButtons>
                </AnalysisItem>
              ))}
            </AnalysisList>
          </Section>
        )}

        <StatsGrid>
          <StatCard>
            <StatNumber>{stats.totalAnalyses}</StatNumber>
            <StatLabel>총 분석 횟수</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{stats.savedReports}</StatNumber>
            <StatLabel>저장된 보고서</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{stats.audioFiles}</StatNumber>
            <StatLabel>오디오 파일</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{stats.totalViews}</StatNumber>
            <StatLabel>총 조회수</StatLabel>
          </StatCard>
        </StatsGrid>

        <Section>
          <SectionTitle>분석 결과</SectionTitle>
          
          {error && (
            <ErrorState>{error}</ErrorState>
          )}
          
          {loading ? (
            <LoadingState>
              <FaSpinner size={40} className="fa-spin" />
              <div>보고서 목록을 불러오는 중입니다...</div>
            </LoadingState>
          ) : recentAnalyses.length > 0 ? (
            <AnalysisList>
              {recentAnalyses.map((analysis, index) => (
                <AnalysisItem key={analysis.id || index} onClick={() => handleAnalysisClick(analysis)}>
                  <AnalysisInfo>
                    <Thumbnail src={analysis.thumbnail} alt={analysis.title} />
                    <AnalysisDetails>
                      <AnalysisTitle>{analysis.title}</AnalysisTitle>
                      <AnalysisChannel>{analysis.channel}</AnalysisChannel>
                      <AnalysisMeta>
                        <span>{analysis.type}</span>
                        <span>•</span>
                        <span><FaClock /> {formatDate(analysis.date)}</span>
                        <span>•</span>
                        <span>{analysis.duration}</span>
                        <span>•</span>
                        <span>{analysis.status === 'completed' ? '완료' : '진행중'}</span>
                      </AnalysisMeta>
                    </AnalysisDetails>
                  </AnalysisInfo>
                  <ActionButtons>
                    {analysis.hasAudio && (
                      <ActionButton onClick={(e) => handlePlayAudio(analysis, e)}>
                        <FaPlay />
                      </ActionButton>
                    )}
                    <ActionButton onClick={(e) => handleDownload(analysis, e)}>
                      <FaDownload />
                    </ActionButton>
                  </ActionButtons>
                </AnalysisItem>
              ))}
            </AnalysisList>
          ) : (
            <EmptyState>
              <div>저장된 분석 결과가 없습니다.</div>
              <div>홈페이지에서 YouTube URL을 입력하여 분석을 시작하세요.</div>
            </EmptyState>
          )}
        </Section>
      </Content>
      <Footer />
    </PageContainer>
  );
};

export default Dashboard;