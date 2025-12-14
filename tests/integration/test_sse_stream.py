"""
SSE 스트리밍 통합 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.6

P0 테스트:
- RT-I01: test_sse_connection
- RT-I02: test_sse_streaming
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio


class TestSSEConnection:
    """SSE 연결 테스트"""

    @pytest.mark.asyncio
    async def test_sse_connection(self):
        """RT-I01: SSE 연결 (P0)"""
        # Arrange
        from backend.src.realtime.sse_server import SSEManager

        manager = SSEManager()
        client_id = "client-123"

        # Act
        connection = await manager.connect(client_id)

        # Assert
        assert connection is not None
        assert connection.client_id == client_id
        assert connection.is_connected is True
        assert client_id in manager.active_connections

        # Cleanup
        await manager.disconnect(client_id)

    @pytest.mark.asyncio
    async def test_sse_streaming(self):
        """RT-I02: SSE 스트리밍 (P0)"""
        # Arrange
        from backend.src.realtime.sse_server import SSEManager

        manager = SSEManager()
        client_id = "client-123"
        await manager.connect(client_id)

        received_events = []

        # Act
        async def collect_events():
            async for event in manager.stream_events(client_id):
                received_events.append(event)
                if len(received_events) >= 3:
                    break

        # Send events in background
        async def send_events():
            for i in range(3):
                await manager.send_event(
                    client_id,
                    {"type": "progress", "step": i, "message": f"Step {i}"},
                )
                await asyncio.sleep(0.1)

        await asyncio.gather(
            asyncio.wait_for(collect_events(), timeout=5.0),
            send_events(),
        )

        # Assert
        assert len(received_events) == 3
        assert received_events[0]["step"] == 0
        assert received_events[2]["step"] == 2

        # Cleanup
        await manager.disconnect(client_id)

    @pytest.mark.asyncio
    async def test_sse_reconnection(self):
        """RT-I03: SSE 재연결 (P1)"""
        # Arrange
        from backend.src.realtime.sse_server import SSEManager

        manager = SSEManager()
        client_id = "client-123"

        # First connection
        conn1 = await manager.connect(client_id)
        await manager.disconnect(client_id)

        # Reconnect
        conn2 = await manager.connect(client_id)

        # Assert
        assert conn2.is_connected is True
        assert conn2.reconnection_count == 1

        # Cleanup
        await manager.disconnect(client_id)
