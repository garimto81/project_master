"""
ISSUE 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.3

P0 테스트:
- ISSUE-U01: test_fetch_open_issues
- ISSUE-U02: test_fetch_closed_issues
- ISSUE-U03: test_issue_close
- ISSUE-U04: test_issue_reopen
"""

import pytest
from unittest.mock import Mock, patch


class TestIssueFetch:
    """이슈 조회 테스트"""

    def test_fetch_open_issues(self):
        """ISSUE-U01: 열린 이슈 조회 (P0)"""
        # Arrange
        from backend.src.issue.service import fetch_issues

        repo_full_name = "user/repo"
        access_token = "github_token"

        # Act
        with patch("httpx.get") as mock_get:
            mock_get.return_value = Mock(
                json=lambda: [
                    {"id": 1, "number": 1, "title": "Bug fix", "state": "open"},
                    {"id": 2, "number": 2, "title": "Feature", "state": "open"},
                ]
            )
            issues = fetch_issues(repo_full_name, access_token, state="open")

        # Assert
        assert len(issues) == 2
        assert all(issue["state"] == "open" for issue in issues)

    def test_fetch_closed_issues(self):
        """ISSUE-U02: 닫힌 이슈 조회 (P0)"""
        # Arrange
        from backend.src.issue.service import fetch_issues

        repo_full_name = "user/repo"
        access_token = "github_token"

        # Act
        with patch("httpx.get") as mock_get:
            mock_get.return_value = Mock(
                json=lambda: [
                    {"id": 3, "number": 3, "title": "Fixed bug", "state": "closed"},
                ]
            )
            issues = fetch_issues(repo_full_name, access_token, state="closed")

        # Assert
        assert len(issues) == 1
        assert issues[0]["state"] == "closed"


class TestIssueStateChange:
    """이슈 상태 변경 테스트"""

    def test_issue_close(self):
        """ISSUE-U03: 이슈 닫기 (P0)"""
        # Arrange
        from backend.src.issue.service import close_issue

        repo_full_name = "user/repo"
        issue_number = 1
        access_token = "github_token"

        # Act
        with patch("httpx.patch") as mock_patch:
            mock_patch.return_value = Mock(
                json=lambda: {"id": 1, "number": 1, "state": "closed"}
            )
            result = close_issue(repo_full_name, issue_number, access_token)

        # Assert
        assert result["state"] == "closed"

    def test_issue_reopen(self):
        """ISSUE-U04: 이슈 다시 열기 (P0)"""
        # Arrange
        from backend.src.issue.service import reopen_issue

        repo_full_name = "user/repo"
        issue_number = 1
        access_token = "github_token"

        # Act
        with patch("httpx.patch") as mock_patch:
            mock_patch.return_value = Mock(
                json=lambda: {"id": 1, "number": 1, "state": "open"}
            )
            result = reopen_issue(repo_full_name, issue_number, access_token)

        # Assert
        assert result["state"] == "open"


class TestIssueMetadata:
    """이슈 메타데이터 테스트"""

    def test_issue_label_parse(self):
        """ISSUE-U05: 라벨 파싱 (P1)"""
        # Arrange
        from backend.src.issue.service import parse_issue_labels

        raw_labels = [
            {"id": 1, "name": "bug", "color": "d73a4a"},
            {"id": 2, "name": "enhancement", "color": "a2eeef"},
        ]

        # Act
        labels = parse_issue_labels(raw_labels)

        # Assert
        assert len(labels) == 2
        assert labels[0].name == "bug"
        assert labels[1].name == "enhancement"

    def test_issue_priority_sort(self):
        """ISSUE-U06: 우선순위 정렬 (P1)"""
        # Arrange
        from backend.src.issue.service import sort_by_priority

        issues = [
            {"number": 1, "labels": [{"name": "priority:low"}]},
            {"number": 2, "labels": [{"name": "priority:high"}]},
            {"number": 3, "labels": [{"name": "priority:medium"}]},
        ]

        # Act
        sorted_issues = sort_by_priority(issues)

        # Assert
        assert sorted_issues[0]["number"] == 2  # high
        assert sorted_issues[1]["number"] == 3  # medium
        assert sorted_issues[2]["number"] == 1  # low
