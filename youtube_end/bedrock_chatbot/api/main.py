from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.bedrock_agent import answer_question
from tool.youtube_lambda import process_youtube_to_s3
from tool.sync_kb import sync_kb
from tool.wait_until_kb_sync_complete import wait_until_kb_sync_complete
from config.aws_config import S3_BUCKET, VIDCAP_API_KEY

# 환경 변수 세팅
os.environ["S3_BUCKET"] = S3_BUCKET
os.environ["VIDCAP_API_KEY"] = VIDCAP_API_KEY

app = FastAPI(title="Bedrock Chatbot API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic 모델들
class QuestionRequest(BaseModel):
    question: str

class QuestionResponse(BaseModel):
    answer: str
    success: bool
    error: Optional[str] = None

class YouTubeProcessRequest(BaseModel):
    youtube_url: str

class YouTubeProcessResponse(BaseModel):
    success: bool
    message: str
    error: Optional[str] = None

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: str

# 전역 변수로 채팅 히스토리 저장
chat_history: List[ChatMessage] = []

@app.get("/")
async def root():
    return {"message": "Bedrock Chatbot API is running!"}

@app.post("/api/chat", response_model=QuestionResponse)
async def chat(request: QuestionRequest):
    try:
        # 질문에 대한 답변 생성
        answer = answer_question(request.question)
        
        # 채팅 히스토리에 추가
        from datetime import datetime
        chat_history.append(ChatMessage(
            role="user",
            content=request.question,
            timestamp=datetime.now().isoformat()
        ))
        chat_history.append(ChatMessage(
            role="assistant",
            content=answer,
            timestamp=datetime.now().isoformat()
        ))
        
        return QuestionResponse(answer=answer, success=True)
    except Exception as e:
        return QuestionResponse(
            answer="",
            success=False,
            error=str(e)
        )

@app.post("/api/process-youtube", response_model=YouTubeProcessResponse)
async def process_youtube(request: YouTubeProcessRequest):
    try:
        # 1. 자막 추출 + S3 업로드
        s3_key = process_youtube_to_s3(request.youtube_url)
        
        # 2. KB 동기화 Job 실행
        job_id = sync_kb()
        if not job_id:
            raise ValueError("KB 동기화 job_id를 받아오지 못했습니다.")
        
        # 3. Job 완료 대기
        final_status = wait_until_kb_sync_complete(job_id, max_wait_sec=60)
        if final_status != "COMPLETE":
            raise ValueError(f"KB 동기화 실패: 최종 상태 = {final_status}")
        
        return YouTubeProcessResponse(
            success=True,
            message=f"YouTube 동영상 처리가 완료되었습니다. S3 키: {s3_key}"
        )
    except Exception as e:
        return YouTubeProcessResponse(
            success=False,
            message="YouTube 동영상 처리 중 오류가 발생했습니다.",
            error=str(e)
        )

@app.get("/api/chat-history")
async def get_chat_history():
    return {"messages": chat_history}

@app.delete("/api/chat-history")
async def clear_chat_history():
    global chat_history
    chat_history = []
    return {"message": "채팅 히스토리가 삭제되었습니다."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 