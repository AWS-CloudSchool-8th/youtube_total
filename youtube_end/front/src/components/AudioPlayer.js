import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlay, FaPause, FaVolumeUp, FaDownload } from 'react-icons/fa';
import { colors } from '../styles/colors';

const PlayerContainer = styled.div`
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.2);
  margin: 1rem 0;
`;

const PlayerHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1rem;
`;

const PlayerTitle = styled.h4`
  color: ${colors.white};
  margin: 0;
  font-size: 1rem;
  flex: 1;
`;

const DownloadButton = styled.button`
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  padding: 0.5rem;
  color: ${colors.white};
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(255,255,255,0.2);
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PlayButton = styled.button`
  background: #eaffb7;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7e7e00;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: #f7ffde;
    transform: scale(1.05);
  }
`;

const ProgressContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #eaffb7;
  border-radius: 2px;
  width: ${props => props.progress}%;
  transition: width 0.1s ease;
`;

const TimeDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: ${colors.white};
  opacity: 0.7;
`;

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const VolumeSlider = styled.input`
  width: 60px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #eaffb7;
    border-radius: 50%;
    cursor: pointer;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  color: ${colors.white};
  opacity: 0.7;
  padding: 1rem;
`;

const ErrorState = styled.div`
  text-align: center;
  color: #ff6b6b;
  padding: 1rem;
  font-size: 0.9rem;
`;

const AudioPlayer = ({ audioUrl, title = "오디오 재생", onGenerate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('오디오 로드 중 오류가 발생했습니다.');
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioUrl && onGenerate) {
      setIsLoading(true);
      try {
        await onGenerate();
      } catch (err) {
        setError('오디오 생성 중 오류가 발생했습니다.');
        setIsLoading(false);
        return;
      }
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        await audio.play();
      } catch (err) {
        setError('오디오 재생 중 오류가 발생했습니다.');
        return;
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `${title}.mp3`;
      link.click();
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <PlayerContainer>
        <ErrorState>{error}</ErrorState>
      </PlayerContainer>
    );
  }

  return (
    <PlayerContainer>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}
      
      <PlayerHeader>
        <PlayerTitle>{title}</PlayerTitle>
        {audioUrl && (
          <DownloadButton onClick={handleDownload}>
            <FaDownload />
          </DownloadButton>
        )}
      </PlayerHeader>

      {isLoading ? (
        <LoadingState>오디오 생성 중...</LoadingState>
      ) : (
        <Controls>
          <PlayButton onClick={togglePlay}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </PlayButton>

          <ProgressContainer>
            <ProgressBar onClick={handleProgressClick}>
              <ProgressFill progress={progress} />
            </ProgressBar>
            <TimeDisplay>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </TimeDisplay>
          </ProgressContainer>

          <VolumeContainer>
            <FaVolumeUp color={colors.white} opacity={0.7} />
            <VolumeSlider
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
            />
          </VolumeContainer>
        </Controls>
      )}
    </PlayerContainer>
  );
};

export default AudioPlayer;