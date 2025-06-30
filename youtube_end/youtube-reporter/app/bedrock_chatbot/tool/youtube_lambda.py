#tool/youtube_lambda.py
import json
import boto3
import uuid
import os
import requests
from urllib.parse import urlparse, parse_qs
import sys

# 상위 디렉토리의 app.core.config를 사용하기 위한 경로 설정
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from app.core.config import settings
from tool.sync_kb import sync_kb # 별도 분리하면 좋음
import datetime

# 환경변수로 설정할 것 아마도 필요 없음
if settings.S3_BUCKET:
    os.environ["S3_BUCKET"] = settings.S3_BUCKET
if settings.S3_PREFIX:
    os.environ["S3_PREFIX"] = settings.S3_PREFIX
if settings.VIDCAP_API_KEY:
    os.environ["VIDCAP_API_KEY"] = settings.VIDCAP_API_KEY

def lambda_handler(event, context):
    try:
        # 1. 이벤트로부터 URL 파싱
        print("📥 이벤트 수신:", event)
        body = json.loads(event["body"]) if "body" in event else event
        youtube_url = body.get("url")
        user_email = body.get("email", "unknown@example.com")  # 이메일 추가
        if not youtube_url:
            return {"statusCode": 400, "body": "Missing YouTube URL"}

        # 2. vidcap API 요청
        api_url = "https://vidcap.xyz/api/v1/youtube/caption"
        params = {"url": youtube_url, "locale": "ko"}
        headers = {"Authorization": f"Bearer {settings.VIDCAP_API_KEY}"}
        print("🔑 VIDCAP_API_KEY =", settings.VIDCAP_API_KEY)
        print("🧾 요청 헤더 =", headers)

        response = requests.get(api_url, params=params, headers=headers)

        print("lambda 응답 코드:", response.status_code)
        print("lambda 응답 내용 (RAW):", response.text)  # 추가!!
        
        response.raise_for_status()
        result = response.json()
        text = result.get("data", {}).get("content", "")

        if not text.strip():
            return {"statusCode": 204, "body": "No subtitles found."}

        # 3. 파일 이름 생성 및 S3 업로드
        video_id = extract_video_id(youtube_url)
        filename = f"{video_id}_{uuid.uuid4().hex}.txt"
        # 이메일을 prefix로 사용하여 S3 키 생성
        email_prefix = user_email.replace("@", "_at_").replace(".", "_")
        s3_key = f"{settings.S3_PREFIX}{email_prefix}/{filename}"
        
        print(f"S3 업로드 정보:")
        print(f"  - S3_BUCKET: {settings.S3_BUCKET}")
        print(f"  - S3_PREFIX: {settings.S3_PREFIX}")
        print(f"  - user_email: {user_email}")
        print(f"  - email_prefix: {email_prefix}")
        print(f"  - s3_key: {s3_key}")
        print(f"  - text 길이: {len(text)}")

        s3 = boto3.client("s3")
        print(f"S3 클라이언트 생성 완료")
        
        try:
            s3.put_object(Bucket=settings.S3_BUCKET, Key=s3_key, Body=text.encode("utf-8"))
            print(f"✅ S3 업로드 성공: {s3_key}")
        except Exception as s3_error:
            print(f"❌ S3 업로드 실패: {s3_error}")
            raise s3_error

        # S3 업로드 성공 후 KB 동기화 요청 (로컬 실행 시에는 주석 처리)
        # result = sync_kb()
        # print(f"lambda KB 동기화 요청 결과: {result}")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Subtitle uploaded successfully",
                "s3_key": s3_key
            })
        }

    except Exception as e:
        print("lambda 에러 발생:", str(e))  # 여기 중요!
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }

def extract_video_id(url):
    parsed_url = urlparse(url)
    if parsed_url.hostname == "youtu.be":
        return parsed_url.path.lstrip("/")
    if parsed_url.hostname in ["www.youtube.com", "youtube.com"]:
        return parse_qs(parsed_url.query).get("v", [""])[0]
    return "unknown"

# tool/youtube_lambda.py 안에 아래 함수 추가
def process_youtube_to_s3(youtube_url: str, user_email: str = "unknown@example.com") -> str:
    print(f"process_youtube_to_s3 시작: {youtube_url}, 이메일: {user_email}")
    event = {"url": youtube_url, "email": user_email}  # 이메일 추가
    result = lambda_handler(event, None)  # context는 로컬에선 필요 없음

    print(f"lambda_handler 결과: {result}")
    body = json.loads(result["body"])
    if result["statusCode"] == 200:
        # S3에 이메일 정보도 같이 저장
        s3 = boto3.client("s3")
        meta_key = body["s3_key"] + ".meta.json"
        meta_content = json.dumps({
            "email": user_email,
            "youtube_url": youtube_url,
            "upload_time": str(datetime.datetime.now())
        })
        
        print(f"메타데이터 저장 시도: {meta_key}")
        print(f"메타데이터 내용: {meta_content}")
        
        try:
            s3.put_object(Bucket=settings.S3_BUCKET, Key=meta_key, Body=meta_content.encode("utf-8"))
            print(f"✅ 메타데이터 저장 완료: {meta_key}, 이메일: {user_email}")
        except Exception as meta_error:
            print(f"❌ 메타데이터 저장 실패: {meta_error}")
            # 메타데이터 저장 실패해도 메인 파일은 성공했으므로 계속 진행
        return body["s3_key"]
    else:
        print(f"❌ lambda_handler 실패: {body}")
        raise Exception(body.get("error", "Unknown error"))
