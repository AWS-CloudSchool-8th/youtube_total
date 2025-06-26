# main.py

import os
from tool.youtube_lambda import process_youtube_to_s3
from tool.sync_kb import sync_kb
from tool.wait_until_kb_sync_complete import wait_until_kb_sync_complete
from agents.bedrock_agent import answer_question
from config.aws_config import S3_BUCKET, VIDCAP_API_KEY

# 환경 변수 세팅 (Lambda 아닌 로컬 실행 시 필요)
os.environ["S3_BUCKET"] = S3_BUCKET
os.environ["VIDCAP_API_KEY"] = VIDCAP_API_KEY

def main():
    print("🎬 Bedrock 기반 YouTube → KB QA 전체 자동 실행 시작")

    # 1. 유튜브 URL 입력
    youtube_url = input("▶️ 유튜브 URL을 입력하세요: ").strip()
    if not youtube_url:
        print("❌ URL이 비어 있습니다.")
        return

    # 2. 자막 추출 + S3 업로드
    try:
        print("\n📡 자막 추출 및 S3 업로드 중...")
        s3_key = process_youtube_to_s3(youtube_url)
        print(f"✅ 자막 업로드 완료: {s3_key}")
    except Exception as e:
        print(f"❌ 자막 처리 실패: {e}")
        return

    # 3. KB 동기화 Job 실행
    try:
        job_id = sync_kb()

        if not job_id:
            raise ValueError("❌ job_id를 받아오지 못했습니다.")

        # 4. Job 완료 대기
        final_status = wait_until_kb_sync_complete(job_id, max_wait_sec=60)
        if final_status != "COMPLETE":
            print(f"❌ KB 동기화 실패: 최종 상태 = {final_status}")
            return

    except Exception as e:
        print(f"❌ KB 동기화 전체 실패: {e}")
        return

    # 5. 질문 루프
    print("\n💬 질문을 입력하세요! (종료하려면 'exit')")
    while True:
        question = input("❓ 질문: ").strip()
        if question.lower() in ["exit", "quit"]:
            print("👋 종료합니다.")
            break

        try:
            answer = answer_question(question)
            print("\n🤖 Claude 응답:")
            print(answer)
            print("\n" + "-" * 50)
        except Exception as e:
            print(f"⚠️ 응답 생성 실패: {e}")

if __name__ == "__main__":
    main()