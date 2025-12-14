"""
Repository 서비스 모듈
"""

from dataclasses import dataclass
from typing import Optional
import httpx


@dataclass
class RepositoryMetadata:
    """저장소 메타데이터"""
    id: int
    name: str
    full_name: str
    description: Optional[str]
    language: Optional[str]
    stars: int
    forks: int
    open_issues: int


def fetch_user_repositories(user_id: str, access_token: str) -> list[dict]:
    """사용자의 저장소 목록 조회"""
    response = httpx.get(
        "https://api.github.com/user/repos",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
    )
    return response.json()


def search_repositories(repositories: list[dict], query: str) -> list[dict]:
    """저장소 검색/필터링"""
    query_lower = query.lower()
    return [
        repo for repo in repositories
        if query_lower in repo.get("name", "").lower()
    ]


def get_sync_status(repo_id: str) -> str:
    """저장소 동기화 상태 확인"""
    # TODO: Implement actual sync status check
    return "synced"


def parse_repository_metadata(raw_data: dict) -> RepositoryMetadata:
    """GitHub API 응답을 RepositoryMetadata로 변환"""
    return RepositoryMetadata(
        id=raw_data["id"],
        name=raw_data["name"],
        full_name=raw_data.get("full_name", ""),
        description=raw_data.get("description"),
        language=raw_data.get("language"),
        stars=raw_data.get("stargazers_count", 0),
        forks=raw_data.get("forks_count", 0),
        open_issues=raw_data.get("open_issues_count", 0),
    )
