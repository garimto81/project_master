"""
Issue 동기화 모듈
"""

from typing import Optional


class IssueSync:
    """이슈 동기화 클래스"""

    def __init__(self, access_token: str):
        self.access_token = access_token

    async def fetch_remote_issues(self, repo_full_name: str) -> list[dict]:
        """원격 이슈 조회"""
        # Implementation will use IssueClient
        return []

    async def compare_states(self, local_issues: list[dict]) -> dict:
        """로컬과 원격 이슈 상태 비교"""
        remote_issues = await self.fetch_remote_issues("repo")

        # Build lookup
        remote_lookup = {i["number"]: i for i in remote_issues}

        changed = []
        for local in local_issues:
            number = local["number"]
            if number in remote_lookup:
                remote = remote_lookup[number]
                if local["state"] != remote["state"]:
                    changed.append({
                        "number": number,
                        "old_state": local["state"],
                        "new_state": remote["state"],
                    })

        return {"changed": changed}
