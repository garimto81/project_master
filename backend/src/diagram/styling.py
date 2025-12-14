"""
다이어그램 스타일링 모듈
"""


def get_node_color(status: str) -> str:
    """노드 상태에 따른 색상 반환"""
    colors = {
        "success": "#22c55e",  # green
        "error": "#ef4444",    # red
        "warning": "#f59e0b",  # yellow
        "default": "#6b7280",  # gray
        "active": "#3b82f6",   # blue
    }
    return colors.get(status, colors["default"])
