"""
실제 CLI 통합 테스트 - 구독제 CLI 도구 연동 검증
Mock 없이 실제 CLI 호출

실행: pytest tests/integration/test_real_cli.py -v
"""

import pytest
import shutil
import asyncio

# CLI 설치 여부 확인
CLAUDE_AVAILABLE = shutil.which("claude") is not None
CODEX_AVAILABLE = shutil.which("codex") is not None
GEMINI_AVAILABLE = shutil.which("gemini") is not None
QWEN_AVAILABLE = shutil.which("qwen") is not None


class TestRealCLI:
    """실제 CLI 호출 테스트"""

    @pytest.mark.skipif(not CLAUDE_AVAILABLE, reason="Claude CLI not installed")
    @pytest.mark.asyncio
    async def test_real_claude_cli(self):
        """Claude Code CLI 실제 호출"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="claude", timeout=30)
        result = await executor.generate_code("respond with only: CLAUDE_OK")

        assert result["success"] is True
        assert "CLAUDE_OK" in result["output"] or len(result["output"]) > 0
        assert result["model"] == "claude"

    @pytest.mark.skipif(not CODEX_AVAILABLE, reason="Codex CLI not installed")
    @pytest.mark.asyncio
    async def test_real_codex_cli(self):
        """GPT Codex CLI 실제 호출"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="codex", timeout=60)
        result = await executor.generate_code("respond with only: CODEX_OK")

        assert result["success"] is True
        assert "CODEX_OK" in result["output"] or "OK" in result["output"]
        assert result["model"] == "codex"

    @pytest.mark.skipif(not GEMINI_AVAILABLE, reason="Gemini CLI not installed")
    @pytest.mark.asyncio
    async def test_real_gemini_cli(self):
        """Gemini CLI 실제 호출"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="gemini", timeout=30)
        result = await executor.generate_code("respond with only: GEMINI_OK")

        assert result["success"] is True
        assert "GEMINI_OK" in result["output"] or "OK" in result["output"]
        assert result["model"] == "gemini"

    @pytest.mark.skipif(not QWEN_AVAILABLE, reason="Qwen CLI not installed")
    @pytest.mark.asyncio
    async def test_real_qwen_cli(self):
        """Qwen CLI 실제 호출"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="qwen", timeout=30)
        result = await executor.generate_code("respond with only: QWEN_OK")

        assert result["success"] is True
        assert "QWEN_OK" in result["output"] or "OK" in result["output"]
        assert result["model"] == "qwen"


class TestCLIFallback:
    """실제 폴백 테스트"""

    @pytest.mark.skipif(
        not (CLAUDE_AVAILABLE or CODEX_AVAILABLE or GEMINI_AVAILABLE or QWEN_AVAILABLE),
        reason="No CLI available"
    )
    @pytest.mark.asyncio
    async def test_real_fallback(self):
        """실제 폴백 동작 테스트"""
        from backend.src.cli.executor import execute_with_fallback

        # 사용 가능한 모델 목록
        models = []
        if CLAUDE_AVAILABLE:
            models.append("claude")
        if CODEX_AVAILABLE:
            models.append("codex")
        if GEMINI_AVAILABLE:
            models.append("gemini")
        if QWEN_AVAILABLE:
            models.append("qwen")

        result = await execute_with_fallback("respond with only: OK", models)

        assert result["success"] is True
        assert result["model_used"] in models


class TestCLICodeGeneration:
    """실제 코드 생성 테스트"""

    @pytest.mark.skipif(not GEMINI_AVAILABLE, reason="Gemini CLI not installed")
    @pytest.mark.asyncio
    async def test_gemini_code_generation(self):
        """Gemini로 실제 코드 생성"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="gemini", timeout=60)
        prompt = "Write a Python function that adds two numbers. Only output the code, no explanation."
        result = await executor.generate_code(prompt)

        assert result["success"] is True
        # 코드 관련 키워드가 포함되어야 함
        output_lower = result["output"].lower()
        assert "def" in output_lower or "return" in output_lower or "+" in result["output"]

    @pytest.mark.skipif(not QWEN_AVAILABLE, reason="Qwen CLI not installed")
    @pytest.mark.asyncio
    async def test_qwen_code_generation(self):
        """Qwen으로 실제 코드 생성"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="qwen", timeout=60)
        prompt = "Write a Python function that adds two numbers. Only output the code."
        result = await executor.generate_code(prompt)

        assert result["success"] is True
        output_lower = result["output"].lower()
        assert "def" in output_lower or "return" in output_lower or "+" in result["output"]


# CLI 상태 출력 (pytest -v 실행 시 표시)
def test_cli_status():
    """CLI 설치 상태 확인"""
    print("\n=== CLI 설치 상태 ===")
    print(f"Claude Code: {'✅ 설치됨' if CLAUDE_AVAILABLE else '❌ 미설치'}")
    print(f"GPT Codex:   {'✅ 설치됨' if CODEX_AVAILABLE else '❌ 미설치'}")
    print(f"Gemini CLI:  {'✅ 설치됨' if GEMINI_AVAILABLE else '❌ 미설치'}")
    print(f"Qwen CLI:    {'✅ 설치됨' if QWEN_AVAILABLE else '❌ 미설치'}")

    # 최소 1개 이상 설치되어 있어야 함
    assert any([CLAUDE_AVAILABLE, CODEX_AVAILABLE, GEMINI_AVAILABLE, QWEN_AVAILABLE]), \
        "최소 1개 이상의 CLI가 설치되어 있어야 합니다"
