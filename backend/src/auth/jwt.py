"""
JWT 토큰 관리 모듈
"""

from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError


class TokenExpiredError(Exception):
    """토큰 만료 예외"""
    pass


class InvalidTokenError(Exception):
    """유효하지 않은 토큰 예외"""
    pass


def create_jwt_token(
    user_data: dict,
    secret_key: str,
    expires_in: int = 3600,  # seconds
    algorithm: str = "HS256",
) -> str:
    """JWT 토큰 생성"""
    payload = user_data.copy()
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    payload.update({"exp": expire})
    return jwt.encode(payload, secret_key, algorithm=algorithm)


def validate_jwt_token(
    token: str,
    secret_key: str,
    algorithm: str = "HS256",
) -> dict:
    """JWT 토큰 검증 및 디코딩"""
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError("Token has expired")
    except JWTError as e:
        raise InvalidTokenError(f"Invalid token: {e}")
