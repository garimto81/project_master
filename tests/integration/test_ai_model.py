"""
AI 모델 통합 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.4

P0 테스트:
- AI-I01: test_aider_subprocess_execution
- AI-I02: test_ai_model_api_call
- AI-I03: test_langgraph_workflow

Note: backend은 레거시입니다. 새 기능은 frontend/src/app/api/에 구현.
      이 테스트들은 레거시 모듈 구현 전까지 스킵 처리됩니다.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import subprocess

# 레거시 백엔드 모듈 스킵 사유
LEGACY_SKIP_REASON = "레거시 backend 모듈 미구현 - frontend API Routes로 마이그레이션 예정"


class TestAiderIntegration:
    """Aider 통합 테스트"""

    @pytest.mark.skip(reason=LEGACY_SKIP_REASON)
    def test_aider_subprocess_execution(self):
        """AI-I01: Aider 실행 (P0)"""
        # Arrange
        from backend.src.ai_agent.aider_runner import run_aider_command

        repo_path = "/path/to/repo"
        prompt = "Fix the authentication bug"

        # Act
        with patch("subprocess.Popen") as mock_popen:
            mock_process = Mock()
            mock_process.communicate.return_value = (
                b"Aider: Fixed authentication bug in auth.py",
                b"",
            )
            mock_process.returncode = 0
            mock_popen.return_value = mock_process

            result = run_aider_command(repo_path, prompt)

        # Assert
        assert result["success"] is True
        assert "Fixed" in result["output"]

    @pytest.mark.skip(reason=LEGACY_SKIP_REASON)
    @pytest.mark.asyncio
    async def test_ai_model_api_call(self):
        """AI-I02: AI 모델 API 호출 (P0)"""
        # Arrange
        from backend.src.ai_agent.model_client import AIModelClient

        client = AIModelClient(model="claude")
        prompt = "Analyze this code: def foo(): pass"

        # Act
        with patch.object(client, "_call_api", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = {
                "response": "This is an empty function named foo.",
                "tokens_used": 50,
            }
            response = await client.analyze(prompt)

        # Assert
        assert response["response"] is not None
        assert "function" in response["response"].lower()


class TestLangGraphWorkflow:
    """LangGraph 워크플로우 테스트"""

    @pytest.mark.skip(reason=LEGACY_SKIP_REASON)
    @pytest.mark.asyncio
    async def test_langgraph_workflow(self):
        """AI-I03: LangGraph 워크플로우 (P0)"""
        # Arrange
        from backend.src.ai_agent.workflow import IssueResolutionWorkflow

        workflow = IssueResolutionWorkflow()
        issue = {
            "number": 1,
            "title": "Fix bug",
            "body": "Authentication fails",
        }

        # Act
        with patch.object(workflow, "_execute_step", new_callable=AsyncMock) as mock_step:
            mock_step.side_effect = [
                {"step": "analyze", "result": "Bug in auth.py"},
                {"step": "plan", "result": "1. Fix validation"},
                {"step": "code", "result": "Modified auth.py"},
                {"step": "review", "result": "Changes look good"},
            ]
            result = await workflow.execute(issue)

        # Assert
        assert result["status"] == "completed"
        assert len(result["steps_completed"]) == 4
        assert result["requires_approval"] is True
