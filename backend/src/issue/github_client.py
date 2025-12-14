"""
Issue GitHub API 클라이언트
"""

import httpx
from typing import Optional


class IssueClient:
    """Issue API 비동기 클라이언트"""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.github.com"

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github.v3+json",
        }

    async def get_issues(
        self,
        repo_full_name: str,
        state: str = "open",
    ) -> list[dict]:
        """이슈 목록 조회"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/repos/{repo_full_name}/issues",
                headers=self._get_headers(),
                params={"state": state},
            )
            return response.json()

    async def update_issue_state(
        self,
        repo_full_name: str,
        issue_number: int,
        state: str,
    ) -> dict:
        """이슈 상태 업데이트"""
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/repos/{repo_full_name}/issues/{issue_number}",
                headers=self._get_headers(),
                json={"state": state},
            )
            return response.json()
