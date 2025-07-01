import os
import json
import uuid
import time
from typing import TypedDict, List, Dict, Any
import boto3
import requests
from langgraph.graph import StateGraph, END
from langchain_core.runnables import Runnable, RunnableLambda, RunnablePassthrough
from langchain_aws import ChatBedrock
from langchain_core.prompts import ChatPromptTemplate
from langchain_experimental.tools import PythonREPLTool
from app.core.config import settings
from app.services.user_s3_service import user_s3_service
from app.services.s3_service import s3_service  # S3 서비스 추가
from app.services.state_manager import state_manager
from app.services.youtube_processing_service import youtube_processing_service

# ========== 1. 상태 정의 ==========
class GraphState(TypedDict):
    job_id: str
    user_id: str
    youtube_url: str
    caption: str
    report_text: str
    visual_blocks: List[dict]
    visual_results: List[dict]
    final_output: dict

# ========== 2. 자막 추출 ==========
def extract_youtube_caption_tool(youtube_url: str) -> str:
    """YouTube URL에서 자막을 추출 (1차: API, 2차: S3 fallback)"""
    # 1차: 외부 API
    api_url = "https://vidcap.xyz/api/v1/youtube/caption"
    params = {"url": youtube_url, "locale": "ko"}
    headers = {"Authorization": f"Bearer {settings.VIDCAP_API_KEY}"}
    try:
        response = requests.get(api_url, params=params, headers=headers)
        response.raise_for_status()
        content = response.json().get("data", {}).get("content", "")
        if content:
            return content
        else:
            raise Exception("API에서 자막을 받지 못함")
    except Exception as e:
        print(f"[extract_youtube_caption_tool] API 실패, S3 fallback 시도: {e}")
        # 2차: S3 fallback
        return extract_youtube_caption_from_s3(youtube_url)

def extract_youtube_caption_from_s3(youtube_url: str) -> str:
    """S3에서 자막 파일을 찾아 읽어옴 (v1 방식)"""
    try:
        video_id = extract_video_id(youtube_url)
        if not video_id:
            raise Exception("YouTube URL에서 video ID를 추출할 수 없습니다.")
        print(f"🔍 Video ID: {video_id}에 해당하는 transcripts 파일 검색 중...")
        s3_client = boto3.client("s3")
        prefix = f"transcripts/"
        response = s3_client.list_objects_v2(
            Bucket=settings.S3_BUCKET,
            Prefix=prefix,
            MaxKeys=1000
        )
        caption_file_key = None
        latest_time = None
        if 'Contents' in response:
            for obj in response['Contents']:
                key = obj['Key']
                if key.endswith('.txt') and video_id in key:
                    if latest_time is None or obj['LastModified'] > latest_time:
                        latest_time = obj['LastModified']
                        caption_file_key = key
        if not caption_file_key:
            continuation_token = response.get('NextContinuationToken')
            while continuation_token:
                response = s3_client.list_objects_v2(
                    Bucket=settings.S3_BUCKET,
                    Prefix=prefix,
                    ContinuationToken=continuation_token,
                    MaxKeys=1000
                )
                if 'Contents' in response:
                    for obj in response['Contents']:
                        key = obj['Key']
                        if key.endswith('.txt') and video_id in key:
                            if latest_time is None or obj['LastModified'] > latest_time:
                                latest_time = obj['LastModified']
                                caption_file_key = key
                continuation_token = response.get('NextContinuationToken')
        if not caption_file_key:
            raise Exception(f"Video ID {video_id}에 해당하는 transcripts 파일을 S3에서 찾을 수 없습니다. 먼저 YouTubeProcessingService로 파일을 저장해주세요.")
        response = s3_client.get_object(Bucket=settings.S3_BUCKET, Key=caption_file_key)
        caption_text = response["Body"].read().decode("utf-8")
        print(f"✅ S3에서 자막 파일 읽기 완료: {caption_file_key}")
        print(f"📄 자막 길이: {len(caption_text)}자")
        return caption_text
    except Exception as e:
        print(f"❌ S3에서 자막 파일 읽기 실패: {str(e)}")
        return f"자막 파일 읽기 실패: {str(e)}"

# ========== 3. 시각화, S3 업로드, 보고서 병합 ==========
def generate_visuals(prompt: str) -> str:
    """DALL-E를 사용한 이미지 생성 (현재는 placeholder)"""
    return f"[Visual placeholder for: {prompt[:50]}...]"

def upload_to_s3(file_path: str, object_name: str = None) -> str:
    """S3에 파일 업로드"""
    return s3_service.upload_file(
        file_path=file_path,
        object_name=object_name,
        content_type="image/png"
    )

