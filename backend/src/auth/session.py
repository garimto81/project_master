"""
사용자 세션 관리 모듈
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import uuid


@dataclass
class UserSession:
    """사용자 세션"""
    user_id: str
    access_token: str
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


def create_user_session(
    user_id: str,
    access_token: str,
    expires_in_hours: int = 24,
) -> UserSession:
    """새 사용자 세션 생성"""
    from datetime import timedelta

    session = UserSession(
        user_id=user_id,
        access_token=access_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
    )
    return session
