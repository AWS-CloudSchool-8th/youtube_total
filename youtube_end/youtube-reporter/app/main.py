from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exception_handlers import RequestValidationError
from fastapi.responses import PlainTextResponse

from app.core.config import settings
from app.routers import analysis, audio, document, youtube, report, auth, user_analysis, s3
from app.core.database import engine
from app.models.database_models import Base
# bedrock_chatbot 라우터 임포트
from app.bedrock_chatbot_router import router as bedrock_chat_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="YouTube, 문서 파일, 검색을 통한 통합 AI 분석 및 보고서 생성",
    version=settings.VERSION
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 상세한 ValidationError 로깅을 위한 핸들러
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("="*50)
    print("🚨 VALIDATION ERROR 발생!")
    print(f"📝 요청 URL: {request.url}")
    print(f"📝 요청 메서드: {request.method}")
    print(f"📝 에러 상세: {exc}")
    print("="*50)
    return PlainTextResponse(str(exc), status_code=400)

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)

# 라우터 등록
app.include_router(auth.router)
app.include_router(user_analysis.router)  # 새로운 사용자별 라우터
app.include_router(analysis.router)
app.include_router(audio.router)
app.include_router(document.router)
app.include_router(youtube.router)
app.include_router(report.router)
app.include_router(s3.router)  # S3 라우터 추가
# bedrock_chatbot 라우터를 등록 (prefix 제거)
app.include_router(bedrock_chat_router)

@app.get("/")
async def root():
    return {
        "message": "통합 콘텐츠 분석 API Server with S3 & Polly",
        "version": settings.VERSION,
        "new_features": [
            "S3 자동 보고서 저장",
            "Polly 음성 변환",
            "오디오 스트리밍 재생"
        ],
        "supported_inputs": [
            "YouTube URLs (단일/다중)",
            "문서 파일 (PDF, DOCX, XLSX, CSV, TXT)",
            "YouTube 검색 키워드"
        ],
        "pipeline": [
            "1. 콘텐츠 추출",
            "2. AI 분석 및 구조화",
            "3. S3 보고서 저장",
            "4. Polly 음성 변환",
            "5. 통합 결과 반환"
        ],
        "endpoints": {
            "youtube_search": "/search",
            "youtube_analysis": "/analysis/youtube",
            "document_analysis": "/analysis/document",
            "search_analysis": "/analysis/search",
            "analysis_status": "/analysis/{job_id}",
            "report_download": "/reports/{report_id}",
            "audio_generation": "/audio/generate",
            "audio_streaming": "/audio/stream/{audio_id}",
            "s3_reports": "/reports/list",
            "s3_list": "/s3/list",
            "health": "/health",
            "bedrock_chat": "/bedrock/api/chat",
            "bedrock_youtube": "/bedrock/api/process-youtube"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 YouTube Reporter API 서버를 시작합니다...")
    print("📡 API 서버: http://localhost:8001")
    print("📖 API 문서: http://localhost:8001/docs")
    print("\n" + "="*50)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )