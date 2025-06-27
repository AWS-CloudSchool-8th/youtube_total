#!/usr/bin/env python3
# test_kb_sync.py

import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tool.sync_kb import sync_kb

def test_kb_sync():
    print("=== KB 동기화 테스트 시작 ===")
    try:
        result = sync_kb()
        print(f"=== KB 동기화 결과: {result} ===")
        return result
    except Exception as e:
        print(f"=== KB 동기화 에러: {e} ===")
        return None

if __name__ == "__main__":
    test_kb_sync() 