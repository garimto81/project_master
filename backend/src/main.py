"""
GitCommand Center - FastAPI Backend Server
AI-Native Developer Dashboard API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio

from .cli.executor import CLIExecutor, execute_with_fallback, CLIExecutionError
from .cli.checker import check_cli_available

app = FastAPI(
    title="GitCommand Center API",
    description="AI-Native Developer Dashboard Backend",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Models ===

class AIResolveRequest(BaseModel):
    model: str = "claude"
    issue_id: int
    issue_title: str
    prompt: Optional[str] = None


class AIResolveResponse(BaseModel):
    success: bool
    model_used: str
    code: str
    output: str
    message: str


class CLIStatusResponse(BaseModel):
    claude: bool
    codex: bool
    gemini: bool
    qwen: bool


class HealthResponse(BaseModel):
    status: str
    version: str


# === Endpoints ===

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """서버 상태 확인"""
    return HealthResponse(status="healthy", version="1.0.0")


@app.get("/api/cli/status", response_model=CLIStatusResponse)
async def get_cli_status():
    """CLI 설치 상태 확인"""
    return CLIStatusResponse(
        claude=check_cli_available("claude"),
        codex=check_cli_available("codex"),
        gemini=check_cli_available("gemini"),
        qwen=check_cli_available("qwen")
    )


@app.post("/api/ai/resolve", response_model=AIResolveResponse)
async def resolve_issue_with_ai(request: AIResolveRequest):
    """AI로 이슈 해결"""
    try:
        # 프롬프트 생성
        prompt = request.prompt or f"Fix the issue: {request.issue_title}"

        # 선택된 모델로 실행
        executor = CLIExecutor(model=request.model, timeout=120)
        result = await executor.generate_code(prompt)

        return AIResolveResponse(
            success=True,
            model_used=request.model,
            code=result.get("code", ""),
            output=result.get("output", ""),
            message=f"Issue #{request.issue_id} resolved with {request.model}"
        )
    except CLIExecutionError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/api/ai/resolve-with-fallback", response_model=AIResolveResponse)
async def resolve_issue_with_fallback(request: AIResolveRequest):
    """AI로 이슈 해결 (폴백 지원)"""
    try:
        prompt = request.prompt or f"Fix the issue: {request.issue_title}"

        # 모든 모델 순서대로 시도
        models = [request.model, "claude", "codex", "gemini", "qwen"]
        # 중복 제거하면서 순서 유지
        unique_models = list(dict.fromkeys(models))

        result = await execute_with_fallback(prompt, unique_models)

        return AIResolveResponse(
            success=True,
            model_used=result.get("model_used", request.model),
            code=result.get("code", ""),
            output=result.get("output", ""),
            message=f"Issue #{request.issue_id} resolved with fallback"
        )
    except CLIExecutionError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# === 간단한 모델 정보 ===

@app.get("/api/models")
async def get_available_models():
    """사용 가능한 AI 모델 목록"""
    models = [
        {
            "id": "claude",
            "name": "Claude Code",
            "description": "Anthropic Claude 4.5 Opus",
            "available": check_cli_available("claude")
        },
        {
            "id": "codex",
            "name": "GPT Codex",
            "description": "OpenAI GPT 5.1 Codex Max",
            "available": check_cli_available("codex")
        },
        {
            "id": "gemini",
            "name": "Gemini",
            "description": "Google Gemini 3.0",
            "available": check_cli_available("gemini")
        },
        {
            "id": "qwen",
            "name": "Qwen",
            "description": "Alibaba Qwen CLI",
            "available": check_cli_available("qwen")
        }
    ]
    return {"models": models}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
