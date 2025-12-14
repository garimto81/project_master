"""
AI PR 관리 모듈
"""


def create_pr_content(modifications: list[dict], issue: dict) -> dict:
    """수정 사항과 이슈 정보로 PR 내용 생성"""
    issue_number = issue.get("number", 0)
    issue_title = issue.get("title", "Unknown issue")

    # Generate title
    pr_title = f"Fix: {issue_title}"
    if len(pr_title) > 72:
        pr_title = pr_title[:69] + "..."

    # Generate body with changes summary
    files_changed = [m.get("file", "unknown") for m in modifications]
    changes_summary = "\n".join([f"- `{f}`" for f in files_changed])

    pr_body = f"""## Summary

This PR fixes #{issue_number}: {issue_title}

## Changes

{changes_summary}

## Test Plan

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related Issues

Closes #{issue_number}
"""

    return {
        "title": pr_title,
        "body": pr_body,
        "files_changed": files_changed,
        "issue_number": issue_number,
    }
