"""
REPOSITORY 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.2

P0 테스트:
- REPO-U01: test_fetch_user_repositories
- REPO-U02: test_repository_search_filter
"""

import pytest
from unittest.mock import Mock, patch


class TestRepositoryFetch:
    """저장소 조회 테스트"""

    def test_fetch_user_repositories(self):
        """REPO-U01: 저장소 목록 조회 (P0)"""
        # Arrange
        from backend.src.repository.service import fetch_user_repositories

        user_id = "123"
        access_token = "github_token"

        # Act
        with patch("httpx.get") as mock_get:
            mock_get.return_value = Mock(
                json=lambda: [
                    {"id": 1, "name": "repo1", "full_name": "user/repo1"},
                    {"id": 2, "name": "repo2", "full_name": "user/repo2"},
                ]
            )
            repos = fetch_user_repositories(user_id, access_token)

        # Assert
        assert len(repos) == 2
        assert repos[0]["name"] == "repo1"
        assert repos[1]["name"] == "repo2"

    def test_repository_search_filter(self):
        """REPO-U02: 저장소 검색/필터 (P0)"""
        # Arrange
        from backend.src.repository.service import search_repositories

        repositories = [
            {"name": "frontend-app", "language": "TypeScript"},
            {"name": "backend-api", "language": "Python"},
            {"name": "frontend-admin", "language": "TypeScript"},
        ]
        search_query = "frontend"

        # Act
        filtered = search_repositories(repositories, search_query)

        # Assert
        assert len(filtered) == 2
        assert all("frontend" in repo["name"] for repo in filtered)


class TestRepositorySync:
    """저장소 동기화 테스트"""

    def test_repository_sync_status(self):
        """REPO-U03: 동기화 상태 확인 (P1)"""
        # Arrange
        from backend.src.repository.service import get_sync_status

        repo_id = "123"

        # Act
        status = get_sync_status(repo_id)

        # Assert
        assert status in ["synced", "pending", "error"]

    def test_repository_metadata_parse(self):
        """REPO-U04: 메타데이터 파싱 (P1)"""
        # Arrange
        from backend.src.repository.service import parse_repository_metadata

        raw_data = {
            "id": 123,
            "name": "test-repo",
            "full_name": "user/test-repo",
            "description": "Test repository",
            "language": "Python",
            "stargazers_count": 100,
            "forks_count": 50,
            "open_issues_count": 10,
        }

        # Act
        metadata = parse_repository_metadata(raw_data)

        # Assert
        assert metadata.id == 123
        assert metadata.name == "test-repo"
        assert metadata.stars == 100
        assert metadata.open_issues == 10
