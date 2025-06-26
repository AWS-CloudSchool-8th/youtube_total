# 🤖 Bedrock Chatbot

AWS Bedrock을 활용한 YouTube 동영상 기반 지능형 챗봇입니다. YouTube 동영상의 자막을 추출하여 지식 베이스에 저장하고, 사용자의 질문에 대해 정확한 답변을 제공합니다.

## ✨ 주요 기능

- **YouTube 동영상 처리**: YouTube URL을 입력하면 자동으로 자막을 추출하여 지식 베이스에 저장
- **지능형 QA**: Bedrock Claude를 활용한 정확한 질의응답
- **실시간 채팅**: 웹 기반 채팅 인터페이스
- **부드러운 UI**: 검정 바탕에 흰색 글씨의 모던한 디자인

## 🏗️ 아키텍처

```
bedrock_chatbot/
├── api/                    # FastAPI 백엔드
│   └── main.py            # API 서버
├── bedrock_frontend/      # React 프론트엔드
│   └── bedrock_frontend_code/
├── agents/                # Bedrock 에이전트
├── chains/                # LangChain 체인
├── config/                # AWS 설정
├── retrievers/            # 검색기
├── tool/                  # 유틸리티 도구
└── main.py               # 기존 CLI 버전
```

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
# Python 의존성 설치
pip install -r requirements.txt

# React 의존성 설치
cd bedrock_frontend/bedrock_frontend_code
npm install
```

### 2. 환경 변수 설정

AWS 자격 증명과 설정이 필요합니다:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. 서버 실행

#### 백엔드 서버 (FastAPI)
```bash
# 방법 1: 스크립트 사용
python start_server.py

# 방법 2: 직접 실행
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 프론트엔드 서버 (React)
```bash
cd bedrock_frontend/bedrock_frontend_code
npm start
```

### 4. 접속

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 📖 사용법

### 웹 인터페이스 사용

1. **YouTube 동영상 추가**
   - "📺 YouTube 추가" 버튼 클릭
   - YouTube URL 입력 후 "처리" 버튼 클릭
   - 자막 추출 및 지식 베이스 동기화 완료 대기

2. **질문하기**
   - 하단 입력창에 질문 입력
   - Enter 키 또는 전송 버튼 클릭
   - AI가 동영상 내용을 기반으로 답변 제공

3. **대화 관리**
   - "🗑️ 대화 지우기" 버튼으로 채팅 히스토리 삭제

### API 사용

```bash
# 채팅
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"question": "동영상에서 무엇을 설명했나요?"}'

# YouTube 처리
curl -X POST "http://localhost:8000/api/process-youtube" \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=..."}'

# 채팅 히스토리 조회
curl "http://localhost:8000/api/chat-history"
```

## 🛠️ 기술 스택

### 백엔드
- **FastAPI**: 고성능 웹 프레임워크
- **AWS Bedrock**: AI 모델 서비스
- **LangChain**: AI 애플리케이션 프레임워크
- **AWS S3**: 파일 저장소
- **AWS Kendra**: 지식 베이스

### 프론트엔드
- **React**: 사용자 인터페이스
- **Axios**: HTTP 클라이언트
- **CSS3**: 모던한 스타일링

## 🎨 UI 특징

- **다크 테마**: 검정 바탕에 흰색 글씨
- **부드러운 굴곡**: 둥근 모서리와 그라데이션 효과
- **반응형 디자인**: 모바일과 데스크톱 모두 지원
- **실시간 채팅**: 메시지 전송 및 수신 애니메이션

## 🔧 개발

### 프로젝트 구조

```
├── api/main.py              # FastAPI 서버
├── agents/bedrock_agent.py  # Bedrock 에이전트
├── chains/qa_chain.py       # QA 체인
├── config/aws_config.py     # AWS 설정
├── retrievers/kb_retriever.py # 지식 베이스 검색기
├── tool/                    # 유틸리티 도구들
└── bedrock_frontend/        # React 프론트엔드
```

### 코드 수정 시 주의사항

1. **CORS 설정**: 프론트엔드 URL이 변경되면 `api/main.py`의 CORS 설정 업데이트
2. **환경 변수**: AWS 자격 증명과 설정 확인
3. **포트 충돌**: 8000번(백엔드)과 3000번(프론트엔드) 포트 사용

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여

버그 리포트나 기능 제안은 이슈를 통해 해주세요. 풀 리퀘스트도 환영합니다!
