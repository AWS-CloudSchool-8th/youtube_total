import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar/TopBar';
import Footer from '../../components/Footer/Footer';
import axios from 'axios';
import styles from './DashboardPage.module.css';
import { FaTasks, FaSpinner, FaClock, FaPlay, FaDownload } from 'react-icons/fa';
import Ballpit from '../../components/Ballpit/Ballpit';

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
  const [processingJobs, setProcessingJobs] = useState([]);

  useEffect(() => {
    let interval;
    const fetchJobs = async () => {
      try {
        const res = await axios.get('/youtube-reporter/jobs');
        if (res.data && Array.isArray(res.data.jobs)) {
          const processing = res.data.jobs.filter(j => j.status === 'processing');
          setProcessingJobs(processing);
        }
      } catch (e) {
        console.error('작업 목록 조회 실패:', e);
      }
    };

    fetchJobs();
    interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/s3/reports/list');
        if (Array.isArray(response.data) && response.data.length > 0) {
          setRecentAnalyses(response.data);
          setStats({
            totalAnalyses: response.data.length,
            savedReports: response.data.length,
            audioFiles: response.data.filter(r => r.hasAudio).length,
            totalViews: response.data.length * 3
          });
        } else {
          setRecentAnalyses([]);
          setStats({ totalAnalyses: 0, savedReports: 0, audioFiles: 0, totalViews: 0 });
        }
      } catch (err) {
        console.error('보고서 목록 조회 에러:', err);
        setError('보고서 목록을 가져오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

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

  const handleAnalysisClick = (analysis) => {
    setLoading(true);
    if (analysis.url) {
      fetch(analysis.url)
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
                report: parsedData.report,
                title: analysis.title
              }
            }
          });
        })
        .catch(error => {
          console.error('보고서 데이터 조회 에러:', error);
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

  const handlePlayAudio = (analysis, e) => {
    e.stopPropagation();
    if (analysis.hasAudio) {
      alert('오디오 재생 기능은 아직 구현되지 않았습니다.');
    }
  };

  const handleDownload = (analysis, e) => {
    e.stopPropagation();
    if (analysis.reportUrl) {
      window.open(analysis.reportUrl, '_blank');
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* ✅ Ballpit: 완전한 배경 캔버스 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        <Ballpit
          count={70}
          gravity={0.7}
          friction={0.8}
          wallBounce={0.95}
          followCursor={true}
          colors={['#ff4d4f', '#40a9ff', '#73d13d', '#fadb14', '#9254de']}
        />
      </div>

      {/* ✅ Aurora: Ballpit 위 시각 효과 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none'
      }}>

      </div>

      {/* ✅ 콘텐츠: 최상단 */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <TopBar />
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>대시보드</h1>
            <div className={styles.subtitle}>분석 현황과 최근 활동을 확인하세요</div>
          </div>

          {processingJobs.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}><FaTasks /> 진행중인 작업</div>
              <div className={styles.analysisList}>
                {processingJobs.map(job => (
                  <div className={styles.analysisItem} key={job.id}>
                    <div className={styles.analysisInfo}>
                      <div className={styles.analysisDetails}>
                        <div className={styles.analysisTitle}>
                          {job.input_data?.youtube_url || 'YouTube 분석'}
                        </div>
                        <div className={styles.analysisMeta}>
                          <span>Job ID: {job.id}</span>
                          <span>•</span>
                          <span>상태: 진행중</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.actionButtons}>
                      <FaSpinner className={styles.faSpin} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.totalAnalyses}</div>
              <div className={styles.statLabel}>총 분석 횟수</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.savedReports}</div>
              <div className={styles.statLabel}>저장된 보고서</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.audioFiles}</div>
              <div className={styles.statLabel}>오디오 파일</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.totalViews}</div>
              <div className={styles.statLabel}>총 조회수</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>분석 결과</div>
            {error && <div className={styles.errorState}>{error}</div>}
            {loading ? (
              <div className={styles.loadingState}>
                <FaSpinner size={40} className={styles.faSpin} />
                <div>보고서 목록을 불러오는 중입니다...</div>
              </div>
            ) : recentAnalyses.length > 0 ? (
              <div className={styles.analysisList}>
                {recentAnalyses.map((analysis, index) => (
                  <div
                    className={styles.analysisItem}
                    key={analysis.id || index}
                    onClick={() => handleAnalysisClick(analysis)}
                  >
                    <div className={styles.analysisInfo}>
                      {analysis.youtube_thumbnail && (
                        <img src={analysis.youtube_thumbnail} alt={analysis.title} className={styles.thumbnail} />
                      )}
                      <div className={styles.analysisDetails}>
                        <div className={styles.analysisTitle}>{analysis.title}</div>
                        <div className={styles.analysisChannel}>{analysis.youtube_channel}</div>
                        <div className={styles.analysisMeta}>
                          <span>{analysis.type}</span>
                          <span>•</span>
                          <span><FaClock /> {formatDate(analysis.last_modified)}</span>
                          <span>•</span>
                          <span>{analysis.youtube_duration}</span>
                          {analysis.youtube_url && (
                            <>
                              <span>•</span>
                              <a href={analysis.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4ade80', textDecoration: 'underline', marginLeft: 4 }}>유튜브 바로가기</a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.actionButtons}>
                      {analysis.hasAudio && (
                        <button className={styles.actionButton} onClick={e => handlePlayAudio(analysis, e)}><FaPlay /></button>
                      )}
                      <button className={styles.actionButton} onClick={e => handleDownload(analysis, e)}><FaDownload /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div>저장된 분석 결과가 없습니다.</div>
                <div>홈페이지에서 YouTube URL을 입력하여 분석을 시작하세요.</div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard; 