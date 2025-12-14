"""
REALTIME 실시간 진행 표시 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.6

P0 테스트:
- RT-U01: test_sse_event_generation
- RT-U02: test_progress_phase_update
"""

import pytest
from unittest.mock import Mock, patch
import json


class TestSSEEvents:
    """SSE 이벤트 테스트"""

    def test_sse_event_generation(self):
        """RT-U01: SSE 이벤트 생성 (P0)"""
        # Arrange
        from backend.src.realtime.sse import create_sse_event

        event_data = {
            "type": "progress",
            "phase": "analyzing",
            "percentage": 25,
            "message": "Analyzing issue...",
        }

        # Act
        sse_event = create_sse_event(event_data)

        # Assert
        assert sse_event is not None
        assert "data:" in sse_event
        parsed = json.loads(sse_event.split("data:")[1].strip())
        assert parsed["type"] == "progress"
        assert parsed["percentage"] == 25

    def test_progress_phase_update(self):
        """RT-U02: 단계 업데이트 (P0)"""
        # Arrange
        from backend.src.realtime.progress import ProgressTracker

        tracker = ProgressTracker(total_phases=5)

        # Act
        tracker.update_phase("analyzing", 1)
        tracker.update_phase("planning", 2)

        # Assert
        assert tracker.current_phase == "planning"
        assert tracker.current_phase_number == 2
        assert tracker.percentage == 40  # 2/5 * 100


class TestProgressCalculation:
    """진행률 계산 테스트"""

    def test_progress_percentage_calc(self):
        """RT-U03: 진행률 계산 (P1)"""
        # Arrange
        from backend.src.realtime.progress import calculate_percentage

        completed_steps = 3
        total_steps = 10

        # Act
        percentage = calculate_percentage(completed_steps, total_steps)

        # Assert
        assert percentage == 30

    def test_log_message_format(self):
        """RT-U04: 로그 메시지 포맷 (P1)"""
        # Arrange
        from backend.src.realtime.progress import format_log_message

        timestamp = "2025-01-01T10:00:00Z"
        level = "info"
        message = "Starting code analysis"

        # Act
        formatted = format_log_message(timestamp, level, message)

        # Assert
        assert "[INFO]" in formatted
        assert "10:00:00" in formatted
        assert "Starting code analysis" in formatted
