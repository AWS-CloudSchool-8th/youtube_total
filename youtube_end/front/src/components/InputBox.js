import React, { useState } from 'react';
import styled from 'styled-components';
import { AiOutlineFileText, AiOutlineClose } from "react-icons/ai";
import { colors } from "../styles/colors";
import { useNavigate } from 'react-router-dom';
import { apiService } from '../config/api';

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 18px;
  margin-bottom: 10px;
`;

const Box = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: ${colors.bgLight};
  border: 2px solid ${colors.primary};
  border-radius: 18px;
  box-shadow: 0 2px 16px 0 ${colors.navyDark}44;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 8px;
  backdrop-filter: blur(2px);
  transition: border 0.2s, background 0.2s;
  overflow-x: auto;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.13rem;
  color: ${colors.text};
  outline: none;
  padding: 4px 0;
  &::placeholder {
    color: ${colors.gray};
    font-size: 1rem;
  }
`;

const ArrowButton = styled.button`
  background: #111;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: ${colors.white};
  box-shadow: 0 0 8px #222;
  cursor: pointer;
  transition: background 0.2s;
  margin-left: 6px;
  &:hover {
    background: #222;
  }
`;

const FileTag = styled.div`
  display: flex;
  align-items: center;
  background: ${colors.bgLight};
  border-radius: 20px;
  padding: 4px 12px 4px 8px;
  margin-right: 8px;
  font-size: 15px;
`;

const FileName = styled.span`
  margin: 0 6px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${colors.text};
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 4px;
  font-size: 16px;
  color: ${colors.disabled};
  &:hover {
    color: ${colors.error};
  }
`;

const ModeSelector = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  justify-content: center;
`;

const ModeButton = styled.button`
  background: ${props => props.active ? colors.primary : colors.bgLight};
  border: 2px solid ${props => props.active ? colors.primary : colors.gray};
  border-radius: 12px;
  padding: 8px 16px;
  color: ${colors.white};
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  
  &:hover {
    background: ${props => props.active ? colors.primary : colors.bgDark};
    border-color: ${colors.primary};
  }
`;

const LoadingMessage = styled.div`
  color: ${colors.primary};
  text-align: center;
  margin-top: 15px;
  font-size: 1rem;
`;

const ErrorMessage = styled.div`
  color: ${colors.error};
  text-align: center;
  margin-top: 15px;
  font-size: 1rem;
`;

const ResultContainer = styled.div`
  margin-top: 20px;
  background: ${colors.bgLight};
  border-radius: 12px;
  padding: 15px;
  border: 1px solid ${colors.gray};
`;

const ResultTitle = styled.h3`
  color: ${colors.primary};
  margin: 0 0 10px 0;
  font-size: 1.1rem;
`;

const ResultContent = styled.div`
  color: ${colors.text};
  font-size: 0.9rem;
  
  pre {
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
  }
`;

function extractYoutubeId(url) {
  const regExp = /(?:v=|youtu.be\/)([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

const InputBox = () => {
  const [inputValue, setInputValue] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('reporter'); // 'reporter' 또는 'bedrock'
  const navigate = useNavigate();

  const handleSubmit = async (input) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let response;
      
      if (input instanceof File) {
        // 문서 파일 분석 (Reporter API 사용)
        response = await apiService.analyzeDocument(input);
      } else if (/^https?:\/\//.test(input)) {
        if (/(youtube\.com|youtu\.be)/.test(input)) {
          // YouTube URL 처리
          if (analysisMode === 'reporter') {
            // Reporter API로 깊이 있는 분석
            response = await apiService.analyzeYouTube(input);
          } else {
            // Bedrock API로 챗봇용 처리
            response = await apiService.processYouTubeForChatbot(input);
          }
        } else {
          // 일반 URL은 YouTube 검색으로 처리
          response = await apiService.searchYouTube(input);
        }
      } else {
        // 일반 텍스트는 YouTube 검색으로 처리
        response = await apiService.searchYouTube(input);
      }
      
      setResult(response);
      
      // YouTube 분석 결과가 있으면 에디터로 이동
      if (response.analysis_results?.fsm_analysis?.final_output) {
        const analysisData = response.analysis_results.fsm_analysis;
        navigate('/editor', { 
          state: { 
            analysisData: analysisData
          } 
        });
      }
    } catch (err) {
      setError(err.message || '에러 발생');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles([...files, ...newFiles]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles([...files, ...droppedFiles]);
    }
  };

  const handleInput = async () => {
    if (files.length > 0) {
      for (const file of files) {
        await handleSubmit(file);
      }
      setFiles([]);
    } else if (inputValue.trim()) {
      if (/(youtube\.com|youtu\.be)/.test(inputValue.trim())) {
        await handleSubmit(inputValue.trim());
      } else {
        navigate(`/youtube-search?query=${encodeURIComponent(inputValue.trim())}`);
      }
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Container>
      {/* 분석 모드 선택 */}
      <ModeSelector>
        <ModeButton 
          active={analysisMode === 'reporter'} 
          onClick={() => setAnalysisMode('reporter')}
        >
          📊 깊이 있는 분석
        </ModeButton>
      </ModeSelector>
      
      <Box
        isDragOver={isDragOver}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
        style={{ overflowX: 'auto' }}
      >
        {files.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 8 }}>
            {files.map((file, idx) => (
              <FileTag key={idx}>
                <AiOutlineFileText />
                <FileName title={file.name}>{file.name}</FileName>
                <RemoveBtn onClick={() => removeFile(idx)}>
                  <AiOutlineClose />
                </RemoveBtn>
              </FileTag>
            ))}
          </div>
        )}
        <Input
          placeholder="YouTube URL, 문서 파일, 또는 검색어 입력 (YouTube URL은 자동으로 S3 저장 + 분석)"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleInput(); }}
        />
        <input
          type="file"
          style={{ display: 'none' }}
          id="file-upload"
          multiple
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload">
          <ArrowButton as="span" title="파일 첨부">📎</ArrowButton>
        </label>
        <ArrowButton onClick={handleInput} title="전송">→</ArrowButton>
      </Box>
      
      {loading && (
        <LoadingMessage>
          {analysisMode === 'reporter' ? '📊 분석 중입니다...' : '💬 처리 중입니다...'}
        </LoadingMessage>
      )}
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {result && (
        <ResultContainer>
          <ResultTitle>
            {analysisMode === 'reporter' ? '📊 분석 결과' : '💬 처리 결과'}
          </ResultTitle>
          <ResultContent>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </ResultContent>
        </ResultContainer>
      )}
    </Container>
  );
};

export default InputBox; 