"""
코드 파싱 모듈 (Tree-sitter 기반)
"""

import re
from typing import Optional


def parse_file_structure(code: str, language: str = "python") -> dict:
    """코드에서 구조(함수, 클래스) 추출"""
    functions = []
    classes = []

    if language == "python":
        # Parse functions
        func_pattern = r"^def\s+(\w+)\s*\("
        for match in re.finditer(func_pattern, code, re.MULTILINE):
            functions.append({
                "name": match.group(1),
                "line": code[:match.start()].count("\n") + 1,
            })

        # Parse classes
        class_pattern = r"^class\s+(\w+)\s*[:\(]"
        for match in re.finditer(class_pattern, code, re.MULTILINE):
            classes.append({
                "name": match.group(1),
                "line": code[:match.start()].count("\n") + 1,
            })

    elif language in ["javascript", "typescript"]:
        # Parse functions
        func_pattern = r"(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?\([^)]*\)\s*=>|\([^)]*\))"
        for match in re.finditer(func_pattern, code, re.MULTILINE):
            functions.append({
                "name": match.group(1),
                "line": code[:match.start()].count("\n") + 1,
            })

        # Parse classes
        class_pattern = r"class\s+(\w+)"
        for match in re.finditer(class_pattern, code, re.MULTILINE):
            classes.append({
                "name": match.group(1),
                "line": code[:match.start()].count("\n") + 1,
            })

    return {
        "functions": functions,
        "classes": classes,
        "language": language,
    }
