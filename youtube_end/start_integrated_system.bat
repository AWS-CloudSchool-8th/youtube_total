@echo off
echo 🚀 통합 YouTube 분석 시스템 시작
echo.

echo 📦 Bedrock Chatbot 서버 시작 (포트 8000)...
start "Bedrock Chatbot" cmd /k "cd bedrock_chatbot && venv_bedrock\Scripts\activate && uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload"

echo ⏳ 3초 대기...
timeout /t 3 /nobreak > nul

echo 📦 YouTube Reporter 서버 시작 (포트 8001)...
start "YouTube Reporter" cmd /k "cd youtube-reporter && venv_reporter\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo ⏳ 3초 대기...
timeout /t 3 /nobreak > nul

echo 🌐 React 프론트엔드 시작 (포트 3000)...
start "React Frontend" cmd /k "cd front && npm start"

echo.
echo ✅ 모든 서비스가 시작되었습니다!
echo.
echo 📍 서비스 접속 주소:
echo    - 프론트엔드: http://localhost:3000
echo    - Bedrock Chatbot API: http://localhost:8000
echo    - YouTube Reporter API: http://localhost:8001
echo    - Bedrock API 문서: http://localhost:8000/docs
echo    - Reporter API 문서: http://localhost:8001/docs
echo.
pause 