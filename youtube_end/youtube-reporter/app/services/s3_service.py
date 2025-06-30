import boto3
import os
from app.core.config import settings

class S3Service:
    def __init__(self):
        # 명시적으로 자격 증명 설정
        self.s3_client = boto3.client(
            's3', 
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        
        # S3_BUCKET을 우선 사용하고, 없으면 S3_BUCKET_NAME 사용
        self.bucket_name = settings.S3_BUCKET or settings.S3_BUCKET_NAME
        
        # 초기화 시 버킷 정보 출력
        print(f"🪣 S3 서비스 초기화: 버킷={self.bucket_name}, 리전={settings.AWS_REGION}")
    
    def upload_file(self, file_path, object_name=None, content_type=None):
        """파일을 S3에 업로드"""
        if object_name is None:
            object_name = os.path.basename(file_path)
        
        try:
            extra_args = {}
            if content_type:
                extra_args["ContentType"] = content_type
            
            self.s3_client.upload_file(
                file_path, 
                self.bucket_name, 
                object_name,
                ExtraArgs=extra_args
            )
            
            return f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{object_name}"
        except Exception as e:
            print(f"❌ S3 업로드 실패: {e}")
            raise e
    
    def list_objects(self, prefix="", max_keys=100):
        """S3 버킷 내 객체 목록 조회"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            if 'Contents' in response:
                return response['Contents']
            return []
            
        except Exception as e:
            print(f"❌ S3 객체 목록 조회 실패: {str(e)}")
            return []

    def get_file_content(self, object_name: str) -> str:
        """S3에서 파일 내용을 문자열로 읽어오기"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=object_name
            )
            
            # 파일 내용을 UTF-8로 디코딩
            content = response['Body'].read().decode('utf-8')
            print(f"✅ S3 파일 내용 읽기 성공: {object_name}")
            return content
            
        except Exception as e:
            print(f"❌ S3 파일 내용 읽기 실패: {object_name} - {str(e)}")
            return None

# 싱글톤 인스턴스
s3_service = S3Service()