"""
LangGraph 워크플로우 통합 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.8

P0 테스트:
- AP-I01: test_langgraph_hitl_interrupt
- AP-I02: test_git_branch_creation
- AP-I03: test_pr_auto_creation
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock


class TestLangGraphHITL:
    """LangGraph Human-in-the-Loop 테스트"""

    @pytest.mark.asyncio
    async def test_langgraph_hitl_interrupt(self):
        """AP-I01: HITL 인터럽트 (P0)"""
        # Arrange
        from backend.src.approval.workflow import ApprovalWorkflow

        workflow = ApprovalWorkflow()
        modifications = [
            {"file": "src/auth.py", "action": "modify"},
        ]

        # Act
        with patch.object(workflow, "_await_approval", new_callable=AsyncMock) as mock_await:
            mock_await.return_value = {"approved": True, "approver": "user-123"}

            result = await workflow.request_approval(modifications)

        # Assert
        assert result["status"] == "approved"
        mock_await.assert_called_once()


class TestGitOperations:
    """Git 작업 통합 테스트"""

    @pytest.mark.asyncio
    async def test_git_branch_creation(self):
        """AP-I02: Git 브랜치 생성 (P0)"""
        # Arrange
        from backend.src.approval.git_ops import GitOperations

        git_ops = GitOperations(repo_path="/path/to/repo")
        issue_number = 42
        branch_name = f"fix/issue-{issue_number}"

        # Act
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(returncode=0, stdout="")
            result = await git_ops.create_branch(branch_name)

        # Assert
        assert result["success"] is True
        assert result["branch"] == branch_name
        mock_run.assert_called()

    @pytest.mark.asyncio
    async def test_pr_auto_creation(self):
        """AP-I03: PR 자동 생성 (P0)"""
        # Arrange
        from backend.src.approval.pr_manager import PRManager

        pr_manager = PRManager(access_token="test_token")
        repo_full_name = "user/repo"
        branch = "fix/issue-42"
        title = "Fix authentication bug"
        body = "Closes #42"

        # Act
        with patch.object(pr_manager, "_create_pr_api", new_callable=AsyncMock) as mock_create:
            mock_create.return_value = {
                "number": 100,
                "html_url": "https://github.com/user/repo/pull/100",
                "state": "open",
            }
            result = await pr_manager.create_pr(
                repo_full_name=repo_full_name,
                head=branch,
                base="main",
                title=title,
                body=body,
            )

        # Assert
        assert result["number"] == 100
        assert "pull/100" in result["html_url"]


class TestApprovalWorkflowIntegration:
    """승인 워크플로우 전체 통합 테스트"""

    @pytest.mark.asyncio
    async def test_full_approval_workflow(self):
        """전체 승인 워크플로우 통합 테스트"""
        # Arrange
        from backend.src.approval.workflow import ApprovalWorkflow

        workflow = ApprovalWorkflow()
        issue = {"number": 42, "title": "Fix bug"}
        modifications = [
            {"file": "src/auth.py", "diff": "+fix"},
        ]

        # Act
        with patch.object(workflow, "_create_branch", new_callable=AsyncMock) as mock_branch:
            with patch.object(workflow, "_apply_changes", new_callable=AsyncMock) as mock_apply:
                with patch.object(workflow, "_await_approval", new_callable=AsyncMock) as mock_await:
                    with patch.object(workflow, "_create_pr", new_callable=AsyncMock) as mock_pr:
                        mock_branch.return_value = {"branch": "fix/issue-42"}
                        mock_apply.return_value = {"success": True}
                        mock_await.return_value = {"approved": True}
                        mock_pr.return_value = {"number": 100}

                        result = await workflow.execute(issue, modifications)

        # Assert
        assert result["status"] == "completed"
        assert result["pr_number"] == 100
        assert result["branch"] == "fix/issue-42"
