from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys
import json
import boto3
import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.bedrock_agent import answer_question
from tool.sync_kb import sync_kb
from tool.wait_until_kb_sync_complete import wait_until_kb_sync_complete
from config.aws_config import S3_BUCKET, VIDCAP_API_KEY, BEDROCK_KB_ID, BEDROCK_DS_ID, S3_PREFIX

# 환경 변수 세팅
if S3_BUCKET:
    os.environ["S3_BUCKET"] = S3_BUCKET
if VIDCAP_API_KEY:
    os.environ["VIDCAP_API_KEY"] = VIDCAP_API_KEY

app = FastAPI(title="Bedrock Chatbot API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React 개발 서버
        "http://localhost:5173",  # Vite 개발 서버
        "http://localhost:8080",  # 기타 포트
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080"
    ],
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

class YouTubeAnalysisRequest(BaseModel):
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

# 공통 YouTube 처리 함수
async def process_youtube_common(youtube_url: str):
    """YouTube URL을 처리하는 공통 함수 - vidcap API 호출, S3 저장, KB 동기화"""
    print(f"=== YouTube 처리 시작 ===")
    print(f"YouTube URL: {youtube_url}")
    
    # 1. vidcap API로 자막 추출
    api_url = "https://vidcap.xyz/api/v1/youtube/caption"
    params = {"url": youtube_url, "locale": "ko"}
    headers = {"Authorization": f"Bearer {VIDCAP_API_KEY}"}
    
    print(f"vidcap API 요청 중...")
    import requests
    response = requests.get(api_url, params=params, headers=headers)
    response.raise_for_status()
    
    result = response.json()
    text = result.get("data", {}).get("content", "")
    
    if not text.strip():
        raise HTTPException(status_code=204, detail="자막을 찾을 수 없습니다.")
    
    print(f"✅ 자막 추출 완료 (길이: {len(text)}자)")
    
    # 2. S3에 저장
    import uuid
    from urllib.parse import urlparse, parse_qs
    
    def extract_video_id(url):
        parsed_url = urlparse(url)
        if parsed_url.hostname == "youtu.be":
            return parsed_url.path.lstrip("/")
        if parsed_url.hostname in ["www.youtube.com", "youtube.com"]:
            return parse_qs(parsed_url.query).get("v", [""])[0]
        return "unknown"
    
    video_id = extract_video_id(youtube_url)
    filename = f"{video_id}_{uuid.uuid4().hex}.txt"
    
    # S3_PREFIX 사용 (기본값: transcripts/)
    s3_prefix = S3_PREFIX if S3_PREFIX else "transcripts/"
    s3_key = f"{s3_prefix}{filename}"
    
    print(f"S3 저장 정보:")
    print(f"  - S3_BUCKET: {S3_BUCKET}")
    print(f"  - S3_PREFIX: {s3_prefix}")
    print(f"  - s3_key: {s3_key}")
    print(f"  - 파일명: {filename}")
    
    s3 = boto3.client("s3")
    try:
        # 자막 txt 파일 저장
        s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=text.encode("utf-8"))
        print(f"✅ S3 저장 완료: {s3_key}")
        
    except Exception as s3_error:
        print(f"❌ S3 저장 실패: {s3_error}")
        raise HTTPException(status_code=500, detail=f"S3 저장 실패: {s3_error}")
    
    # 3. KB 동기화 Job 실행
    print(f"=== KB 동기화 시작 ===")
    kb_sync_result = "SKIPPED"
    try:
        job_id = sync_kb()
        if job_id:
            print(f"KB 동기화 Job 시작됨: {job_id}")
            # 4. Job 완료 대기
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
    
    print(f"=== YouTube 처리 완료 ===")
    print(f"S3 키: {s3_key}")
    print(f"KB 동기화: {kb_sync_result}")
    
    return {
        "s3_key": s3_key,
        "kb_sync_result": kb_sync_result,
        "content_length": len(text)
    }

@app.post("/api/process-youtube", response_model=YouTubeProcessResponse)
async def process_youtube(request: YouTubeProcessRequest):
    try:
        result = await process_youtube_common(request.youtube_url)
        
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

# 임시 디버깅용 GET 엔드포인트 추가
@app.get("/api/process-youtube")
async def process_youtube_get(youtube_url: str):
    print(f"=== GET 요청으로 YouTube 처리 시작 ===")
    print(f"YouTube URL: {youtube_url}")
    try:
        result = await process_youtube_common(youtube_url)
        
        return {
            "success": True,
            "message": f"YouTube 동영상 처리가 완료되었습니다. S3 키: {result['s3_key']}, KB 동기화: {result['kb_sync_result']}"
        }
    except Exception as e:
        print(f"❌ YouTube 처리 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube 처리 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/chat-history")
async def get_chat_history():
    return {"messages": chat_history}

@app.delete("/api/chat-history")
async def clear_chat_history():
    global chat_history
    chat_history = []
    return {"message": "채팅 히스토리가 삭제되었습니다."}

@app.post("/youtube/analysis")
async def youtube_analysis(request: YouTubeAnalysisRequest):
    """YouTube 분석 엔드포인트 - vidcap API를 사용하여 자막 추출 및 분석"""
    try:
        result = await process_youtube_common(request.youtube_url)
        
        # 5. 분석 결과 반환
        return {
            "success": True,
            "message": "YouTube 동영상 분석이 완료되었습니다.",
            "s3_key": result["s3_key"],
            "kb_sync_result": result["kb_sync_result"],
            "content_length": result["content_length"],
            "analysis_results": {
                "fsm_analysis": {
                    "final_output": {
                        "youtube_url": request.youtube_url,
                        "s3_key": result["s3_key"],
                        "kb_sync_result": result["kb_sync_result"],
                        "content_length": result["content_length"],
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 