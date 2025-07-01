import React, { useState } from 'react';
import axios from 'axios';
import { AiOutlineFileText, AiOutlineClose } from "react-icons/ai";
import { useNavigate } from 'react-router-dom';
import styles from './InputBox.module.css';

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
  const navigate = useNavigate();

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
        setError('분석이 실패했습니다.');
        return true; // 완료됨 (실패)
      }
      return false; // 아직 진행 중
    } catch (err) {
      console.error('상태 확인 실패:', err);
      return false;
    }
  };

  const handleSubmit = async (input) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let response;
      if (input instanceof File) {
        const formData = new FormData();
        formData.append('file', input);
        response = await axios.post('/analysis/document', formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (/^https?:\/\//.test(input)) {
        if (/(youtube\.com|youtu\.be)/.test(input)) {
          response = await axios.post('/youtube-reporter/youtube/analyze', { youtube_url: input });
          
          // YouTube 분석의 경우 비동기 처리
          if (response.data.job_id) {
            const jobId = response.data.job_id;
            
            // 2초마다 상태 확인
            const pollInterval = setInterval(async () => {
              const isCompleted = await pollJobStatus(jobId);
              if (isCompleted) {
                clearInterval(pollInterval);
                setLoading(false);
              }
            }, 2000);
            
            // 5분 후 타임아웃
            setTimeout(() => {
              clearInterval(pollInterval);
              setLoading(false);
              setError('분석 시간이 초과되었습니다. 나중에 다시 시도해주세요.');
            }, 300000);
            
            return; // 여기서 함수 종료 (폴링이 계속됨)
          }
        } else {
          response = await axios.post('/youtube/search', { query: input });
        }
      } else {
        response = await axios.post('/youtube/search', { query: input });
      }
      
      setResult(response.data);
      
      // YouTube 분석 결과가 있으면 에디터로 이동 (기존 동기 처리용)
      if (response.data.analysis_results?.fsm_analysis?.final_output) {
        const analysisData = response.data.analysis_results.fsm_analysis;
        navigate('/editor', { 
          state: { 
            analysisData: analysisData
          } 
        });
      }
    } catch (err) {
      setError(err.message || '에러 발생');
    } finally {
      // YouTube 분석이 아닌 경우에만 로딩 해제
      if (!/(youtube\.com|youtu\.be)/.test(input)) {
        setLoading(false);
      }
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
    <div className={styles.container}>
      <div
        className={styles.box}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
      >
        {files.length > 0 && (
          <div className={styles.filesContainer}>
            {files.map((file, idx) => (
              <div key={idx} className={styles.fileTag}>
                <AiOutlineFileText />
                <span className={styles.fileName} title={file.name}>{file.name}</span>
                <button className={styles.removeBtn} onClick={() => removeFile(idx)}>
                  <AiOutlineClose />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          className={styles.input}
          placeholder="텍스트, 파일, 또는 URL 입력"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleInput(); }}
        />
        <input
          type="file"
          className={styles.fileInput}
          id="file-upload"
          multiple
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className={styles.fileLabel}>
          <span className={styles.arrowButton} title="파일 첨부">📎</span>
        </label>
        <button className={styles.arrowButton} onClick={handleInput} title="전송">→</button>
      </div>
      {loading && <div className={styles.loading}>YouTube 영상을 분석 중입니다... (2-5분 소요)</div>}
      {error && <div className={styles.error}>{error}</div>}
      {result && (
        <div className={styles.result}>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default InputBox;