"""
Issue 서비스 모듈
"""

from dataclasses import dataclass
from typing import Optional
import httpx


@dataclass
class IssueLabel:
    """이슈 라벨"""
    id: int
    name: str
    color: str


def fetch_issues(
    repo_full_name: str,
    access_token: str,
    state: str = "open",
) -> list[dict]:
    """이슈 목록 조회"""
    response = httpx.get(
        f"https://api.github.com/repos/{repo_full_name}/issues",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
        params={"state": state},
    )
    return response.json()


def close_issue(
    repo_full_name: str,
    issue_number: int,
    access_token: str,
) -> dict:
    """이슈 닫기"""
    response = httpx.patch(
        f"https://api.github.com/repos/{repo_full_name}/issues/{issue_number}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
        json={"state": "closed"},
    )
    return response.json()


def reopen_issue(
    repo_full_name: str,
    issue_number: int,
    access_token: str,
) -> dict:
    """이슈 다시 열기"""
    response = httpx.patch(
        f"https://api.github.com/repos/{repo_full_name}/issues/{issue_number}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
        json={"state": "open"},
    )
    return response.json()


def parse_issue_labels(raw_labels: list[dict]) -> list[IssueLabel]:
    """라벨 데이터 파싱"""
    return [
        IssueLabel(
            id=label["id"],
            name=label["name"],
            color=label.get("color", ""),
        )
        for label in raw_labels
    ]


def sort_by_priority(issues: list[dict]) -> list[dict]:
    """우선순위로 이슈 정렬"""
    priority_order = {"high": 0, "medium": 1, "low": 2}

    def get_priority(issue: dict) -> int:
        labels = issue.get("labels", [])
        for label in labels:
            name = label.get("name", "")
            if name.startswith("priority:"):
                priority = name.split(":")[1]
                return priority_order.get(priority, 3)
        return 3  # Default priority

    return sorted(issues, key=get_priority)
