import os
from dotenv import load_dotenv
from typing import Optional, List
from pydantic_settings import BaseSettings
from functools import lru_cache

load_dotenv()

class Settings(BaseSettings):
    # 프로젝트 설정
    PROJECT_NAME: str = "AI Analysis API"
    VERSION: str = "1.0.0"

    # AWS 설정
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-west-2"
    S3_BUCKET: Optional[str] = None
    S3_PREFIX: Optional[str] = None

    # Bedrock 설정 (bedrock_chatbot에서 통합)
    BEDROCK_KB_ID: Optional[str] = None
    BEDROCK_DS_ID: Optional[str] = None
    BEDROCK_MODEL_ID: Optional[str] = None
    YOUTUBE_LAMBDA_NAME: Optional[str] = None

    # Polly 설정
    POLLY_VOICE_ID: str = "Seoyeon"

    # CORS 설정
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # API 설정
    API_V1_STR: str = "/api/v1"
    S3_BUCKET_NAME: str = "content-analysis-reports"

    # API 키
    VIDCAP_API_KEY: str = ""

    # YouTube API 설정
    YOUTUBE_API_KEY: Optional[str] = None

    # LangChain 설정
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_ENDPOINT: Optional[str] = None
    LANGCHAIN_PROJECT: Optional[str] = None
    LANGCHAIN_TRACING_V2: Optional[str] = None

    # AWS Cognito 설정
    COGNITO_USER_POOL_ID: Optional[str] = None
    COGNITO_CLIENT_ID: Optional[str] = None
    COGNITO_CLIENT_SECRET: Optional[str] = None
    
    # 데이터베이스 설정
    DATABASE_URL: str = "postgresql://user:password@35.94.188.189:5432/backend_final"
    
    # Redis 설정
    REDIS_HOST: str = "35.94.188.189"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    class Config:
        case_sensitive = True
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()