def merge_report_and_visuals(report_text: str, visuals: List[dict], youtube_url: str = "") -> dict:
    """보고서와 시각화를 병합"""
    paragraphs = [p.strip() for p in report_text.strip().split("\n") if p.strip()]
    n, v = len(paragraphs), len(visuals)
    sections = []
    if youtube_url:
        sections.append({"type": "youtube", "content": youtube_url})
    for i, para in enumerate(paragraphs):
        sections.append({"type": "paragraph", "content": para})
        if i < v:
            vis = visuals[i]
            if vis.get("url") and vis.get("type"):
                sections.append({"type": vis["type"], "src": vis["url"]})
    for j in range(len(paragraphs), v):
        vis = visuals[j]
        if vis.get("url") and vis.get("type"):
            sections.append({"type": vis["type"], "src": vis["url"]})
    return {"format": "json", "youtube_url": youtube_url, "sections": sections}

# ========== 4. LLM 프롬프트 및 구조화 ==========
structure_prompt = ChatPromptTemplate.from_messages([
    ("system", """# 유튜브 자막 분석 보고서 작성 프롬프트

## 역할 정의
당신은 전문적인 콘텐츠 분석가로서, 유튜브 영상의 자막을 체계적이고 완전한 보고서 형태로 변환하는 역할을 수행합니다.

## 보고서 작성 지침

#### 1.1 표지 정보
- 보고서 제목: "[영상 제목] 분석 보고서"

#### 1.2 목차
- 각 섹션별 페이지 번호 포함
- 최소 5개 이상의 주요 섹션 구성

#### 1.3 필수 섹션 구성
1. **개요 (Executive Summary)**
   - 영상의 핵심 내용 요약 (150-200자)
   - 주요 키워드 및 핵심 메시지

2. **주요 내용 분석**
   - 최소 3개 이상의 세부 문단
   - 각 문단당 200-300자 이상
   - 문단 구조: 소제목 + 요약 + 상세 설명

3. **핵심 인사이트**
   - 영상에서 도출되는 주요 시사점
   - 실무적/학술적 함의

4. **결론 및 제언**
   - 전체 내용 종합
   - 향후 방향성 또는 응용 가능성

5. **부록**
   - 주요 인용구
   - 참고 자료 (해당 시)

### 2. 작성 기준

#### 2.1 문체 및 형식
- **서술형 문장**: 구어체를 문어체로 완전 변환
- **객관적 어조**: 3인칭 관점에서 서술
- **전문적 표현**: 학술적/비즈니스 용어 활용
- **논리적 연결**: 문장 간 연결고리 명확화

#### 2.2 내용 구성
- **각 문단 최소 200자 이상**: 충분한 설명과 분석 포함
- **요약-설명 구조**: 각 문단은 핵심 요약 후 상세 설명
- **증거 기반 서술**: 자막 내용을 근거로 한 분석
- **맥락 제공**: 배경 정보 및 관련 설명 추가

#### 2.3 품질 기준
- **일관성**: 전체 보고서의 어조와 형식 통일
- **완결성**: 각 섹션이 독립적으로도 이해 가능
- **정확성**: 원본 자막 내용 왜곡 없이 재구성
- **가독성**: 명확한 제목, 부제목, 단락 구분

### 3. 출력 형식

다음 형식으로 보고서를 작성하시오:

```    

## 목차
1. 개요
2. 주요 내용 분석
3. 핵심 인사이트  
4. 결론 및 제언
5. 부록

## 1. 개요
[핵심 요약 내용]

## 2. 주요 내용 분석
### 2.1 [첫 번째 주제]
**요약**: [핵심 내용 요약]
**분석**: [상세 분석 및 설명]

### 2.2 [두 번째 주제]
**요약**: [핵심 내용 요약]  
**분석**: [상세 분석 및 설명]

### 2.3 [세 번째 주제]
**요약**: [핵심 내용 요약]
**분석**: [상세 분석 및 설명]

## 3. 핵심 인사이트
[도출된 주요 시사점]

## 4. 결론 및 제언
[전체 내용 종합 및 향후 방향성]

## 5. 부록
[주요 인용구 및 참고 자료]
```

이제 유튜브 자막을 제공하면, 위의 지침에 따라 완전한 보고서 형태로 변환하여 제시하겠습니다."""),
    ("human", "{input}")
])

llm = ChatBedrock(
    client=boto3.client("bedrock-runtime", region_name=settings.AWS_REGION),
    model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
    model_kwargs={"temperature": 0.0, "max_tokens": 4096}
)

def structure_report(caption: str) -> str:
    """자막을 구조화된 보고서로 변환"""
    messages = structure_prompt.format_messages(input=caption)
    response = llm.invoke(messages)
    return response.content.strip()

