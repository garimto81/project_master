"""
Diff 생성 모듈
"""

import difflib


def generate_diff(original: str, modified: str) -> str:
    """두 문자열 간의 diff 생성"""
    diff_lines = list(difflib.unified_diff(
        original.splitlines(keepends=True),
        modified.splitlines(keepends=True),
        fromfile="original",
        tofile="modified",
    ))
    return "".join(diff_lines)
