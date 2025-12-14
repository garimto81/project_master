"""
GitHub OAuth 인증 모듈
"""

from urllib.parse import urlencode
import httpx


def generate_github_oauth_url(
    client_id: str,
    redirect_uri: str,
    scope: str = "repo user",
) -> str:
    """GitHub OAuth URL 생성"""
    base_url = "https://github.com/login/oauth/authorize"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
    }
    return f"{base_url}?{urlencode(params)}"


def exchange_code_for_token(
    code: str,
    client_id: str,
    client_secret: str,
) -> dict:
    """Authorization code를 access token으로 교환"""
    response = httpx.post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
        },
        headers={"Accept": "application/json"},
    )
    return response.json()
