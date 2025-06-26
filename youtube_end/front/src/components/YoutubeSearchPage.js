import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { colors } from '../styles/colors';
import { FaPlay, FaEye, FaCalendarAlt, FaFileAlt, FaClock } from "react-icons/fa";
import { useLocation, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import Footer from './Footer';
import AuroraBackground from './AuroraBackground';

const PageContainer = styled.div`
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
  color: white;
`;

const SubText = styled.p`
  font-size: 1.13rem;
  color: ${colors.white};
  font-weight: 400;
  margin: 0.5rem 0 0.5rem 0;
  line-height: 1.7;
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
  background: none;
  border: none;
  display: block;
`;

const SearchBar = styled.div`
  display: flex;
  gap: 8px;
  margin: 18px 0 32px 0;
  width: 100%;
  max-width: 600px;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: ${colors.bgLight};
  border: 2px solid ${colors.primary};
  border-radius: 18px;
  box-shadow: 0 2px 16px 0 ${colors.navyDark}44;
  padding: 10px 16px;
  font-size: 1.13rem;
  color: ${colors.text};
  outline: none;
  backdrop-filter: blur(2px);
  &::placeholder {
    color: ${colors.gray};
    font-size: 1rem;
  }
`;

const Button = styled.button`
  background: ${colors.gradientMain};
  border: none;
  border-radius: 18px;
  padding: 0 22px;
  font-size: 1.05rem;
  color: ${colors.white};
  box-shadow: 0 0 8px #7e5cff88;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
  &:hover {
    background: ${colors.gradientPoint};
    color: ${colors.primary};
  }
`;

const VideoList = styled.div`
  width: 100%;
  max-width: 700px;
  margin: 0 auto 40px auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const VideoRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  background: rgba(255,255,255,0.1);
  border-radius: 16px;
  box-shadow: 0 4px 20px 0 rgba(0,0,0,0.15);
  padding: 20px;
  gap: 20px;
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
  &:hover {
    box-shadow: 0 8px 32px 0 rgba(0,0,0,0.25);
    transform: translateY(-4px);
    background: rgba(255,255,255,0.15);
  }
`;

const VideoContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex: 1;
`;

const ThumbnailWrapper = styled.a`
  position: relative;
  width: 200px;
  min-width: 200px;
  height: 112px;
  display: block;
  border-radius: 12px;
  overflow: hidden;
`;

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.05);
  }
`;

const Duration = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const PlayIcon = styled(FaPlay)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 1.7rem;
  opacity: 0.85;
  pointer-events: none;
`;

const Info = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
`;

const SummaryButton = styled.button`
  background: #eaffb7;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #7e7e00;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  &:hover {
    background: #f7ffde;
  }
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const Title = styled.a`
  font-weight: 700;
  color: ${colors.white};
  font-size: 1.2rem;
  text-decoration: none;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 0 8px rgba(0,0,0,0.5);
  line-height: 1.4;
  &:hover {
    text-decoration: underline;
    color: #eaffb7;
  }
`;

const Channel = styled.div`
  font-size: 0.9rem;
  color: ${colors.white};
  font-weight: 500;
  margin-bottom: 8px;
  opacity: 0.9;
`;

const Meta = styled.div`
  font-size: 0.85rem;
  color: ${colors.white};
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
  opacity: 0.8;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ErrorMsg = styled.div`
  color: ${colors.error};
  margin-top: 20px;
`;

function formatDuration(duration) {
  if (!duration || duration === "0" || duration === 0) return null;
  
  // 문자열 숫자를 숫자로 변환
  const durationNum = typeof duration === 'string' ? parseInt(duration) : duration;
  
  if (isNaN(durationNum) || durationNum <= 0) return null;
  
  // ISO 8601 duration format (PT4M13S) 파싱
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
  
  // 숫자인 경우 (초 단위)
  const h = Math.floor(durationNum / 3600);
  const m = Math.floor((durationNum % 3600) / 60);
  const s = durationNum % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = (now - date) / 1000;
  if (diff < 60 * 60 * 24) return `${Math.floor(diff / (60 * 60))}시간 전`;
  if (diff < 60 * 60 * 24 * 30) return `${Math.floor(diff / (60 * 60 * 24))}일 전`;
  if (diff < 60 * 60 * 24 * 365) return `${Math.floor(diff / (60 * 60 * 24 * 30))}개월 전`;
  return `${Math.floor(diff / (60 * 60 * 24 * 365))}년 전`;
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

  const handleSummaryRequest = async (videoId) => {
    setSummaryLoading(prev => ({ ...prev, [videoId]: true }));
    
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await axios.post('/youtube/analysis', { youtube_url: youtubeUrl });
      
      if (response.data.analysis_results?.fsm_analysis?.final_output) {
        const analysisData = response.data.analysis_results.fsm_analysis;
        navigate('/editor', { 
          state: { 
            analysisData: analysisData
          } 
        });
      }
    } catch (err) {
      console.error('요약 요청 실패:', err);
      alert('요약 요청에 실패했습니다.');
    } finally {
      setSummaryLoading(prev => ({ ...prev, [videoId]: false }));
    }
  };

  return (
    <PageContainer>
      <AuroraBackground />
      <TopBar />
      <Content>
        <MainTitle>유튜브 영상 검색</MainTitle>
        <SubText>검색어로 유튜브 영상을 찾아보세요. 썸네일, 제목, 채널, 조회수, 업로드일을 한눈에 볼 수 있습니다.</SubText>
        <SearchBar>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="유튜브 영상 검색어를 입력하세요"
            onKeyDown={e => { if (e.key === 'Enter') onSearchClick(); }}
          />
          <Button onClick={onSearchClick}>검색</Button>
        </SearchBar>
      </Content>
      {loading && <div style={{ color: colors.white, margin: '32px 0', textAlign: 'center' }}>검색 중입니다...</div>}
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <VideoList>
        {videos.map(video => (
          <VideoRow key={video.video_id}>
            <VideoContent>
              <ThumbnailWrapper href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noopener noreferrer">
                <Thumbnail src={video.thumbnail_url} alt={video.title} />
                <PlayIcon />
                {formatDuration(video.duration) && <Duration>{formatDuration(video.duration)}</Duration>}
              </ThumbnailWrapper>
              <Info>
                <Title href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noopener noreferrer">
                  {video.title}
                </Title>
                <Channel>{video.channel_title}</Channel>
                <Meta>
                  <MetaItem>
                    <FaEye />
                    {video.view_count?.toLocaleString?.() ?? video.view_count}
                  </MetaItem>
                  <MetaItem>
                    <FaCalendarAlt />
                    {new Date(video.published_at).toLocaleDateString()}
                  </MetaItem>
                  {formatDuration(video.duration) && (
                    <MetaItem>
                      <FaClock />
                      {formatDuration(video.duration)}
                    </MetaItem>
                  )}
                </Meta>
              </Info>
            </VideoContent>
            <SummaryButton 
              onClick={() => handleSummaryRequest(video.video_id)}
              disabled={summaryLoading[video.video_id]}
            >
              <FaFileAlt />
              {summaryLoading[video.video_id] ? '요약 중...' : '요약 요청'}
            </SummaryButton>
          </VideoRow>
        ))}
      </VideoList>
      {(!loading && videos.length === 0 && !error) && <div style={{marginTop:32, color: colors.white, textAlign: 'center', opacity: 0.8}}>검색 결과가 없습니다.</div>}
      <Footer />
    </PageContainer>
  );
};

export default YoutubeSearchPage; 