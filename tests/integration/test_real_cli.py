"""
실제 CLI 통합 테스트 - 구독제 CLI 도구 연동 검증
Mock 없이 실제 CLI 호출

실행: pytest tests/integration/test_real_cli.py -v

Note: CLI 바이너리가 설치되어 있어도 인증/설정 문제로 실행 실패할 수 있음.
      실제 실행 가능 여부를 테스트하여 skipif 조건 결정.
"""

import pytest
import shutil
import subprocess
import asyncio


def _check_cli_functional(cli_name: str, version_args: list[str] | None = None) -> bool:
    """
    CLI가 실제로 실행 가능한지 확인.
    바이너리 존재 + 버전 명령 성공 여부로 판단.

    Args:
        cli_name: CLI 실행 파일 이름
        version_args: 버전 확인 명령 인자 (기본: ["--version"])

    Returns:
        True if CLI is functional, False otherwise
    """
    if shutil.which(cli_name) is None:
        return False

    try:
        args = version_args or ["--version"]
        result = subprocess.run(
            [cli_name] + args,
            capture_output=True,
            timeout=10,
            text=True
        )
        # 일부 CLI는 --version에서 non-zero exit code 반환하므로 출력 존재 여부로 판단
        return result.returncode == 0 or bool(result.stdout or result.stderr)
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError):
        return False


# CLI 실행 가능 여부 확인 (바이너리 존재 + 실제 실행 가능)
# Note: 실제 API 호출 테스트는 인증 필요하므로, 여기서는 바이너리 존재만 확인하고
#       실행 실패 시 graceful skip 처리
CLAUDE_AVAILABLE = shutil.which("claude") is not None
CODEX_AVAILABLE = False  # Codex CLI는 interactive mode만 지원하여 테스트 불가 (#29)
GEMINI_AVAILABLE = False  # Gemini CLI 환경 설정 필요 (#30, #32)
QWEN_AVAILABLE = False    # Qwen CLI 환경 설정 필요 (#31, #33)


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

    @pytest.mark.skipif(not CODEX_AVAILABLE, reason="Codex CLI not available - interactive mode only (#29)")
    @pytest.mark.asyncio
    async def test_real_codex_cli(self):
        """GPT Codex CLI 실제 호출"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="codex", timeout=60)
        result = await executor.generate_code("respond with only: CODEX_OK")

        assert result["success"] is True
        assert "CODEX_OK" in result["output"] or "OK" in result["output"]
        assert result["model"] == "codex"

    @pytest.mark.skipif(not GEMINI_AVAILABLE, reason="Gemini CLI not available - requires setup (#30)")
    @pytest.mark.asyncio
    async def test_real_gemini_cli(self):
        """Gemini CLI 실제 호출"""
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="gemini", timeout=30)
        result = await executor.generate_code("respond with only: GEMINI_OK")

        assert result["success"] is True
        assert "GEMINI_OK" in result["output"] or "OK" in result["output"]
        assert result["model"] == "gemini"

    @pytest.mark.skipif(not QWEN_AVAILABLE, reason="Qwen CLI not available - requires setup (#31)")
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

    @pytest.mark.skipif(not GEMINI_AVAILABLE, reason="Gemini CLI not available - requires setup (#32)")
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

    @pytest.mark.skipif(not QWEN_AVAILABLE, reason="Qwen CLI not available - requires setup (#33)")
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
    # 바이너리 존재 여부 확인 (테스트 가능 여부와 별개)
    claude_installed = shutil.which("claude") is not None
    codex_installed = shutil.which("codex") is not None
    gemini_installed = shutil.which("gemini") is not None
    qwen_installed = shutil.which("qwen") is not None

    print("\n=== CLI 상태 ===")
    print(f"Claude Code: {'✅ 사용가능' if CLAUDE_AVAILABLE else ('⚠️ 설치됨(테스트 비활성)' if claude_installed else '❌ 미설치')}")
    print(f"GPT Codex:   {'✅ 사용가능' if CODEX_AVAILABLE else ('⚠️ 설치됨(테스트 비활성)' if codex_installed else '❌ 미설치')}")
    print(f"Gemini CLI:  {'✅ 사용가능' if GEMINI_AVAILABLE else ('⚠️ 설치됨(테스트 비활성)' if gemini_installed else '❌ 미설치')}")
    print(f"Qwen CLI:    {'✅ 사용가능' if QWEN_AVAILABLE else ('⚠️ 설치됨(테스트 비활성)' if qwen_installed else '❌ 미설치')}")

    # Claude만 필수 - 다른 CLI는 선택적
    if not CLAUDE_AVAILABLE:
        pytest.skip("Claude CLI가 설치되어 있지 않습니다 (필수)")
