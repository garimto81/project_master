"""
APPROVAL 승인 플로우 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.8

P0 테스트:
- AP-U01: test_approval_request_create
- AP-U02: test_approval_status_update
- AP-U03: test_diff_generation
- AP-U04: test_rollback_execution
"""

import pytest
from unittest.mock import Mock, patch


class TestApprovalRequest:
    """승인 요청 테스트"""

    def test_approval_request_create(self):
        """AP-U01: 승인 요청 생성 (P0)"""
        # Arrange
        from backend.src.approval.request import create_approval_request

        modifications = [
            {"file": "src/auth.py", "action": "modify", "diff": "+line1\n-line2"},
        ]
        issue_number = 1
        user_id = "123"

        # Act
        request = create_approval_request(modifications, issue_number, user_id)

        # Assert
        assert request is not None
        assert request.id is not None
        assert request.status == "pending"
        assert request.issue_number == 1
        assert len(request.modifications) == 1

    def test_approval_status_update(self):
        """AP-U02: 승인 상태 업데이트 (P0)"""
        # Arrange
        from backend.src.approval.request import ApprovalRequest, update_status

        request = ApprovalRequest(
            id="req-123",
            status="pending",
            issue_number=1,
            modifications=[],
        )

        # Act
        updated = update_status(request, "approved")

        # Assert
        assert updated.status == "approved"
        assert updated.approved_at is not None


class TestDiffGeneration:
    """Diff 생성 테스트"""

    def test_diff_generation(self):
        """AP-U03: Diff 생성 (P0)"""
        # Arrange
        from backend.src.approval.diff import generate_diff

        original = """def hello():
    print("Hello")
"""
        modified = """def hello():
    print("Hello, World!")
"""

        # Act
        diff = generate_diff(original, modified)

        # Assert
        assert diff is not None
        assert "-    print(\"Hello\")" in diff
        assert "+    print(\"Hello, World!\")" in diff


class TestRollback:
    """롤백 테스트"""

    def test_rollback_execution(self):
        """AP-U04: 롤백 실행 (P0)"""
        # Arrange
        from backend.src.approval.rollback import execute_rollback
        from unittest.mock import mock_open

        modifications = [
            {
                "file": "src/auth.py",
                "original_content": "def original(): pass",
                "modified_content": "def modified(): pass",
            }
        ]

        # Act
        m = mock_open()
        with patch("builtins.open", m):
            with patch("os.path.exists", return_value=True):
                result = execute_rollback(modifications)

        # Assert
        assert result["success"] is True
        assert result["files_restored"] == 1


class TestHumanInTheLoop:
    """Human-in-the-Loop 테스트"""

    def test_hitl_interrupt_generation(self):
        """HITL 인터럽트 생성 테스트"""
        # Arrange
        from backend.src.approval.hitl import create_interrupt

        step = "code_review"
        context = {"files_modified": ["auth.py"], "changes_summary": "Fixed bug"}

        # Act
        interrupt = create_interrupt(step, context)

        # Assert
        assert interrupt is not None
        assert interrupt.step == "code_review"
        assert interrupt.requires_approval is True
        assert interrupt.timeout_minutes == 30
