#tool/youtube_lambda.py
import json
import boto3
import uuid
import os
import requests
from urllib.parse import urlparse, parse_qs
from config.aws_config import S3_BUCKET, VIDCAP_API_KEY, S3_PREFIX, AWS_REGION, BEDROCK_KB_ID
from tool.sync_kb import sync_kb # 별도 분리하면 좋음

# 환경변수로 설정할 것 아마도 필요 없음
os.environ["S3_BUCKET"] = S3_BUCKET
os.environ["S3_PREFIX"] = S3_PREFIX
os.environ["VIDCAP_API_KEY"] = VIDCAP_API_KEY

def lambda_handler(event, context):
    try:
        # 1. 이벤트로부터 URL 파싱
        print("📥 이벤트 수신:", event)
        body = json.loads(event["body"]) if "body" in event else event
        youtube_url = body.get("url")
        if not youtube_url:
            return {"statusCode": 400, "body": "Missing YouTube URL"}

        # 2. vidcap API 요청
        api_url = "https://vidcap.xyz/api/v1/youtube/caption"
        params = {"url": youtube_url, "locale": "ko"}
        headers = {"Authorization": f"Bearer {VIDCAP_API_KEY}"}
        print("🔑 VIDCAP_API_KEY =", VIDCAP_API_KEY)
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
        s3_key = f"{S3_PREFIX}{filename}"

        s3 = boto3.client("s3")
        s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=text.encode("utf-8"))

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
def process_youtube_to_s3(youtube_url: str) -> str:
    event = {"url": youtube_url}
    result = lambda_handler(event, None)  # context는 로컬에선 필요 없음

    body = json.loads(result["body"])
    if result["statusCode"] == 200:
        return body["s3_key"]
    else:
        raise Exception(body.get("error", "Unknown error"))
