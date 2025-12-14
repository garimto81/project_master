"""
Git 작업 모듈
"""

import subprocess
from typing import Optional


class GitOperations:
    """Git 작업 클래스"""

    def __init__(self, repo_path: str):
        self.repo_path = repo_path

    async def create_branch(self, branch_name: str) -> dict:
        """새 브랜치 생성"""
        result = subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
        )

        return {
            "success": result.returncode == 0,
            "branch": branch_name,
            "output": result.stdout,
            "error": result.stderr,
        }

    async def commit_changes(self, message: str, files: list[str]) -> dict:
        """변경 사항 커밋"""
        # Stage files
        for file in files:
            subprocess.run(
                ["git", "add", file],
                cwd=self.repo_path,
                capture_output=True,
            )

        # Commit
        result = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
        )

        return {
            "success": result.returncode == 0,
            "output": result.stdout,
        }

    async def push_branch(self, branch_name: str) -> dict:
        """브랜치 푸시"""
        result = subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
        )

        return {
            "success": result.returncode == 0,
            "output": result.stdout,
        }
