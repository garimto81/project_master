"""
AI AGENT 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.4

P0 테스트:
- AI-U01: test_ai_analyze_issue
- AI-U02: test_ai_generate_plan
- AI-U03: test_ai_code_modification
- AI-U05: test_ai_pr_creation
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock


class TestAIAnalysis:
    """AI 분석 테스트"""

    def test_ai_analyze_issue(self):
        """AI-U01: 이슈 분석 (P0)"""
        # Arrange
        from backend.src.ai_agent.analyzer import analyze_issue

        issue = {
            "number": 1,
            "title": "Fix authentication bug",
            "body": "Login fails with invalid token error",
            "labels": [{"name": "bug"}],
        }
        repo_context = {"name": "test-repo", "language": "Python"}

        # Act
        analysis = analyze_issue(issue, repo_context)

        # Assert
        assert analysis is not None
        assert "problem" in analysis
        assert "suggested_files" in analysis
        assert "estimated_complexity" in analysis

    def test_ai_generate_plan(self):
        """AI-U02: 계획 생성 (P0)"""
        # Arrange
        from backend.src.ai_agent.planner import generate_plan

        analysis = {
            "problem": "Authentication token validation fails",
            "suggested_files": ["src/auth/jwt.py", "src/auth/middleware.py"],
            "estimated_complexity": "medium",
        }

        # Act
        plan = generate_plan(analysis)

        # Assert
        assert plan is not None
        assert "steps" in plan
        assert len(plan["steps"]) > 0
        assert all("action" in step for step in plan["steps"])


class TestAICodeModification:
    """AI 코드 수정 테스트"""

    def test_ai_code_modification(self):
        """AI-U03: 코드 수정 (P0)"""
        # Arrange
        from backend.src.ai_agent.coder import generate_code_modification

        plan_step = {
            "action": "fix_validation",
            "file": "src/auth/jwt.py",
            "description": "Fix token expiry check",
        }
        file_content = """
def validate_token(token):
    # BUG: Missing expiry check
    return True
"""

        # Act
        modification = generate_code_modification(plan_step, file_content)

        # Assert
        assert modification is not None
        assert "original" in modification
        assert "modified" in modification
        assert "diff" in modification

    def test_ai_test_generation(self):
        """AI-U04: 테스트 생성 (P1)"""
        # Arrange
        from backend.src.ai_agent.coder import generate_test_code

        code_modification = {
            "file": "src/auth/jwt.py",
            "function": "validate_token",
            "modified": "def validate_token(token):\n    check_expiry(token)\n    return True",
        }

        # Act
        test_code = generate_test_code(code_modification)

        # Assert
        assert test_code is not None
        assert "def test_" in test_code


class TestAIPRCreation:
    """AI PR 생성 테스트"""

    def test_ai_pr_creation(self):
        """AI-U05: PR 생성 (P0)"""
        # Arrange
        from backend.src.ai_agent.pr_manager import create_pr_content

        modifications = [
            {
                "file": "src/auth/jwt.py",
                "diff": "- return True\n+ check_expiry(token)\n+ return True",
            }
        ]
        issue = {"number": 1, "title": "Fix authentication bug"}

        # Act
        pr_content = create_pr_content(modifications, issue)

        # Assert
        assert pr_content is not None
        assert "title" in pr_content
        assert "body" in pr_content
        assert "#1" in pr_content["body"]  # Issue reference
