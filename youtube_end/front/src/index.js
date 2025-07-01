import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createGlobalStyle } from 'styled-components';
import axios from "axios";
import YoutubeSearchPage from './pages/YoutubeSearchPage/YoutubeSearchPage';
// import FixedNotionEditor from './components/FixedNotionEditor/FixedNotionEditor'; // Not found in pages, so commented out
import Dashboard from './pages/DashboardPage/DashboardPage';
// import AnalysisStatus from './components/AnalysisStatus/AnalysisStatus'; // Not a page, so keep as is or remove if not used
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EditorPage from './pages/EditorPage/EditorPage';

axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

console.log('API BASE URL:', process.env.REACT_APP_API_BASE_URL);

// Axios 인터셉터: 요청 시 access_token 자동 추가
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Axios 인터셉터: 401 응답 시 로그인 모달 유도 (예시)
axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // 로그인 모달 띄우기 (전역 상태/이벤트 활용 필요)
      // 예시: window.dispatchEvent(new Event('show-login-modal'));
      // 또는 전역 상태관리(Recoil, Redux 등)로 로그인 모달 상태 변경
      alert('로그인이 필요합니다.');
      // location.href = '/login'; // 또는 로그인 페이지로 이동
    }
    return Promise.reject(err);
  }
);

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;

// PrivateRoute 컴포넌트 이거 주석 풀어줘야 로그인해야 대시보드 들어가는 기능이 활성화 됨됨
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('로그인이 필요합니다.');
    return <Navigate to="/" replace />; // 또는 로그인 모달/페이지로 이동
  }
  return children;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
// <React.StrictMode>
  <>
    <GlobalStyle />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/youtube-search" element={<PrivateRoute><YoutubeSearchPage /></PrivateRoute>} />
        <Route path="/editor" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        {/* <Route path="/analysis/:jobId" element={<PrivateRoute><AnalysisStatus /></PrivateRoute>} /> */}
      </Routes>
    </BrowserRouter>
  </>
//  </React.StrictMode>
);