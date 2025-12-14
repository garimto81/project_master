"""
CLI 명령어/출력 파싱 모듈
"""

import re
from typing import Optional


def parse_cli_command(user_input: str) -> dict:
    """사용자 입력에서 CLI 명령 파싱"""
    # Extract model from @mention
    model_pattern = r"@(\w+)"
    model_match = re.search(model_pattern, user_input)
    model = model_match.group(1) if model_match else "claude"

    # Remove model mention from input
    action = re.sub(model_pattern, "", user_input).strip()

    # Extract file references
    file_pattern = r"(\S+\.\w+)"
    files = re.findall(file_pattern, action)

    return {
        "model": model,
        "action": action,
        "files": files,
        "raw_input": user_input,
    }


def parse_cli_output(raw_output: str) -> dict:
    """CLI 출력에서 코드 블록과 설명 추출"""
    # Extract code blocks
    code_block_pattern = r"```(\w+)?\n([\s\S]*?)```"
    code_blocks = []

    for match in re.finditer(code_block_pattern, raw_output):
        language = match.group(1) or "text"
        code = match.group(2)
        code_blocks.append({
            "language": language,
            "code": code.strip(),
        })

    # Extract explanation (text outside code blocks)
    explanation = re.sub(code_block_pattern, "", raw_output).strip()

    return {
        "code_blocks": code_blocks,
        "explanation": explanation,
        "has_code": len(code_blocks) > 0,
    }
