"""
승인 요청 모듈
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import uuid


@dataclass
class ApprovalRequest:
    """승인 요청"""
    id: str
    status: str  # pending, approved, rejected
    issue_number: int
    modifications: list[dict]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    approver_id: Optional[str] = None


def create_approval_request(
    modifications: list[dict],
    issue_number: int,
    user_id: str,
) -> ApprovalRequest:
    """새 승인 요청 생성"""
    return ApprovalRequest(
        id=f"req-{uuid.uuid4().hex[:8]}",
        status="pending",
        issue_number=issue_number,
        modifications=modifications,
    )


def update_status(request: ApprovalRequest, new_status: str) -> ApprovalRequest:
    """승인 요청 상태 업데이트"""
    request.status = new_status

    if new_status == "approved":
        request.approved_at = datetime.now(timezone.utc)
    elif new_status == "rejected":
        request.rejected_at = datetime.now(timezone.utc)

    return request
