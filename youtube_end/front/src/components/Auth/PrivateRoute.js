const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('로그인이 필요합니다.');
    return <Navigate to="/" replace />; // 또는 로그인 모달/페이지로 이동
  }
  return children;
};
