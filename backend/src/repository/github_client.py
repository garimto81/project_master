"""
GitHub API 클라이언트
"""

import httpx
from typing import Optional


class GitHubClient:
    """GitHub API 비동기 클라이언트"""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.github.com"

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github.v3+json",
        }

    async def get_repositories(self) -> list[dict]:
        """사용자 저장소 목록 조회"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/user/repos",
                headers=self._get_headers(),
            )
            return response.json()

    async def setup_webhook(
        self,
        repo_full_name: str,
        webhook_url: str,
        events: Optional[list[str]] = None,
    ) -> dict:
        """저장소 웹훅 설정"""
        if events is None:
            events = ["push", "pull_request", "issues"]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/repos/{repo_full_name}/hooks",
                headers=self._get_headers(),
                json={
                    "name": "web",
                    "active": True,
                    "events": events,
                    "config": {
                        "url": webhook_url,
                        "content_type": "json",
                    },
                },
            )
            return response.json()
