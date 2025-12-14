"""
CLI 실행 모듈 - 구독제 CLI 도구 연동
지원: Claude Code, GPT Codex, Gemini CLI, Qwen CLI
"""

import asyncio
import platform
import shutil
from typing import AsyncIterator


def _get_executable_path(cmd: str) -> str:
    """Windows에서 실행 가능한 CLI 경로 찾기"""
    # 직접 실행 가능한 경우
    path = shutil.which(cmd)
    if path:
        return path

    # Windows에서 .cmd 파일 찾기
    if platform.system() == "Windows":
        cmd_path = shutil.which(f"{cmd}.cmd")
        if cmd_path:
            return cmd_path

    return cmd


class CLIExecutionError(Exception):
    """CLI 실행 에러"""
    pass


class CLITimeoutError(Exception):
    """CLI 타임아웃 에러"""
    pass


def select_model(preferred: str, available: list[str]) -> str:
    """사용 가능한 모델 중 선택"""
    if preferred in available:
        return preferred
    if available:
        return available[0]
    raise CLIExecutionError("No available models")


async def execute_with_fallback(prompt: str, models: list[str]) -> dict:
    """모델 폴백과 함께 실행 - 첫 번째 실패 시 다음 모델로 시도"""
    for model in models:
        try:
            executor = CLIExecutor(model=model)
            result = await executor.generate_code(prompt)
            result["model_used"] = model
            return result
        except Exception:
            continue

    raise CLIExecutionError("All models failed")


class CLIExecutor:
    """CLI 실행기 - 구독제 CLI 도구 연동

    지원 CLI:
    - Claude Code: claude -p (stdin)
    - GPT Codex: codex exec 'prompt'
    - Gemini: gemini -p 'prompt'
    - Qwen: qwen 'prompt'
    """

    def __init__(self, model: str = "claude", timeout: int = 120):
        self.model = model
        self.timeout = timeout
        # 실제 작동하는 CLI 명령어 형식
        self._cli_configs = {
            "claude": {"cmd": "claude", "args": ["-p"], "use_stdin": True},
            "codex": {"cmd": "codex", "args": ["exec"], "use_stdin": False},
            "gemini": {"cmd": "gemini", "args": ["-p"], "use_stdin": False},
            "qwen": {"cmd": "qwen", "args": [], "use_stdin": False},
        }

    def _get_cli_config(self) -> dict:
        """모델에 맞는 CLI 설정 반환"""
        return self._cli_configs.get(
            self.model,
            {"cmd": self.model, "args": [], "use_stdin": False}
        )

    async def generate_code(self, prompt: str) -> dict:
        """코드 생성 실행 - 실제 CLI 호출"""
        config = self._get_cli_config()
        cmd_path = _get_executable_path(config["cmd"])

        try:
            if config["use_stdin"]:
                # Claude: stdin으로 prompt 전달
                process = await asyncio.create_subprocess_exec(
                    cmd_path, *config["args"],
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                try:
                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(input=prompt.encode()),
                        timeout=self.timeout,
                    )
                except asyncio.TimeoutError:
                    process.kill()
                    raise CLITimeoutError(f"CLI timed out after {self.timeout}s")
            else:
                # Codex/Gemini/Qwen: args로 prompt 전달
                cmd = [cmd_path] + config["args"] + [prompt]
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                try:
                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(),
                        timeout=self.timeout,
                    )
                except asyncio.TimeoutError:
                    process.kill()
                    raise CLITimeoutError(f"CLI timed out after {self.timeout}s")

            if process.returncode != 0:
                raise CLIExecutionError(stderr.decode())

            output = stdout.decode()

            # Parse code from output
            from .parser import parse_cli_output
            parsed = parse_cli_output(output)

            code = ""
            if parsed["code_blocks"]:
                code = parsed["code_blocks"][0]["code"]

            return {
                "success": True,
                "code": code,
                "output": output,
                "model": self.model,
            }

        except (FileNotFoundError, OSError) as e:
            raise CLIExecutionError(f"CLI not found: {e}")

    async def analyze_code(self, prompt: str) -> dict:
        """코드 분석 실행"""
        result = await self.generate_code(prompt)
        result["suggestions"] = result.get("output", "")
        return result

    async def stream_output(self, prompt: str) -> AsyncIterator[str]:
        """스트리밍 출력"""
        config = self._get_cli_config()
        cmd_path = _get_executable_path(config["cmd"])

        if config["use_stdin"]:
            process = await asyncio.create_subprocess_exec(
                cmd_path, *config["args"],
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            process.stdin.write(prompt.encode())
            await process.stdin.drain()
            process.stdin.close()
        else:
            cmd = [cmd_path] + config["args"] + [prompt]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

        async for line in process.stdout:
            yield line.decode()
