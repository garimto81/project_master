"""
AUTH 단위 테스트 - TDD RED 단계
문서: 0004-tdd-test-plan.md 섹션 2.1

P0 테스트:
- AUTH-U01: test_github_oauth_url_generation
- AUTH-U02: test_github_callback_token_exchange
- AUTH-U03: test_jwt_token_creation
- AUTH-U04: test_jwt_token_validation
"""

import pytest
from unittest.mock import Mock, patch


class TestGitHubOAuth:
    """GitHub OAuth 인증 테스트"""

    def test_github_oauth_url_generation(self):
        """AUTH-U01: OAuth URL 생성 검증 (P0)"""
        # Arrange
        from backend.src.auth.oauth import generate_github_oauth_url

        client_id = "test_client_id"
        redirect_uri = "http://localhost:3000/callback"
        scope = "repo user"

        # Act
        oauth_url = generate_github_oauth_url(client_id, redirect_uri, scope)

        # Assert
        assert "github.com/login/oauth/authorize" in oauth_url
        assert f"client_id={client_id}" in oauth_url
        assert "redirect_uri=" in oauth_url
        assert "scope=" in oauth_url

    def test_github_callback_token_exchange(self):
        """AUTH-U02: 토큰 교환 검증 (P0)"""
        # Arrange
        from backend.src.auth.oauth import exchange_code_for_token

        code = "test_authorization_code"
        client_id = "test_client_id"
        client_secret = "test_client_secret"

        # Act & Assert
        with patch("httpx.post") as mock_post:
            mock_post.return_value = Mock(
                json=lambda: {"access_token": "test_token", "token_type": "bearer"}
            )
            token = exchange_code_for_token(code, client_id, client_secret)
            assert token["access_token"] == "test_token"


class TestJWTToken:
    """JWT 토큰 테스트"""

    def test_jwt_token_creation(self):
        """AUTH-U03: JWT 생성 검증 (P0)"""
        # Arrange
        from backend.src.auth.jwt import create_jwt_token

        user_data = {"user_id": "123", "email": "test@example.com"}
        secret_key = "test_secret"

        # Act
        token = create_jwt_token(user_data, secret_key)

        # Assert
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_jwt_token_validation(self):
        """AUTH-U04: JWT 검증 (P0)"""
        # Arrange
        from backend.src.auth.jwt import create_jwt_token, validate_jwt_token

        user_data = {"user_id": "123", "email": "test@example.com"}
        secret_key = "test_secret"
        token = create_jwt_token(user_data, secret_key)

        # Act
        decoded = validate_jwt_token(token, secret_key)

        # Assert
        assert decoded["user_id"] == "123"
        assert decoded["email"] == "test@example.com"

    def test_jwt_token_expiry(self):
        """AUTH-U05: JWT 만료 검증 (P1)"""
        # Arrange
        from backend.src.auth.jwt import create_jwt_token, validate_jwt_token
        import time

        user_data = {"user_id": "123"}
        secret_key = "test_secret"
        token = create_jwt_token(user_data, secret_key, expires_in=1)

        # Act - Wait for token to expire
        time.sleep(2)

        # Assert
        with pytest.raises(Exception):  # Should raise TokenExpiredError
            validate_jwt_token(token, secret_key)


class TestUserSession:
    """사용자 세션 테스트"""

    def test_user_session_creation(self):
        """AUTH-U06: 세션 생성 검증 (P1)"""
        # Arrange
        from backend.src.auth.session import create_user_session

        user_id = "123"
        access_token = "github_access_token"

        # Act
        session = create_user_session(user_id, access_token)

        # Assert
        assert session.user_id == user_id
        assert session.is_active is True
        assert session.created_at is not None
