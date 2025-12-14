"""
SSE 서버 매니저 모듈
"""

import asyncio
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional
from datetime import datetime


@dataclass
class SSEConnection:
    """SSE 연결"""
    client_id: str
    is_connected: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    reconnection_count: int = 0
    _queue: asyncio.Queue = field(default_factory=asyncio.Queue)


class SSEManager:
    """SSE 연결 매니저"""

    def __init__(self):
        self.active_connections: dict[str, SSEConnection] = {}
        self._reconnection_counts: dict[str, int] = {}

    async def connect(self, client_id: str) -> SSEConnection:
        """클라이언트 연결"""
        reconnection_count = self._reconnection_counts.get(client_id, 0)

        connection = SSEConnection(
            client_id=client_id,
            reconnection_count=reconnection_count,
        )
        self.active_connections[client_id] = connection

        return connection

    async def disconnect(self, client_id: str):
        """클라이언트 연결 해제"""
        if client_id in self.active_connections:
            self.active_connections[client_id].is_connected = False
            # Track reconnection count
            current_count = self._reconnection_counts.get(client_id, 0)
            self._reconnection_counts[client_id] = current_count + 1
            del self.active_connections[client_id]

    async def send_event(self, client_id: str, data: dict):
        """클라이언트에 이벤트 전송"""
        if client_id in self.active_connections:
            conn = self.active_connections[client_id]
            await conn._queue.put(data)

    async def stream_events(self, client_id: str) -> AsyncIterator[dict]:
        """클라이언트 이벤트 스트리밍"""
        if client_id not in self.active_connections:
            return

        conn = self.active_connections[client_id]
        while conn.is_connected:
            try:
                event = await asyncio.wait_for(conn._queue.get(), timeout=1.0)
                yield event
            except asyncio.TimeoutError:
                continue
