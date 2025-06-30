from fastapi import APIRouter, HTTPException, Request, Depends
from app.models.youtube import (
    YouTubeSearchRequest,
    YouTubeSearchResponse,
    YouTubeAnalysisRequest,
    YouTubeAnalysisResponse
)
from app.services.youtube_service import youtube_service
from app.core.auth import get_current_user

router = APIRouter(
    prefix="/youtube",
    tags=["youtube"]
)

@router.post("/search", response_model=YouTubeSearchResponse)
async def search_videos(request: YouTubeSearchRequest) -> YouTubeSearchResponse:
    """
    YouTube 비디오 검색
    
    - **query**: 검색할 키워드
    - **max_results**: 최대 검색 결과 수 (기본값: 10)
    """
    try:
        return await youtube_service.search_videos(
            query=request.query,
            max_results=request.max_results,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class YouTubeAnalysisRequestBody(BaseModel):
    youtube_url: str

@router.post("/analysis")
async def analyze_youtube_with_fsm(
    request: YouTubeAnalysisRequestBody,
    raw_request: Request,
    # current_user: dict = Depends(get_current_user)  # Temporarily disabled
):
    """LangGraph FSM을 사용한 YouTube 분석 + 챗봇 처리"""
    from app.services.analysis_service import analysis_service
    from app.bedrock_chatbot_router import process_youtube_common
    
    print(f"DEBUG: Content-Type: {raw_request.headers.get('content-type')}")
    print(f"DEBUG: 요청 데이터: {request}")
    print(f"DEBUG: youtube_url: {request.youtube_url}")
    
    body = await raw_request.body()
    print(f"DEBUG: Raw body: {body}")
    
    try:
        # 1. 리포터 분석 서비스 실행
        print("=== 리포터 분석 시작 ===")
        result = await analysis_service.analyze_youtube_with_fsm(
            request.youtube_url,
            user_id="temp_user"  # Temporarily hardcoded
        )
        
        # 2. 챗봇과 KB 동기화 실행
        print("=== 챗봇 처리 시작 ===")
        user_email = "anonymous@example.com"  # 임시 사용자 이메일
        bedrock_result = await process_youtube_common(request.youtube_url, user_email)
        
        # 3. 결과 통합
        combined_result = {
            "analysis_result": result.model_dump() if hasattr(result, 'model_dump') else result.dict() if hasattr(result, 'dict') else result,
            "bedrock_processing": bedrock_result,
            "message": "YouTube 분석과 챗봇 처리가 모두 완료되었습니다."
        }
        
        return combined_result
        
    except Exception as e:
        print(f"DEBUG: 에러 발생: {e}")
        raise HTTPException(status_code=500, detail=f"FSM 분석 실패: {str(e)}") 