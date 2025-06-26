import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaDownload, FaShare, FaEye, FaCalendarAlt, FaFileAlt, FaPlay, FaSpinner } from 'react-icons/fa';
import AuroraBackground from './AuroraBackground';
import TopBar from './TopBar';
import Footer from './Footer';
import { colors } from '../styles/colors';
import axios from 'axios';

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
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: ${colors.white};
  opacity: 0.8;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  background: ${props => props.active ? '#eaffb7' : 'rgba(255,255,255,0.1)'};
  color: ${props => props.active ? '#7e7e00' : colors.white};
  border: none;
  border-radius: 20px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: ${props => props.active ? '#f7ffde' : 'rgba(255,255,255,0.2)'};
  }
`;

const ReportsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const ReportCard = styled.div`
  background: rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.2);
  transition: all 0.3s ease;
  cursor: pointer;
  &:hover {
    background: rgba(255,255,255,0.15);
    transform: translateY(-4px);
  }
`;

const ReportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ReportType = styled.span`
  background: #eaffb7;
  color: #7e7e00;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const ReportTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${colors.white};
  margin-bottom: 0.5rem;
  line-height: 1.4;
`;

const ReportMeta = styled.div`
  font-size: 0.9rem;
  color: ${colors.white};
  opacity: 0.7;
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ReportPreview = styled.div`
  font-size: 0.9rem;
  color: ${colors.white};
  opacity: 0.8;
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 0.5rem;
  color: ${colors.white};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: rgba(255,255,255,0.2);
  }
`;

const PrimaryButton = styled(ActionButton)`
  background: #eaffb7;
  color: #7e7e00;
  border: none;
  &:hover {
    background: #f7ffde;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${colors.white};
  opacity: 0.6;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${colors.white};
  gap: 1rem;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #ff6b6b;
  background: rgba(255,0,0,0.1);
  border-radius: 12px;
  margin-bottom: 2rem;
`;

