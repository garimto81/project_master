"""
SSE 이벤트 생성 모듈
"""

import json


def create_sse_event(data: dict, event_type: str = "message") -> str:
    """SSE 이벤트 포맷 생성"""
    event_lines = []

    if event_type != "message":
        event_lines.append(f"event: {event_type}")

    json_data = json.dumps(data)
    event_lines.append(f"data: {json_data}")
    event_lines.append("")  # Empty line to end event

    return "\n".join(event_lines)
