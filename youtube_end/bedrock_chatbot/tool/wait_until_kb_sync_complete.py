#tool/wait_until_kb_sync_complete.py
import boto3
import time
import json
from botocore.exceptions import ClientError
from config.aws_config import AWS_REGION, BEDROCK_KB_ID, BEDROCK_DS_ID

def wait_until_kb_sync_complete(job_id: str, max_wait_sec: int = 60) -> str:
    """
    지정한 ingestion job이 완료될 때까지 대기 (최대 max_wait_sec초)
    상태는 SUCCEEDED / FAILED / STOPPED 중 하나로 리턴
    """
    client = boto3.client("bedrock-agent", region_name=AWS_REGION)
    print(f"⏳ KB 동기화 대기 시작... (Job ID: {job_id})")

    for i in range(max_wait_sec):
        try:
            jobs = client.list_ingestion_jobs(
                knowledgeBaseId=BEDROCK_KB_ID,
                dataSourceId=BEDROCK_DS_ID
            )
            job = next((j for j in jobs.get("ingestionJobSummaries", []) if j["ingestionJobId"] == job_id), None)

            if not job:
                raise ValueError(f"❌ Job ID '{job_id}'를 찾을 수 없습니다.")

            status = job["status"]
            print(f"🕒 [{i+1}s] 현재 상태: {status}")

            if status in ["COMPLETE", "FAILED", "STOPPED"]:
                print(f"✅ 최종 상태: {status}")
                return status

            time.sleep(1)

        except ClientError as e:
            print("❌ AWS CLIENT ERROR 발생:", str(e))
            print("🧪 AWS 응답:", json.dumps(e.response, indent=2))
            raise
        except Exception as e:
            print("❌ 일반 EXCEPTION 발생:", str(e))
            raise

    raise TimeoutError(f"⏰ {max_wait_sec}초 동안 Job({job_id})이 완료되지 않았습니다.")