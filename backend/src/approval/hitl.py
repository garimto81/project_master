"""
Human-in-the-Loop 모듈
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import uuid


@dataclass
class HITLInterrupt:
    """HITL 인터럽트"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    step: str = ""
    context: dict = field(default_factory=dict)
    requires_approval: bool = True
    timeout_minutes: int = 30
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def create_interrupt(step: str, context: dict) -> HITLInterrupt:
    """HITL 인터럽트 생성"""
    return HITLInterrupt(
        step=step,
        context=context,
        requires_approval=True,
        timeout_minutes=30,
    )