report_agent_executor_runnable = RunnableLambda(structure_report)

# ========== 5. 시각화 블록 분해 ==========
visual_split_prompt = ChatPromptTemplate.from_messages([
    ("system", "너는 보고서를 다음 형식의 JSON 배열로 시각화 블록을 출력해야 해:\n"
     "[{\"type\": \"chart\", \"text\": \"...\"}]\n"
     "type은 반드시 chart, table, image 중 하나고,\n"
     "text는 설명 문장이다. key 이름은 꼭 type, text를 그대로 써."),
    ("human", "{input}")
])

def _split_report(report_text: str) -> List[dict]:
    """보고서를 시각화 블록으로 분해"""
    response = llm.invoke(visual_split_prompt.format_messages(input=report_text))
    try:
        content = response.content.strip()
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        raw = json.loads(content)
        if not isinstance(raw, list):
            return []
        parsed = []
        for item in raw:
            if isinstance(item, dict) and 'type' in item and 'text' in item:
                parsed.append(item)
        return parsed
    except Exception as e:
        print(f"시각화 블록 파싱 실패: {e}")
        print(f"원본 응답: {response.content[:200]}...")
        return []

class WrapVisualSplitToState(Runnable):
    def invoke(self, state: dict, config=None):
        start = time.time()
        report_text = state.get("report_text", "")
        try:
            visual_blocks = _split_report(report_text)
            print(f"[split_node] 실행 시간: {round(time.time() - start, 2)}초")
            print(f"[split_node] 시각화 블록 수: {len(visual_blocks)}")
            return {**state, "visual_blocks": visual_blocks}
        except Exception as e:
            print(f"[split_node] 에러: {e}")
            return {**state, "visual_blocks": []}

visual_split_agent_wrapped = WrapVisualSplitToState()

# ========== 6. 시각화 생성 ==========
python_tool = PythonREPLTool()

code_gen_prompt = ChatPromptTemplate.from_messages([
    ("system", "다음 문장을 시각화하는 **Python 코드만** 출력하세요. 다른 설명은 하지 마세요. 반드시 matplotlib.pyplot을 사용하고, 마지막 줄은 plt.savefig('output.png')여야 합니다."),
    ("human", "{input}")
])

def dispatch_visual_block_with_python_tool(blocks: List[dict]) -> List[dict]:
    """시각화 블록들을 실제 시각화로 변환"""
    results = []
    for i, blk in enumerate(blocks):
        if not isinstance(blk, dict):
            continue
        t, txt = blk.get("type"), blk.get("text")
        if not t or not txt:
            continue
        try:
            if t in ["chart", "table"]:
                code = llm.invoke(code_gen_prompt.format_messages(input=txt)).content
                result = python_tool.run(code)
                if os.path.exists("output.png"):
                    unique_filename = f"output-{uuid.uuid4().hex[:8]}.png"
                    os.rename("output.png", unique_filename)
                    print(f"📊 시각화 파일 생성: {unique_filename}")
                    s3_url = upload_to_s3(unique_filename, object_name=unique_filename)
                    os.remove(unique_filename)
                    url = s3_url
                else:
                    url = f"[Image not created: {result}]"
            elif t == "image":
                url = generate_visuals(txt)
            else:
                url = f"[Unsupported type: {t}]"
            results.append({"type": t, "text": txt, "url": url})
        except Exception as e:
            print(f"❌ 시각화 생성 실패: {e}")
            results.append({"type": t, "text": txt, "url": f"[Error: {e}]"})
    return results

visual_agent_executor_group = RunnableLambda(dispatch_visual_block_with_python_tool)

# ========== 7. Node 정의 ==========
class ToolAgent(Runnable):
    def __init__(self, func, field: str, output_field: str = None):
        self.func = func
        self.field = field
        self.output_field = output_field or field
    def invoke(self, state: dict, config=None):
        start = time.time()
        input_value = state.get(self.field)
        result = self.func(input_value)
        job_id = state.get('job_id')
        if job_id:
            try:
                state_manager.save_step_state(job_id, self.field, {self.output_field: result})
            except Exception as e:
                print(f"⚠️ Redis 상태 저장 실패 (무시됨): {e}")
        execution_time = round(time.time() - start, 2)
        print(f"[{self.field}] 실행 시간: {execution_time}초")
        return {**state, self.output_field: result}

