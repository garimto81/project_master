"""
GitHub API 통합 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.2, 2.3

P0 테스트:
- REPO-I01: test_github_api_repository_list
- ISSUE-I01: test_github_issue_api
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import httpx


class TestGitHubRepositoryAPI:
    """GitHub Repository API 통합 테스트"""

    @pytest.mark.asyncio
    async def test_github_api_repository_list(self):
        """REPO-I01: GitHub API 연동 (P0)"""
        # Arrange
        from backend.src.repository.github_client import GitHubClient

        access_token = "test_token"
        client = GitHubClient(access_token)

        # Act
        with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = Mock(
                status_code=200,
                json=lambda: [
                    {"id": 1, "name": "repo1", "full_name": "user/repo1"},
                    {"id": 2, "name": "repo2", "full_name": "user/repo2"},
                ],
            )
            repos = await client.get_repositories()

        # Assert
        assert len(repos) == 2
        assert repos[0]["name"] == "repo1"
        mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_repository_webhook_setup(self):
        """REPO-I02: 웹훅 설정 (P1)"""
        # Arrange
        from backend.src.repository.github_client import GitHubClient

        access_token = "test_token"
        client = GitHubClient(access_token)
        repo_full_name = "user/repo"
        webhook_url = "https://example.com/webhook"

        # Act
        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = Mock(
                status_code=201,
                json=lambda: {"id": 123, "active": True, "config": {"url": webhook_url}},
            )
            result = await client.setup_webhook(repo_full_name, webhook_url)

        # Assert
        assert result["id"] == 123
        assert result["active"] is True


class TestGitHubIssueAPI:
    """GitHub Issue API 통합 테스트"""

    @pytest.mark.asyncio
    async def test_github_issue_api(self):
        """ISSUE-I01: GitHub Issue API (P0)"""
        # Arrange
        from backend.src.issue.github_client import IssueClient

        access_token = "test_token"
        client = IssueClient(access_token)
        repo_full_name = "user/repo"

        # Act
        with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = Mock(
                status_code=200,
                json=lambda: [
                    {"id": 1, "number": 1, "title": "Bug", "state": "open"},
                    {"id": 2, "number": 2, "title": "Feature", "state": "open"},
                ],
            )
            issues = await client.get_issues(repo_full_name, state="open")

        # Assert
        assert len(issues) == 2
        assert all(issue["state"] == "open" for issue in issues)

    @pytest.mark.asyncio
    async def test_issue_state_sync(self):
        """ISSUE-I02: 상태 동기화 (P1)"""
        # Arrange
        from backend.src.issue.sync import IssueSync

        sync = IssueSync(access_token="test_token")
        local_issues = [
            {"number": 1, "state": "open"},
            {"number": 2, "state": "open"},
        ]
        remote_issues = [
            {"number": 1, "state": "closed"},  # Changed!
            {"number": 2, "state": "open"},
        ]

        # Act
        with patch.object(sync, "fetch_remote_issues", return_value=remote_issues):
            diff = await sync.compare_states(local_issues)

        # Assert
        assert len(diff["changed"]) == 1
        assert diff["changed"][0]["number"] == 1
        assert diff["changed"][0]["new_state"] == "closed"
