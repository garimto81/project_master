"""
진행률 추적 모듈
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ProgressTracker:
    """진행률 추적기"""
    total_phases: int
    current_phase: str = ""
    current_phase_number: int = 0
    percentage: int = 0
    logs: list = field(default_factory=list)

    def update_phase(self, phase_name: str, phase_number: int):
        """단계 업데이트"""
        self.current_phase = phase_name
        self.current_phase_number = phase_number
        self.percentage = int((phase_number / self.total_phases) * 100)
        self.logs.append({
            "phase": phase_name,
            "number": phase_number,
            "timestamp": datetime.now().isoformat(),
        })


def calculate_percentage(completed: int, total: int) -> int:
    """진행률 백분율 계산"""
    if total == 0:
        return 0
    return int((completed / total) * 100)


def format_log_message(timestamp: str, level: str, message: str) -> str:
    """로그 메시지 포맷"""
    # Extract time portion from timestamp
    time_part = timestamp.split("T")[1][:8] if "T" in timestamp else timestamp

    level_upper = level.upper()
    return f"[{level_upper}] {time_part} - {message}"
