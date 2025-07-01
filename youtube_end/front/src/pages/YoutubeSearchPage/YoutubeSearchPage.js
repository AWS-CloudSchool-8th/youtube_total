import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlay, FaEye, FaCalendarAlt, FaFileAlt, FaClock } from "react-icons/fa";
import { useLocation, useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar/TopBar';
import Footer from '../../components/Footer/Footer';
import AuroraBackground from '../../components/AuroraBackground/AuroraBackground';
import styles from './YoutubeSearchPage.module.css';

function formatDuration(duration) {
  if (!duration || duration === "0" || duration === 0) return null;
  const durationNum = typeof duration === 'string' ? parseInt(duration) : duration;
  if (isNaN(durationNum) || durationNum <= 0) return null;
  if (typeof duration === 'string' && duration.startsWith('PT')) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      const seconds = parseInt(match[3]) || 0;
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
  }
  const h = Math.floor(durationNum / 3600);
  const m = Math.floor((durationNum % 3600) / 60);
  const s = durationNum % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

const YoutubeSearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get('query') || '';
  const [query, setQuery] = useState(initialQuery);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState({});

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
    // eslint-disable-next-line
  }, [initialQuery]);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setVideos([]);
    try {
      const res = await axios.post('/youtube/search', { query: q, max_results: 10 });
      setVideos(res.data.videos || []);
    } catch (err) {
      setError('검색 실패: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const onSearchClick = () => {
    if (query.trim()) {
      navigate(`/youtube-search?query=${encodeURIComponent(query.trim())}`);
    }
  };

  const pollJobStatus = async (jobId) => {
    try {
      const response = await axios.get(`/youtube/jobs/${jobId}/status`);
      if (response.data.status === 'completed') {
        // 완료되면 결과 가져오기
        const resultResponse = await axios.get(`/youtube/jobs/${jobId}/result`);
        if (resultResponse.data.content) {
          navigate('/editor', {
            state: {
              analysisData: resultResponse.data.content.report
            }
          });
        }
        return true; // 완료됨
      } else if (response.data.status === 'failed') {
        alert('분석이 실패했습니다.');
        return true; // 완료됨 (실패)
      }
      return false; // 아직 진행 중
    } catch (err) {
      console.error('상태 확인 실패:', err);
      return false;
    }
  };

  const handleSummaryRequest = async (videoId) => {
    setSummaryLoading(prev => ({ ...prev, [videoId]: true }));
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await axios.post('/youtube/analyze', { youtube_url: youtubeUrl });
      
      if (response.data.job_id) {
        // 작업이 시작되었으면 상태를 폴링
        const jobId = response.data.job_id;
        
        // 2초마다 상태 확인
        const pollInterval = setInterval(async () => {
          const isCompleted = await pollJobStatus(jobId);
          if (isCompleted) {
            clearInterval(pollInterval);
            setSummaryLoading(prev => ({ ...prev, [videoId]: false }));
          }
        }, 2000);
        
        // 5분 후 타임아웃
        setTimeout(() => {
          clearInterval(pollInterval);
          setSummaryLoading(prev => ({ ...prev, [videoId]: false }));
          alert('분석 시간이 초과되었습니다. 나중에 다시 시도해주세요.');
        }, 300000);
      }
    } catch (err) {
      alert('요약 요청에 실패했습니다.');
      setSummaryLoading(prev => ({ ...prev, [videoId]: false }));
    }
  };

  return (
    <div className={styles.pageContainer}>
      <AuroraBackground />
      <TopBar />
      <div className={styles.content}>
        <h1 className={styles.mainTitle}>유튜브 영상 검색</h1>
        <p className={styles.subText}>검색어로 유튜브 영상을 찾아보세요. 썸네일, 제목, 채널, 조회수, 업로드일을 한눈에 볼 수 있습니다.</p>
        <div className={styles.searchBar}>
          <input
            className={styles.input}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="유튜브 영상 검색어를 입력하세요"
            onKeyDown={e => { if (e.key === 'Enter') onSearchClick(); }}
          />
          <button className={styles.button} onClick={onSearchClick}>검색</button>
        </div>
      </div>
      {loading && <div style={{ color: '#fff', margin: '32px 0', textAlign: 'center' }}>검색 중입니다...</div>}
      {error && <div className={styles.errorMsg}>{error}</div>}
      <div className={styles.videoList}>
        {videos.map(video => (
          <div className={styles.videoRow} key={video.video_id}>
            <div className={styles.videoContent}>
              <a
                className={styles.thumbnailWrapper}
                href={`https://www.youtube.com/watch?v=${video.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img className={styles.thumbnail} src={video.thumbnail_url} alt={video.title} />
                <FaPlay className={styles.playIcon} />
                {formatDuration(video.duration) && <div className={styles.duration}>{formatDuration(video.duration)}</div>}
              </a>
              <div className={styles.info}>
                <a
                  className={styles.title}
                  href={`https://www.youtube.com/watch?v=${video.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {video.title}
                </a>
                <div className={styles.channel}>{video.channel_title}</div>
                <div className={styles.meta}>
                  <div className={styles.metaItem}>
                    <FaEye />
                    {video.view_count?.toLocaleString?.() ?? video.view_count}
                  </div>
                  <div className={styles.metaItem}>
                    <FaCalendarAlt />
                    {new Date(video.published_at).toLocaleDateString()}
                  </div>
                  {formatDuration(video.duration) && (
                    <div className={styles.metaItem}>
                      <FaClock />
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              className={styles.summaryButton}
              onClick={() => handleSummaryRequest(video.video_id)}
              disabled={summaryLoading[video.video_id]}
            >
              <FaFileAlt />
              {summaryLoading[video.video_id] ? '분석 중...' : '요약 요청'}
            </button>
          </div>
        ))}
      </div>
      {(!loading && videos.length === 0 && !error) && <div style={{marginTop:32, color: '#fff', textAlign: 'center', opacity: 0.8}}>검색 결과가 없습니다.</div>}
      <Footer />
    </div>
  );
};

export default YoutubeSearchPage;