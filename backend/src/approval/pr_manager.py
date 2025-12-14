"""
PR 관리 모듈
"""

import httpx
from typing import Optional


class PRManager:
    """PR 관리 클래스"""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.github.com"

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github.v3+json",
        }

    async def _create_pr_api(
        self,
        repo_full_name: str,
        head: str,
        base: str,
        title: str,
        body: str,
    ) -> dict:
        """GitHub API를 통한 PR 생성"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/repos/{repo_full_name}/pulls",
                headers=self._get_headers(),
                json={
                    "title": title,
                    "body": body,
                    "head": head,
                    "base": base,
                },
            )
            return response.json()

    async def create_pr(
        self,
        repo_full_name: str,
        head: str,
        base: str,
        title: str,
        body: str,
    ) -> dict:
        """PR 생성"""
        return await self._create_pr_api(
            repo_full_name=repo_full_name,
            head=head,
            base=base,
            title=title,
            body=body,
        )
