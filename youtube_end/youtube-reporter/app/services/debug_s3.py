import boto3
import os
from app.core.config import settings

def test_s3_connection():
    """S3 연결 테스트 및 디버깅 정보 출력"""
    print("\n===== S3 연결 테스트 =====")
    
    # 설정 정보 출력
    print(f"S3_BUCKET: {settings.S3_BUCKET}")
    print(f"S3_BUCKET_NAME: {settings.S3_BUCKET_NAME}")
    print(f"S3_PREFIX: {settings.S3_PREFIX}")
    print(f"AWS_REGION: {settings.AWS_REGION}")
    print(f"AWS_ACCESS_KEY_ID: {settings.AWS_ACCESS_KEY_ID[:10] if settings.AWS_ACCESS_KEY_ID else 'None'}...")
    print(f"AWS_SECRET_ACCESS_KEY: {settings.AWS_SECRET_ACCESS_KEY[:10] if settings.AWS_SECRET_ACCESS_KEY else 'None'}...")
    print("-" * 50)
    
    try:
        # S3 클라이언트 생성
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # 버킷 목록 조회
        response = s3_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response['Buckets']]
        print(f"접근 가능한 S3 버킷 목록: {buckets}")
        
        # 지정된 버킷이 목록에 있는지 확인
        bucket_name = settings.S3_BUCKET or settings.S3_BUCKET_NAME
        if bucket_name in buckets:
            print(f"✅ 버킷 '{bucket_name}' 접근 가능")
            
            # 테스트 파일 생성
            test_file = "s3_test_file.txt"
            with open(test_file, "w") as f:
                f.write("S3 테스트 파일")
            
            # 테스트 파일 업로드
            test_key = "test/s3_test_file.txt"
            s3_client.upload_file(
                test_file, 
                bucket_name, 
                test_key,
                ExtraArgs={"ACL": "public-read"}
            )
            os.remove(test_file)
            
            print(f"✅ 테스트 파일 업로드 성공: {test_key}")
            print(f"📂 파일 URL: https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{test_key}")
            
            # 버킷 내 객체 목록 조회
            objects = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
            if 'Contents' in objects:
                print(f"📁 버킷 내 최근 파일 (최대 5개):")
                for obj in objects['Contents']:
                    print(f"  - {obj['Key']} ({obj['Size']} bytes)")
            else:
                print("📁 버킷이 비어 있습니다.")
        else:
            print(f"❌ 버킷 '{bucket_name}'에 접근할 수 없습니다.")
            print(f"💡 버킷이 존재하는지, 그리고 접근 권한이 있는지 확인하세요.")
        
    except Exception as e:
        print(f"❌ S3 연결 테스트 실패: {str(e)}")
        print("💡 AWS 자격 증명과 버킷 설정을 확인하세요.")
    
    print("===== 테스트 완료 =====\n")

if __name__ == "__main__":
    test_s3_connection()