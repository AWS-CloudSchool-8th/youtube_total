#!/usr/bin/env python3
"""
Bedrock Chatbot FastAPI 서버 실행 스크립트
"""

import uvicorn
import os
import sys

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Bedrock Chatbot FastAPI 서버를 시작합니다...")
    print("📡 API 서버: http://localhost:8000")
    print("📖 API 문서: http://localhost:8000/docs")
    print("🔄 React 프론트엔드: http://localhost:3000")
    print("\n" + "="*50)
    
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 