class LangGraphAgentNode(Runnable):
    def __init__(self, executor, input_key: str, output_key: str):
        self.executor = executor
        self.input_key = input_key
        self.output_key = output_key
    def invoke(self, state: dict, config=None):
        start = time.time()
        input_val = state[self.input_key]
        result = self.executor.invoke(input_val)
        if isinstance(result, dict) and "output" in result:
            obs = result["output"]
        else:
            obs = result
        job_id = state.get('job_id')
        if job_id:
            try:
                state_manager.save_step_state(job_id, self.output_key, {self.output_key: obs})
            except Exception as e:
                print(f"⚠️ Redis 상태 저장 실패 (무시됨): {e}")
        execution_time = round(time.time() - start, 2)
        print(f"[{self.input_key} → {self.output_key}] 실행 시간: {execution_time}초")
        return {**state, self.output_key: obs}

class MergeTool(Runnable):
    def invoke(self, state: dict, config=None):
        start = time.time()
        youtube_url = state.get('youtube_url', '')
        final_output = merge_report_and_visuals(
            state.get("report_text", ""), state.get("visual_results", []), str(youtube_url or "")
        )
        print(f"[MergeTool] 실행 시간: {round(time.time() - start, 2)}초")
        user_id = state.get('user_id')
        job_id = state.get('job_id')
        try:
            report_json = json.dumps(final_output, ensure_ascii=False, indent=2)
            report_key = f"reports/{user_id}/{job_id}_report.json"
            temp_file = f"report_{job_id}.json"
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(report_json)
            s3_url = s3_service.upload_file(
                file_path=temp_file,
                object_name=report_key,
                content_type="application/json"
            )
            os.remove(temp_file)
            print(f"✅ 보고서 S3 저장 완료: {report_key}")
            print(f"📄 보고서 URL: {s3_url}")
            youtube_info = get_youtube_video_info(youtube_url) if youtube_url else {}
            metadata_key = f"metadata/{user_id}/{job_id}_metadata.json"
            metadata = {
                "youtube_url": youtube_url,
                "user_id": user_id,
                "job_id": job_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "report_url": s3_url,
                **youtube_info
            }
            temp_meta_file = f"metadata_{job_id}.json"
            with open(temp_meta_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            s3_service.upload_file(
                file_path=temp_meta_file,
                object_name=metadata_key,
                content_type="application/json"
            )
            os.remove(temp_meta_file)
        except Exception as e:
            print(f"❌ 보고서 S3 저장 실패: {e}")
        return {**state, "final_output": final_output}

# ========== 8. FSM 구성 ==========
def create_youtube_analysis_graph():
    builder = StateGraph(state_schema=GraphState)
    builder.add_node("caption_node", ToolAgent(extract_youtube_caption_tool, "youtube_url", "caption"))
    builder.add_node("report_node", LangGraphAgentNode(report_agent_executor_runnable, "caption", "report_text"))
    builder.add_node("split_node", visual_split_agent_wrapped)
    builder.add_node("visual_node", LangGraphAgentNode(visual_agent_executor_group, "visual_blocks", "visual_results"))
    builder.add_node("merge_node", MergeTool())
    builder.set_entry_point("caption_node")
    for src, dst in [
        ("caption_node", "report_node"),
        ("report_node", "split_node"),
        ("split_node", "visual_node"),
        ("visual_node", "merge_node"),
        ("merge_node", "__end__")
    ]:
        builder.add_edge(src, dst)
    return builder.compile()

# ========== 9. 서비스 클래스 ==========
class LangGraphService:
    def __init__(self):
        self.youtube_graph = create_youtube_analysis_graph()
    async def analyze_youtube_with_fsm(self, youtube_url: str, job_id: str = None, user_id: str = None) -> Dict[str, Any]:
        try:
            print(f"\n🚀 LangGraph FSM 분석 시작: {youtube_url}")
            state = {
                "youtube_url": youtube_url,
                "job_id": job_id or str(uuid.uuid4()),
                "user_id": user_id or "anonymous",
                "caption": "",
                "report_text": "",
                "visual_blocks": [],
                "visual_results": [],
                "final_output": {}
            }
            result = await self.youtube_graph.ainvoke(state)
            print(f"✅ LangGraph FSM 분석 완료: {result.get('final_output') is not None}")
            return result
        except Exception as e:
            print(f"❌ LangGraph FSM 분석 실패: {e}")
            return {"error": str(e)}

# ========== 10. 유틸 함수 ==========
def extract_video_id(url: str) -> str:
    """유튜브 URL에서 video_id 추출"""
    try:
        if "v=" in url:
            return url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            return url.split("youtu.be/")[1].split("?")[0]
        else:
            return ""
    except Exception:
        return ""

def get_youtube_video_info(youtube_url: str) -> Dict[str, str]:
    """유튜브 영상의 기본 정보 반환 (확장 가능)"""
    # TODO: 필요시 YouTube Data API 등으로 확장
    return {"url": youtube_url}

langgraph_service = LangGraphService()