"""
AI 이슈 분석 모듈
"""

from typing import Optional


def analyze_issue(issue: dict, repo_context: dict) -> dict:
    """이슈 분석하여 문제점과 관련 파일 식별"""
    # Extract keywords from issue
    title = issue.get("title", "").lower()
    body = issue.get("body", "").lower()
    labels = [l.get("name", "") for l in issue.get("labels", [])]

    # Determine complexity based on labels and content
    complexity = "low"
    if "bug" in labels or "critical" in labels:
        complexity = "medium"
    if "security" in labels or "architecture" in labels:
        complexity = "high"

    # Identify suggested files based on keywords
    suggested_files = []
    if "auth" in title or "auth" in body or "login" in body:
        suggested_files.append("src/auth/")
    if "api" in title or "endpoint" in body:
        suggested_files.append("src/api/")
    if not suggested_files:
        suggested_files.append("src/")

    return {
        "problem": f"Issue #{issue.get('number', 0)}: {issue.get('title', 'Unknown')}",
        "suggested_files": suggested_files,
        "estimated_complexity": complexity,
        "labels": labels,
    }
