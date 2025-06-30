from fastapi import APIRouter, HTTPException
from typing import List
import datetime
from models.chat import (
    QuestionRequest, QuestionResponse, YouTubeProcessRequest, YouTubeProcessResponse, ChatMessage, YouTubeAnalysisRequest
)
from services.chat_service import answer_question, process_youtube_common

router = APIRouter()

chat_history: List[ChatMessage] = []

@router.get("/")
async def root():
    return {"message": "Bedrock Chatbot API is running!"}

@router.post("/api/chat", response_model=QuestionResponse)
async def chat(request: QuestionRequest):
    try:
        answer = answer_question(request.question)
        chat_history.append(ChatMessage(
            role="user",
            content=request.question,
            timestamp=datetime.datetime.now().isoformat()
        ))
        chat_history.append(ChatMessage(
            role="assistant",
            content=answer,
            timestamp=datetime.datetime.now().isoformat()
        ))
        return QuestionResponse(answer=answer, success=True)
    except Exception as e:
        return QuestionResponse(
            answer="",
            success=False,
            error=str(e)
        )

@router.post("/api/process-youtube", response_model=YouTubeProcessResponse)
async def process_youtube(request: YouTubeProcessRequest):
    try:
        result = await process_youtube_common(request.youtube_url)
        return YouTubeProcessResponse(
            success=True,
            message=f"YouTube 동영상 처리가 완료되었습니다. S3 키: {result['s3_key']}, KB 동기화: {result['kb_sync_result']}"
        )
    except Exception as e:
        return YouTubeProcessResponse(success=False, message="", error=str(e))

@router.get("/api/process-youtube")
async def process_youtube_get(youtube_url: str):
    result = await process_youtube_common(youtube_url)
    return result

@router.get("/api/chat-history")
async def get_chat_history():
    return chat_history

@router.delete("/api/chat-history")
async def clear_chat_history():
    chat_history.clear()
    return {"message": "Chat history cleared."}

@router.post("/youtube/analysis")
async def youtube_analysis(request: YouTubeAnalysisRequest):
    # TODO: 분석 서비스 연동
    return {"message": "분석 기능은 준비 중입니다."} 