# config/aws_config.py
import os
from dotenv import load_dotenv

load_dotenv()  # .env 파일 자동 로드

AWS_REGION = os.getenv("AWS_REGION")
YOUTUBE_LAMBDA_NAME = os.getenv("YOUTUBE_LAMBDA_NAME")
BEDROCK_KB_ID = os.getenv("BEDROCK_KB_ID")
BEDROCK_DS_ID = os.getenv("BEDROCK_DS_ID")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID")
S3_BUCKET = os.getenv("S3_BUCKET")
S3_PREFIX = os.getenv("S3_PREFIX")
VIDCAP_API_KEY = os.getenv("VIDCAP_API_KEY")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_CLIENT_SECRET = os.getenv("COGNITO_CLIENT_SECRET")