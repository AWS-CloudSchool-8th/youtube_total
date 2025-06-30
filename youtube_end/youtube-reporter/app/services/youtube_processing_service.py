import json
import boto3
import uuid
import os
import requests
from urllib.parse import urlparse, parse_qs
from datetime import datetime
from fastapi import HTTPException
from app.core.config import settings

class YouTubeProcessingService:
    def __init__(self):
        self.s3_client = boto3.client("s3")
        self.s3_bucket = settings.S3_BUCKET
        self.vidcap_api_key = settings.VIDCAP_API_KEY
        self.s3_prefix = "transcripts/"  # transcripts/ 경로에 저장
        
    def extract_video_id(self, url: str) -> str:
        """YouTube URL에서 비디오 ID 추출"""
        parsed_url = urlparse(url)
        if parsed_url.hostname == "youtu.be":
            return parsed_url.path.lstrip("/")
        if parsed_url.hostname in ["www.youtube.com", "youtube.com"]:
            return parse_qs(parsed_url.query).get("v", [""])[0]
        return "unknown"
    
    async def process_youtube_to_s3(self, youtube_url: str, user_email: str = "unknown@example.com") -> dict:
        """YouTube URL을 vidcap API로 처리하여 S3에 저장"""
        print(f"🎬 YouTube 처리 시작: {youtube_url}")
        
        try:
            # 1. vidcap API로 자막 추출
            api_url = "https://vidcap.xyz/api/v1/youtube/caption"
            params = {"url": youtube_url, "locale": "ko"}
            headers = {"Authorization": f"Bearer {self.vidcap_api_key}"}
            
            print(f"📝 자막 추출 중...")
            response = requests.get(api_url, params=params, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            text = result.get("data", {}).get("content", "")
            
            if not text.strip():
                raise HTTPException(status_code=204, detail="자막을 찾을 수 없습니다.")
            
            print(f"✅ 자막 추출 완료 ({len(text)}자)")
            
            # 2. S3에 저장
            video_id = self.extract_video_id(youtube_url)
            filename = f"{video_id}_{uuid.uuid4().hex}.txt"
            
            # 이메일을 prefix로 사용하여 S3 키 생성
            email_prefix = user_email.replace("@", "_at_").replace(".", "_")
            s3_key = f"{self.s3_prefix}{email_prefix}/{filename}"
            
            print(f"  - user_email: {user_email}")
            print(f"  - email_prefix: {email_prefix}")
            print(f"  - s3_key: {s3_key}")
            print(f"  - 파일명: {filename}")
            
            # 자막 txt 파일 저장
            self.s3_client.put_object(
                Bucket=self.s3_bucket, 
                Key=s3_key, 
                Body=text.encode("utf-8")
            )
            print(f"✅ S3 저장 완료")
            
            # 3. 메타데이터 저장
            meta_key = s3_key + ".meta.json"
            meta_content = json.dumps({
                "email": user_email,
                "youtube_url": youtube_url,
                "upload_time": str(datetime.now()),
                "content_length": len(text),
                "video_id": video_id
            })
            
            try:
                self.s3_client.put_object(
                    Bucket=self.s3_bucket, 
                    Key=meta_key, 
                    Body=meta_content.encode("utf-8")
                )
                print(f"✅ 메타데이터 저장 완료: {meta_key}")
            except Exception as meta_error:
                print(f"⚠️ 메타데이터 저장 실패: {meta_error}")
                # 메타데이터 저장 실패해도 메인 파일은 성공했으므로 계속 진행
            
            print(f"🎉 YouTube 처리 완료")
            
            return {
                "success": True,
                "s3_key": s3_key,
                "content_length": len(text),
                "video_id": video_id,
                "message": f"YouTube 동영상 처리가 완료되었습니다. S3 키: {s3_key}"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ YouTube 처리 에러: {str(e)}")
            raise HTTPException(status_code=500, detail=f"YouTube 처리 중 오류가 발생했습니다: {str(e)}")

# 싱글톤 인스턴스
youtube_processing_service = YouTubeProcessingService() 