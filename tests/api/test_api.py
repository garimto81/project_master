"""
FastAPI Backend API 테스트
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from backend.src.main import app

client = TestClient(app)


class TestHealthEndpoint:
    """헬스 체크 테스트"""

    def test_health_check(self):
        """API-01: 헬스 체크 성공"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"


class TestCLIStatusEndpoint:
    """CLI 상태 확인 테스트"""

    def test_cli_status(self):
        """API-02: CLI 상태 확인"""
        response = client.get("/api/cli/status")
        assert response.status_code == 200
        data = response.json()
        # 최소 하나의 CLI는 설치되어 있어야 함
        assert any([data["claude"], data["codex"], data["gemini"], data["qwen"]])


class TestModelsEndpoint:
    """모델 목록 테스트"""

    def test_get_models(self):
        """API-03: 모델 목록 조회"""
        response = client.get("/api/models")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) == 4

        model_ids = [m["id"] for m in data["models"]]
        assert "claude" in model_ids
        assert "codex" in model_ids
        assert "gemini" in model_ids
        assert "qwen" in model_ids


class TestAIResolveEndpoint:
    """AI 해결 API 테스트"""

    def test_resolve_with_mock(self):
        """API-04: AI 해결 요청 (Mock)"""
        with patch("backend.src.main.CLIExecutor") as MockExecutor:
            mock_instance = MockExecutor.return_value
            mock_instance.generate_code = AsyncMock(return_value={
                "success": True,
                "code": "def fix(): pass",
                "output": "Fixed the bug",
                "model": "claude"
            })

            response = client.post("/api/ai/resolve", json={
                "model": "claude",
                "issue_id": 1,
                "issue_title": "Fix authentication bug"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["model_used"] == "claude"

    def test_resolve_invalid_model(self):
        """API-05: 잘못된 모델 요청"""
        with patch("backend.src.main.CLIExecutor") as MockExecutor:
            from backend.src.cli.executor import CLIExecutionError
            mock_instance = MockExecutor.return_value
            mock_instance.generate_code = AsyncMock(
                side_effect=CLIExecutionError("CLI not found")
            )

            response = client.post("/api/ai/resolve", json={
                "model": "invalid_model",
                "issue_id": 1,
                "issue_title": "Test"
            })

            assert response.status_code == 500


class TestAIResolveWithFallbackEndpoint:
    """AI 해결 폴백 API 테스트"""

    def test_resolve_with_fallback_mock(self):
        """API-06: AI 해결 폴백 요청 (Mock)"""
        with patch("backend.src.main.execute_with_fallback", new_callable=AsyncMock) as mock_fallback:
            mock_fallback.return_value = {
                "success": True,
                "code": "def fix(): pass",
                "output": "Fixed with fallback",
                "model_used": "codex"
            }

            response = client.post("/api/ai/resolve-with-fallback", json={
                "model": "claude",
                "issue_id": 1,
                "issue_title": "Fix bug"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["model_used"] == "codex"
