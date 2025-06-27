# tools/sync_kb.py

import boto3
import json
from botocore.exceptions import ClientError
from config.aws_config import AWS_REGION, BEDROCK_KB_ID, BEDROCK_DS_ID

def sync_kb():
    print("===== Lambda sync_kb ENTRY =====")
    print("MODULE FILE:", __file__)
    print("BEDROCK_DS_ID current:", BEDROCK_DS_ID, type(BEDROCK_DS_ID))
    print("BEDROCK_KB_ID current:", BEDROCK_KB_ID, type(BEDROCK_KB_ID))
    print("AWS_REGION current:", AWS_REGION, type(AWS_REGION))

    # 환경 변수 검증
    if not BEDROCK_KB_ID or not BEDROCK_DS_ID:
        print("❌ KB 동기화 실패: BEDROCK_KB_ID 또는 BEDROCK_DS_ID가 설정되지 않음")
        print(f"BEDROCK_KB_ID: {BEDROCK_KB_ID}")
        print(f"BEDROCK_DS_ID: {BEDROCK_DS_ID}")
        return None

    print("✅ 환경 변수 검증 통과")
    kb_client = boto3.client("bedrock-agent", region_name=AWS_REGION)
    print("✅ Bedrock Agent 클라이언트 생성 완료")

    # ① 진행 중인 Job 확인
    try:
        print("🔍 기존 Job 확인 중...")
        jobs = kb_client.list_ingestion_jobs(
            knowledgeBaseId=BEDROCK_KB_ID,
            dataSourceId=BEDROCK_DS_ID
        )
        print(f"📋 발견된 Job 수: {len(jobs.get('ingestionJobSummaries', []))}")
        
        for job in jobs.get("ingestionJobSummaries", []):
            print(f"  - Job ID: {job.get('ingestionJobId')}, Status: {job.get('status')}")
            if (
                str(job.get("dataSourceId")) == str(BEDROCK_DS_ID) and
                job.get("status") in ["STARTING", "IN_PROGRESS", "COMPLETE"]
            ):
                job_id = job["ingestionJobId"]
                print(f"⚠️ 진행 중인 Job이 있습니다: {job_id} → 재사용")
                return str(job_id)
    except Exception as e:
        print(f"⚠️ 기존 Job 확인 중 오류: {e}")

    # ② 새로 요청
    try:
        # AWS Bedrock Agent API의 정확한 파라미터명 사용 (camelCase)
        params = {
            "knowledgeBaseId": str(BEDROCK_KB_ID),
            "dataSourceId": str(BEDROCK_DS_ID)
        }
        print("🚀 새로운 Ingestion Job 시작 요청...")
        print("Calling start_ingestion_job params:", params)
        print("파라미터 타입:", {k: type(v) for k, v in params.items()})
        print("파라미터 값 확인:")
        print(f"  knowledgeBaseId: '{params['knowledgeBaseId']}' (길이: {len(params['knowledgeBaseId'])})")
        print(f"  dataSourceId: '{params['dataSourceId']}' (길이: {len(params['dataSourceId'])})")

        response = kb_client.start_ingestion_job(**params)
        job_id = response["ingestionJob"]["ingestionJobId"]
        print("✅ Job Started:", job_id)
        return str(job_id)

    except ClientError as e:
        print("❌ AWS CLIENT ERROR 발생")
        print("💥", str(e))
        print("🧪 RAW AWS RESPONSE:", json.dumps(e.response, indent=2, ensure_ascii=False))
        return None
    except Exception as e:
        print("❌ 일반 EXCEPTION 발생")
        print("💥", str(e))
        return None