const ReportsPage = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // S3에서 보고서 목록 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        
        // 메타데이터 목록 가져오기
        const response = await axios.get('/reports/list');
        
        if (response.data && Array.isArray(response.data)) {
          // 보고서 데이터 처리
          const reportsList = response.data.map(report => {
            // 보고서 내용 추출
            let preview = '';
            if (report.content) {
              try {
                const content = JSON.parse(report.content);
                if (content.sections) {
                  preview = content.sections
                    .filter(section => section.type === 'paragraph')
                    .map(section => section.content)
                    .slice(0, 2)
                    .join(' ');
                }
              } catch (e) {
                preview = report.content.substring(0, 150) + '...';
              }
            }
            
            return {
              id: report.key || report.id,
              title: report.title || extractTitleFromKey(report.key) || '제목 없음',
              type: report.type || 'YouTube',
              date: report.last_modified || report.created_at || new Date().toISOString(),
              size: formatFileSize(report.size) || '1.5MB',
              preview: preview || '보고서 내용을 불러올 수 없습니다.',
              hasAudio: report.has_audio || false,
              downloadUrl: report.url || report.s3_url,
              youtubeUrl: report.youtube_url || '',
              metadata: report.metadata || {}
            };
          });
          
          // 최신순 정렬
          reportsList.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          setReports(reportsList);
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
        
        if (response.data && Array.isArray(response.data.objects)) {
          const reportsList = await Promise.all(
            response.data.objects
              .filter(obj => obj.Key.endsWith('.json'))
              .map(async obj => {
                const reportUrl = `https://${response.data.bucket}.s3.${response.data.region}.amazonaws.com/${obj.Key}`;
                let preview = '';
                
                // 보고서 내용 가져오기 시도
                try {
                  const contentResponse = await axios.get(reportUrl);
                  if (contentResponse.data && contentResponse.data.sections) {
                    preview = contentResponse.data.sections
                      .filter(section => section.type === 'paragraph')
                      .map(section => section.content)
                      .slice(0, 2)
                      .join(' ');
                  }
                } catch (e) {
                  preview = '보고서 내용을 불러올 수 없습니다.';
                }
                
                return {
                  id: obj.Key,
                  title: extractTitleFromKey(obj.Key) || '제목 없음',
                  type: 'YouTube',
                  date: obj.LastModified || new Date().toISOString(),
                  size: formatFileSize(obj.Size) || '1.5MB',
                  preview: preview,
                  hasAudio: false,
                  downloadUrl: reportUrl
                };
              })
          );
          
          // 최신순 정렬
          reportsList.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          setReports(reportsList);
        } else {
          // 더미 데이터 (S3 접근도 실패한 경우)
          const dummyReports = [
            {
              id: 'report_1',
              title: '최근 분석한 YouTube 영상',
              type: 'YouTube',
              date: new Date().toISOString(),
              size: '1.5MB',
              preview: '보고서 내용을 불러올 수 없습니다.',
              hasAudio: false,
              downloadUrl: '#'
            }
          ];
          
          setReports(dummyReports);
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
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // job_id나 UUID 제거
    const cleanName = nameWithoutExt
      .replace(/_report$/, '')
      .replace(/^report_/, '')
      .replace(/[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12}/i, '');
    
    // 언더스코어를 공백으로 변환
    return cleanName.replace(/_/g, ' ').trim() || '분석 보고서';
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '1.5MB';
    
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
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

  const filteredReports = reports.filter(report => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'youtube') return report.type === 'YouTube';
    if (activeFilter === 'document') return report.type === 'Document';
    if (activeFilter === 'audio') return report.hasAudio;
    return true;
  });

  const handleReportClick = async (report) => {
    try {
      // 보고서 URL이 있으면 해당 URL에서 데이터 가져오기
      if (report.downloadUrl) {
        const response = await axios.get(report.downloadUrl);
        
        if (response.data) {
          navigate('/editor', { 
            state: { 
              analysisData: {
                youtube_url: report.youtubeUrl,
                final_output: response.data
              }
            } 
          });
          return;
        }
      }
      
      // URL이 없거나 가져오기 실패한 경우 기본 데이터로 이동
      navigate('/editor', { 
        state: { 
          analysisData: { 
            final_output: { 
              sections: [{ content: `${report.title}에 대한 분석 결과입니다.` }] 
            } 
          } 
        } 
      });
    } catch (err) {
      console.error('보고서 데이터 가져오기 실패:', err);
      
      // 오류 발생 시 기본 데이터로 이동
      navigate('/editor', { 
        state: { 
          analysisData: { 
            final_output: { 
              sections: [{ content: `${report.title}에 대한 분석 결과입니다.` }] 
            } 
          } 
        } 
      });
    }
  };

  const handleDownload = (report, e) => {
    e.stopPropagation();
    
    if (report.downloadUrl) {
      // 새 탭에서 열기
      window.open(report.downloadUrl, '_blank');
    }
  };

  const handleShare = (report, e) => {
    e.stopPropagation();
    
    // 공유 기능 (클립보드에 URL 복사)
    if (report.downloadUrl) {
      navigator.clipboard.writeText(report.downloadUrl)
        .then(() => alert('보고서 URL이 클립보드에 복사되었습니다.'))
        .catch(() => alert('클립보드 복사에 실패했습니다.'));
    }
  };

  const handlePlayAudio = (report, e) => {
    e.stopPropagation();
    
    // 오디오 재생 기능
    if (report.hasAudio) {
      alert('오디오 재생 기능은 아직 구현되지 않았습니다.');
    }
  };

  return (
    <PageContainer>
      <AuroraBackground />
      <TopBar />
      <Content>
        <Header>
          <Title>보고서 관리</Title>
          <Subtitle>저장된 분석 보고서를 확인하고 관리하세요</Subtitle>
        </Header>

        <FilterBar>
          <FilterButton 
            active={activeFilter === 'all'} 
            onClick={() => setActiveFilter('all')}
          >
            전체
          </FilterButton>
          <FilterButton 
            active={activeFilter === 'youtube'} 
            onClick={() => setActiveFilter('youtube')}
          >
            YouTube
          </FilterButton>
          <FilterButton 
            active={activeFilter === 'document'} 
            onClick={() => setActiveFilter('document')}
          >
            문서
          </FilterButton>
          <FilterButton 
            active={activeFilter === 'audio'} 
            onClick={() => setActiveFilter('audio')}
          >
            오디오 있음
          </FilterButton>
        </FilterBar>

        {error && (
          <ErrorState>{error}</ErrorState>
        )}
        
        {loading ? (
          <LoadingState>
            <FaSpinner size={40} className="fa-spin" />
            <div>보고서 목록을 불러오는 중입니다...</div>
          </LoadingState>
        ) : filteredReports.length > 0 ? (
          <ReportsList>
            {filteredReports.map(report => (
              <ReportCard key={report.id} onClick={() => handleReportClick(report)}>
                <ReportHeader>
                  <ReportType>{report.type}</ReportType>
                </ReportHeader>
                
                <ReportTitle>{report.title}</ReportTitle>
                
                <ReportMeta>
                  <span><FaCalendarAlt /> {formatDate(report.date)}</span>
                  <span>•</span>
                  <span>{report.size}</span>
                  {report.hasAudio && (
                    <>
                      <span>•</span>
                      <span><FaPlay /> 오디오</span>
                    </>
                  )}
                </ReportMeta>
                
                <ReportPreview>{report.preview}</ReportPreview>
                
                <ActionButtons>
                  <ActionButton onClick={(e) => handleShare(report, e)}>
                    <FaShare />
                  </ActionButton>
                  {report.hasAudio && (
                    <ActionButton onClick={(e) => handlePlayAudio(report, e)}>
                      <FaPlay />
                    </ActionButton>
                  )}
                  <ActionButton onClick={(e) => handleReportClick(report)}>
                    <FaEye />
                  </ActionButton>
                  <PrimaryButton onClick={(e) => handleDownload(report, e)}>
                    <FaDownload />
                  </PrimaryButton>
                </ActionButtons>
              </ReportCard>
            ))}
          </ReportsList>
        ) : (
          <EmptyState>
            <FaFileAlt size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div>저장된 보고서가 없습니다.</div>
          </EmptyState>
        )}
      </Content>
      <Footer />
    </PageContainer>
  );
};

export default ReportsPage;