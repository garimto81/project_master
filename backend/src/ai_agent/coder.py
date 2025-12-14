"""
AI 코드 수정 모듈
"""

import difflib


def generate_code_modification(plan_step: dict, file_content: str) -> dict:
    """계획 단계에 따라 코드 수정 생성"""
    action = plan_step.get("action", "")
    description = plan_step.get("description", "")

    # Simulate AI-generated modification
    # In production, this would call actual AI model
    modified_content = file_content

    # Simple example modification
    if "fix" in action.lower() or "fix" in description.lower():
        modified_content = file_content.replace(
            "# BUG:",
            "# FIXED:"
        )

    # Generate diff
    diff = list(difflib.unified_diff(
        file_content.splitlines(keepends=True),
        modified_content.splitlines(keepends=True),
        fromfile="original",
        tofile="modified",
    ))

    return {
        "original": file_content,
        "modified": modified_content,
        "diff": "".join(diff),
        "action": action,
    }


def generate_test_code(code_modification: dict) -> str:
    """코드 수정에 대한 테스트 코드 생성"""
    file_path = code_modification.get("file", "unknown")
    function_name = code_modification.get("function", "unknown_function")

    test_code = f'''"""
Auto-generated test for {file_path}
"""

import pytest


def test_{function_name}_basic():
    """Basic test for {function_name}"""
    # Arrange
    # TODO: Add test setup

    # Act
    result = None  # TODO: Call function

    # Assert
    assert result is not None


def test_{function_name}_edge_case():
    """Edge case test for {function_name}"""
    # TODO: Implement edge case tests
    pass
'''
    return test_code
