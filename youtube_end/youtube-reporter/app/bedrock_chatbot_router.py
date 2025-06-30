from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import datetime
import os
import sys
import jwt

# bedrock_chatbot 모듈 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'bedrock_chatbot'))

# 상대 경로로 import
from .bedrock_chatbot.agents.bedrock_agent import answer_question
from .bedrock_chatbot.tool.sync_kb import sync_kb
from .bedrock_chatbot.tool.wait_until_kb_sync_complete import wait_until_kb_sync_complete
from app.core.config import settings  # 통합된 config 사용
from app.services.cognito_service import get_user_info
import boto3
import requests
import uuid
from urllib.parse import urlparse, parse_qs

router = APIRouter()

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

def get_current_user_email(authorization: Optional[str] = Header(None)) -> str:
    """인증된 사용자의 이메일 가져오기 - JWT 디코딩 사용"""
    if not authorization or not authorization.startswith("Bearer "):
        return "anonymous@example.com"
    
    try:
        id_token = authorization.split(" ")[1]
        
        # JWT 디코딩 (검증 없이)
        payload = jwt.decode(id_token, options={"verify_signature": False})
        
        # email 클레임 추출
        email = payload.get("email")
        if email:
            print(f"🔐 인증된 사용자: {email}")
            return email
        else:
            print("⚠️ JWT에 email 클레임이 없음")
            return "anonymous@example.com"
            
    except Exception as e:
        print(f"⚠️ JWT 디코딩 실패: {e}")
        return "anonymous@example.com"

# 공통 YouTube 처리 함수
async def process_youtube_common(youtube_url: str, user_email: str = "anonymous@example.com"):
    """YouTube URL을 처리하는 공통 함수 - 새로운 YouTubeProcessingService 사용"""
    from app.services.youtube_processing_service import youtube_processing_service
    
    print(f"🎬 YouTube 분석 시작: {youtube_url}")
    
    try:
        # YouTubeProcessingService를 사용하여 YouTube 처리
        result = await youtube_processing_service.process_youtube_to_s3(
            youtube_url=youtube_url,
            user_email=user_email
        )
        
        print(f"✅ YouTube 처리 완료: {result['s3_key']}")
        
        # KB 동기화는 별도로 처리 (기존 로직 유지)
        print(f"🔄 KB 동기화 시작...")
        
        # KB 동기화 활성화
        try:
            job_id = sync_kb()
            if job_id:
                print(f"📋 KB 동기화 Job 시작: {job_id}")
                # Job 완료 대기
                final_status = wait_until_kb_sync_complete(job_id, max_wait_sec=60)
                if final_status == "COMPLETE":
                    kb_sync_result = "SUCCESS"
                    print("✅ KB 동기화 완료")
                else:
                    kb_sync_result = f"FAILED: {final_status}"
                    print(f"❌ KB 동기화 실패: {final_status}")
            else:
                kb_sync_result = "FAILED: No job_id"
                print("❌ KB 동기화 Job ID를 받지 못함")
        except Exception as kb_error:
            kb_sync_result = f"ERROR: {str(kb_error)}"
            print(f"❌ KB 동기화 에러: {kb_error}")
        
        print(f"🎉 분석 완료 - S3: {result['s3_key']}, KB: {kb_sync_result}")
        
        return {
            "s3_key": result["s3_key"],
            "kb_sync_result": kb_sync_result,
            "content_length": result["content_length"]
        }
        
    except Exception as e:
        print(f"❌ YouTube 처리 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube 처리 중 오류가 발생했습니다: {str(e)}")

@router.get("/")
async def root():
    return {"message": "Bedrock Chatbot API is running!"}

