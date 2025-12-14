"""
CLI 설치 확인 모듈
"""

import subprocess
import shutil


def check_cli_available(cli_name: str) -> bool:
    """CLI 도구 설치 여부 확인"""
    # Check if command exists
    if shutil.which(cli_name) is not None:
        return True

    # Try running version command
    try:
        result = subprocess.run(
            [cli_name, "--version"],
            capture_output=True,
            timeout=5,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return False
