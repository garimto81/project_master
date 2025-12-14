"""
AI CLI 통합 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.5

P0 테스트:
- CLI-I01: test_claude_cli_code_generation
- CLI-I02: test_gpt_codex_cli_code_generation
- CLI-I03: test_gemini_cli_code_generation
- CLI-I05: test_cli_streaming_output
- CLI-I06: test_cli_error_handling
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import subprocess
import asyncio


class TestClaudeCLI:
    """Claude CLI 통합 테스트"""

    @pytest.mark.asyncio
    async def test_claude_cli_code_generation(self):
        """CLI-I01: Claude CLI 코드 생성 (P0)"""
        # Arrange
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="claude")
        prompt = "Create a function to validate email addresses"

        # Act
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (
                b"""```python
def validate_email(email: str) -> bool:
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
```""",
                b"",
            )
            mock_process.returncode = 0
            mock_exec.return_value = mock_process

            result = await executor.generate_code(prompt)

        # Assert
        assert result["success"] is True
        assert "validate_email" in result["code"]
        assert result["model"] == "claude"


class TestGPTCodexCLI:
    """GPT Codex CLI 통합 테스트"""

    @pytest.mark.asyncio
    async def test_gpt_codex_cli_code_generation(self):
        """CLI-I02: GPT Codex CLI 코드 생성 (P0)"""
        # Arrange
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="codex")
        prompt = "Create a REST API endpoint for user registration"

        # Act
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (
                b"""```python
@app.post("/users/register")
async def register_user(user: UserCreate):
    return {"user_id": "123", "message": "User created"}
```""",
                b"",
            )
            mock_process.returncode = 0
            mock_exec.return_value = mock_process

            result = await executor.generate_code(prompt)

        # Assert
        assert result["success"] is True
        assert "register" in result["code"]
        assert result["model"] == "codex"


class TestGeminiCLI:
    """Gemini CLI 통합 테스트"""

    @pytest.mark.asyncio
    async def test_gemini_cli_code_generation(self):
        """CLI-I03: Gemini CLI 코드 생성 (P0)"""
        # Arrange
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="gemini")
        prompt = "Review this code and suggest improvements"

        # Act
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (
                b"Code review complete. Suggestions: 1. Add type hints, 2. Add error handling",
                b"",
            )
            mock_process.returncode = 0
            mock_exec.return_value = mock_process

            result = await executor.analyze_code(prompt)

        # Assert
        assert result["success"] is True
        assert "suggestions" in result or "Suggestions" in result["output"]


class TestCLIStreaming:
    """CLI 스트리밍 테스트"""

    @pytest.mark.asyncio
    async def test_cli_streaming_output(self):
        """CLI-I05: CLI 스트리밍 출력 (P0)"""
        # Arrange
        from backend.src.cli.executor import CLIExecutor

        executor = CLIExecutor(model="claude")
        prompt = "Generate a long explanation"

        # Act
        chunks = []
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_process = AsyncMock()

            async def mock_readline():
                lines = [b"Line 1\n", b"Line 2\n", b"Line 3\n", b""]
                for line in lines:
                    yield line

            mock_process.stdout.__aiter__ = lambda self: mock_readline()
            mock_process.returncode = 0
            mock_exec.return_value = mock_process

            async for chunk in executor.stream_output(prompt):
                chunks.append(chunk)

        # Assert
        assert len(chunks) >= 3


class TestCLIErrorHandling:
    """CLI 에러 처리 테스트"""

    @pytest.mark.asyncio
    async def test_cli_error_handling(self):
        """CLI-I06: CLI 에러 처리 (P0)"""
        # Arrange
        from backend.src.cli.executor import CLIExecutor, CLIExecutionError

        executor = CLIExecutor(model="claude")
        prompt = "Invalid prompt"

        # Act & Assert
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (
                b"",
                b"Error: Rate limit exceeded",
            )
            mock_process.returncode = 1
            mock_exec.return_value = mock_process

            with pytest.raises(CLIExecutionError) as exc_info:
                await executor.generate_code(prompt)

            assert "Rate limit" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_cli_timeout_handling(self):
        """CLI-I07: CLI 타임아웃 처리 (P1)"""
        # Arrange
        from backend.src.cli.executor import CLIExecutor, CLITimeoutError

        executor = CLIExecutor(model="claude", timeout=1)
        prompt = "Very complex task"

        # Act & Assert
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_process = AsyncMock()
            mock_process.communicate.side_effect = asyncio.TimeoutError()
            mock_exec.return_value = mock_process

            with pytest.raises(CLITimeoutError):
                await executor.generate_code(prompt)
