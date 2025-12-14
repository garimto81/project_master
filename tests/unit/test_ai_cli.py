"""
AI CLI 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.5

P0 테스트:
- CLI-U01: test_claude_cli_available
- CLI-U02: test_gpt_codex_cli_available
- CLI-U03: test_gemini_cli_available
- CLI-U05: test_cli_command_parse
- CLI-U06: test_cli_output_parse
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import subprocess


class TestCLIAvailability:
    """CLI 설치 확인 테스트"""

    def test_claude_cli_available(self):
        """CLI-U01: Claude CLI 설치 확인 (P0)"""
        # Arrange
        from backend.src.cli.checker import check_cli_available

        # Act
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(returncode=0, stdout="claude version 1.0")
            is_available = check_cli_available("claude")

        # Assert
        assert is_available is True

    def test_gpt_codex_cli_available(self):
        """CLI-U02: GPT Codex CLI 설치 확인 (P0)"""
        # Arrange
        from backend.src.cli.checker import check_cli_available

        # Act
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(returncode=0, stdout="codex version 5.2")
            is_available = check_cli_available("codex")

        # Assert
        assert is_available is True

    def test_gemini_cli_available(self):
        """CLI-U03: Gemini CLI 설치 확인 (P0)"""
        # Arrange
        from backend.src.cli.checker import check_cli_available

        # Act
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(returncode=0, stdout="gemini version 3.0")
            is_available = check_cli_available("gemini")

        # Assert
        assert is_available is True

    def test_qwen_cli_available(self):
        """CLI-U04: Qwen CLI 설치 확인 (P1)"""
        # Arrange
        from backend.src.cli.checker import check_cli_available

        # Act
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(returncode=0, stdout="qwen version 2.5")
            is_available = check_cli_available("qwen")

        # Assert
        assert is_available is True


class TestCLIParsing:
    """CLI 명령어/출력 파싱 테스트"""

    def test_cli_command_parse(self):
        """CLI-U05: CLI 명령어 파싱 (P0)"""
        # Arrange
        from backend.src.cli.parser import parse_cli_command

        user_input = "@claude Fix the authentication bug in auth.py"

        # Act
        parsed = parse_cli_command(user_input)

        # Assert
        assert parsed["model"] == "claude"
        assert parsed["action"] == "Fix the authentication bug in auth.py"
        assert parsed["files"] == ["auth.py"]

    def test_cli_output_parse(self):
        """CLI-U06: CLI 출력 파싱 (P0)"""
        # Arrange
        from backend.src.cli.parser import parse_cli_output

        raw_output = """
```python
def validate_token(token):
    if is_expired(token):
        raise TokenExpiredError()
    return True
```

I've fixed the token validation by adding expiry check.
"""

        # Act
        parsed = parse_cli_output(raw_output)

        # Assert
        assert parsed is not None
        assert "code_blocks" in parsed
        assert len(parsed["code_blocks"]) == 1
        assert parsed["code_blocks"][0]["language"] == "python"
        assert "explanation" in parsed


class TestCLIExecution:
    """CLI 실행 테스트"""

    def test_cli_model_selection(self):
        """CLI 모델 선택 테스트"""
        # Arrange
        from backend.src.cli.executor import select_model

        available_models = ["claude", "codex", "gemini"]

        # Act
        selected = select_model("claude", available_models)

        # Assert
        assert selected == "claude"

    @pytest.mark.asyncio
    async def test_cli_fallback_on_failure(self):
        """CLI 실패 시 폴백 테스트"""
        # Arrange
        from backend.src.cli.executor import execute_with_fallback, CLIExecutor

        models = ["claude", "codex", "gemini"]
        prompt = "Fix the bug"

        # Act
        with patch.object(CLIExecutor, "generate_code", new_callable=AsyncMock) as mock_generate:
            # Claude fails, codex succeeds
            mock_generate.side_effect = [
                Exception("Claude unavailable"),
                {"success": True, "code": "Fixed", "output": "Fixed", "model": "codex"},
            ]
            result = await execute_with_fallback(prompt, models)

        # Assert
        assert result["success"] is True
        assert result["model_used"] == "codex"
