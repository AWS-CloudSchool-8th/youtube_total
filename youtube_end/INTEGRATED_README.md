# 🚀 통합 YouTube 분석 시스템

YouTube 동영상을 분석하고 챗봇과 대화할 수 있는 통합 시스템입니다.

## 📋 시스템 구성

### 백엔드 서비스
1. **Bedrock Chatbot** (포트 8000) - AWS Bedrock 기반 챗봇
2. **YouTube Reporter** (포트 8001) - LangGraph FSM 기반 분석
3. **React Frontend** (포트 3000) - 통합 사용자 인터페이스

## 🛠️ 설치 및 설정

### 1. 환경 변수 설정

#### Bedrock Chatbot 환경 변수
```bash
# bedrock_chatbot/.env 파일 생성
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_KB_ID=your_kb_id
BEDROCK_DS_ID=your_ds_id
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
S3_BUCKET=your_s3_bucket
S3_PREFIX=youtube-captions/
VIDCAP_API_KEY=your_vidcap_api_key
YOUTUBE_LAMBDA_NAME=your_lambda_function_name
```

#### YouTube Reporter 환경 변수
```bash
# youtube-reporter/.env 파일 생성
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=content-analysis-reports
POLLY_VOICE_ID=Seoyeon
VIDCAP_API_KEY=your_vidcap_api_key
YOUTUBE_API_KEY=your_youtube_api_key
LANGCHAIN_API_KEY=your_langchain_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/backend_final
```

### 2. 가상환경 설정

#### Bedrock Chatbot
```bash
cd bedrock_chatbot
python -m venv venv_bedrock
venv_bedrock\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### YouTube Reporter
```bash
cd youtube-reporter
python -m venv venv_reporter
venv_reporter\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### React Frontend
```bash
cd front
npm install
```

## 🚀 실행 방법

### 방법 1: 통합 스크립트 사용 (권장)
```bash
# Windows
start_integrated_system.bat

# 또는 수동으로 각 서비스 실행
```

### 방법 2: 수동 실행

#### 1단계: Bedrock Chatbot 서버 시작
```bash
cd bedrock_chatbot
venv_bedrock\Scripts\activate
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2단계: YouTube Reporter 서버 시작
```bash
cd youtube-reporter
venv_reporter\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### 3단계: React 프론트엔드 시작
```bash
cd front
npm start
```

## 🌐 접속 주소

- **프론트엔드**: http://localhost:3000
- **Bedrock Chatbot API**: http://localhost:8000
- **YouTube Reporter API**: http://localhost:8001
- **Bedrock API 문서**: http://localhost:8000/docs
- **Reporter API 문서**: http://localhost:8001/docs

## 📖 사용법

### 1. 깊이 있는 분석 모드
- YouTube URL, 문서 파일, 검색어 입력
- LangGraph FSM을 통한 구조화된 분석
- 보고서 생성 및 음성 변환

### 2. 챗봇 대화 모드
- YouTube URL 입력 후 처리
- Bedrock Claude와 실시간 대화
- 동영상 내용 기반 질의응답

## 🔧 주요 기능

### Bedrock Chatbot
- YouTube 자막 추출 및 S3 저장
- AWS Kendra 지식베이스 동기화
- Bedrock Claude 질의응답
- 실시간 채팅 인터페이스

### YouTube Reporter
- YouTube, 문서, 검색 결과 통합 분석
- LangGraph FSM 구조화된 분석
- ROUGE 점수 계산
- AWS Polly 음성 변환
- 사용자별 분석 히스토리

### React Frontend
- 아우라 배경의 모던한 UI
- 두 백엔드 API 통합 사용
- 분석 모드 선택 기능
- 실시간 상태 모니터링

## 🏗️ 아키텍처

```
Frontend (React:3000)
    ↓
┌─────────────────┬─────────────────┐
│ Bedrock Chatbot │ YouTube Reporter │
│ (포트 8000)     │ (포트 8001)     │
└─────────────────┴─────────────────┘
    ↓
AWS Services (S3, Polly, Kendra, Bedrock)
```

## 🔍 API 엔드포인트

### Bedrock Chatbot API (포트 8000)
- `POST /api/chat` - 챗봇 질문
- `POST /api/process-youtube` - YouTube 처리
- `GET /api/chat-history` - 채팅 히스토리
- `DELETE /api/chat-history` - 히스토리 삭제

### YouTube Reporter API (포트 8001)
- `POST /youtube/analysis` - YouTube 분석
- `POST /youtube/search` - YouTube 검색
- `POST /analysis/document` - 문서 분석
- `GET /analysis/{job_id}` - 분석 상태
- `POST /audio/generate` - 음성 생성
- `GET /audio/stream/{audio_id}` - 음성 스트리밍

## 🐛 문제 해결

### 일반적인 문제들

1. **포트 충돌**
   - 8000, 8001, 3000 포트가 사용 중인지 확인
   - 다른 프로세스 종료 후 재시작

2. **환경 변수 오류**
   - `.env` 파일이 올바른 위치에 있는지 확인
   - AWS 자격 증명이 유효한지 확인

3. **의존성 설치 오류**
   - 가상환경이 활성화되어 있는지 확인
   - Python 버전 호환성 확인 (3.8+ 권장)

4. **CORS 오류**
   - 프론트엔드에서 올바른 API URL 사용 확인
   - 백엔드 CORS 설정 확인

### 로그 확인
```bash
# Bedrock Chatbot 로그
cd bedrock_chatbot
venv_bedrock\Scripts\activate
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug

# YouTube Reporter 로그
cd youtube-reporter
venv_reporter\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload --log-level debug
```

## 📝 개발 가이드

### 새로운 기능 추가
1. 백엔드 API 엔드포인트 추가
2. 프론트엔드 컴포넌트 생성
3. API 설정 파일 업데이트
4. 통합 테스트

### 코드 구조
```
youtube_end/
├── bedrock_chatbot/          # Bedrock 챗봇 백엔드
├── youtube-reporter/         # YouTube 분석 백엔드
├── front/                    # React 프론트엔드
├── start_integrated_system.bat  # 통합 실행 스크립트
└── INTEGRATED_README.md      # 이 파일
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여

버그 리포트나 기능 제안은 이슈를 통해 해주세요! 