@router.post("/bedrock/api/chat", response_model=QuestionResponse)
async def chat(request: QuestionRequest, authorization: Optional[str] = Header(None)):
    try:
        print(f"🤖 챗봇 질문 받음: {request.question}")
        
        # Cognito 인증된 사용자 이메일 가져오기
        user_email = get_current_user_email(authorization)
        print(f"👤 사용자: {user_email}")
        
        # 질문에 대한 답변 생성
        print("🔍 answer_question 함수 호출 시작...")
        answer = answer_question(request.question)
        print(f"✅ 답변 생성 완료: {answer[:100]}...")
        
        # 채팅 히스토리에 추가
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
        print(f"❌ 챗봇 오류 발생: {str(e)}")
        print(f"❌ 오류 타입: {type(e)}")
        import traceback
        print(f"❌ 스택 트레이스: {traceback.format_exc()}")
        return QuestionResponse(
            answer="",
            success=False,
            error=str(e)
        )

@router.post("/bedrock/api/process-youtube", response_model=YouTubeProcessResponse)
async def process_youtube(request: YouTubeProcessRequest, authorization: Optional[str] = Header(None)):
    try:
        # Cognito 인증된 사용자 이메일 가져오기
        user_email = get_current_user_email(authorization)
        
        result = await process_youtube_common(request.youtube_url, user_email)
        
        return YouTubeProcessResponse(
            success=True,
            message=f"YouTube 동영상 처리가 완료되었습니다. S3 키: {result['s3_key']}, KB 동기화: {result['kb_sync_result']}"
        )
    except Exception as e:
        print(f"❌ YouTube 처리 에러: {str(e)}")
        return YouTubeProcessResponse(
            success=False,
            message="YouTube 동영상 처리 중 오류가 발생했습니다.",
            error=str(e)
        )

@router.get("/bedrock/api/process-youtube")
async def process_youtube_get(youtube_url: str, authorization: Optional[str] = Header(None)):
    # Cognito 인증된 사용자 이메일 가져오기
    user_email = get_current_user_email(authorization)
    
    try:
        result = await process_youtube_common(youtube_url, user_email)
        
        return {
            "success": True,
            "message": f"YouTube 동영상 처리가 완료되었습니다. S3 키: {result['s3_key']}, KB 동기화: {result['kb_sync_result']}"
        }
    except Exception as e:
        print(f"❌ YouTube 처리 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube 처리 중 오류가 발생했습니다: {str(e)}")

@router.get("/bedrock/api/chat-history")
async def get_chat_history():
    return {"messages": chat_history}

@router.delete("/bedrock/api/chat-history")
async def clear_chat_history():
    global chat_history
    chat_history = []
    return {"message": "채팅 히스토리가 삭제되었습니다."}

@router.post("/youtube/analysis")
async def youtube_analysis(request: YouTubeProcessRequest, authorization: Optional[str] = Header(None)):
    """YouTube 분석 엔드포인트 - vidcap API를 사용하여 자막 추출 및 분석"""
    try:
        # Cognito 인증된 사용자 이메일 가져오기
        user_email = get_current_user_email(authorization)
        print(f"🔐 YouTube 분석 사용자: {user_email}")
        
        result = await process_youtube_common(request.youtube_url, user_email)
        
        # 5. 분석 결과 반환
        return {
            "success": True,
            "message": "YouTube 동영상 분석이 완료되었습니다.",
            "s3_key": result["s3_key"],
            "kb_sync_result": result["kb_sync_result"],
            "content_length": result["content_length"],
            "user_email": user_email,
            "analysis_results": {
                "fsm_analysis": {
                    "final_output": {
                        "youtube_url": request.youtube_url,
                        "s3_key": result["s3_key"],
                        "kb_sync_result": result["kb_sync_result"],
                        "content_length": result["content_length"],
                        "user_email": user_email,
                        "sections": [
                            {
                                "type": "paragraph",
                                "content": f"YouTube 동영상 분석이 완료되었습니다. S3 키: {result['s3_key']}, KB 동기화: {result['kb_sync_result']}, 자막 길이: {result['content_length']}자"
                            }
                        ]
                    }
                }
            }
        }
        
    except Exception as e:
        print(f"❌ YouTube 분석 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube 분석 중 오류가 발생했습니다: {str(e)}") 