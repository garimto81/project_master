"""
롤백 실행 모듈
"""

import os


def execute_rollback(modifications: list[dict]) -> dict:
    """수정 사항 롤백"""
    files_restored = 0
    errors = []

    for mod in modifications:
        file_path = mod.get("file", "")
        original_content = mod.get("original_content", "")

        if not file_path:
            continue

        try:
            if os.path.exists(file_path):
                with open(file_path, "w") as f:
                    f.write(original_content)
                files_restored += 1
        except (IOError, OSError) as e:
            errors.append({
                "file": file_path,
                "error": str(e),
            })

    return {
        "success": len(errors) == 0,
        "files_restored": files_restored,
        "errors": errors,
    }
