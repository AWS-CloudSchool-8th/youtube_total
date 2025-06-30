from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.models.auth import SignUpRequest, ConfirmSignUpRequest, SignInRequest, RefreshTokenRequest
from app.services.cognito_service import (
    sign_up_user, confirm_user_signup, sign_in_user, 
    refresh_user_token, get_user_info, verify_access_token
)
from botocore.exceptions import ClientError

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/signup")
def signup(req: SignUpRequest):
    try:
        result = sign_up_user(req.email, req.password)  
        return {"email": req.email, **result}
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])
    
@router.post("/confirm")
def confirm_signup(req: ConfirmSignUpRequest):
    try:
        return confirm_user_signup(req.email, req.code)
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])
    
@router.post("/login")
def login(req: SignInRequest):
    print("="*30)
    print("🔐 로그인 요청 받음")
    print(f"📧 이메일: {req.email}")
    print(f"🔑 비밀번호: {'*' * len(req.password)} (길이: {len(req.password)})")
    print("="*30)
    try:
        return sign_in_user(req.email, req.password)
    except ClientError as e:
        print(f"❌ Cognito 로그인 실패: {e.response['Error']['Message']}")
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])

@router.post("/refresh")
def refresh_token(req: RefreshTokenRequest):
    """토큰 갱신"""
    try:
        return refresh_user_token(req.refresh_token, req.email)
    except ClientError as e:
        raise HTTPException(status_code=401, detail=e.response["Error"]["Message"])

@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    """현재 사용자 정보 조회"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    access_token = authorization.split(" ")[1]
    try:
        return get_user_info(access_token)
    except ClientError as e:
        raise HTTPException(status_code=401, detail=e.response["Error"]["Message"])

@router.get("/verify")
def verify_token(authorization: Optional[str] = Header(None)):
    """토큰 검증"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    access_token = authorization.split(" ")[1]
    result = verify_access_token(access_token)
    
    if not result["valid"]:
        raise HTTPException(status_code=401, detail=result["error"])
    
    return result