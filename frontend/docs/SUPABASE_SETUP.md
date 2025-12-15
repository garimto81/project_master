# Supabase 설정 가이드

DevFlow의 GitHub OAuth 인증을 위한 Supabase 설정 가이드입니다.

## 1. Supabase 프로젝트 생성

### 1.1 계정 생성 및 로그인
1. [https://supabase.com](https://supabase.com) 접속
2. GitHub 계정으로 로그인 (권장)

### 1.2 새 프로젝트 생성
1. Dashboard에서 **New Project** 클릭
2. 프로젝트 정보 입력:
   - **Name**: `devflow` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성 (나중에 사용)
   - **Region**: Northeast Asia (Tokyo) - 한국에서 가장 가까움
3. **Create new project** 클릭 (2-3분 소요)

## 2. API Keys 확인

프로젝트 생성 후:

1. **Settings** > **API** 이동
2. 아래 값들을 복사:

| 항목 | 설명 | 환경변수 |
|------|------|----------|
| **Project URL** | `https://xxxx.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon (public)** | `eyJhbGci...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

## 3. GitHub OAuth 설정

### 3.1 GitHub OAuth App 생성

1. [GitHub Developer Settings](https://github.com/settings/developers) 이동
2. **OAuth Apps** > **New OAuth App** 클릭
3. 정보 입력:

| 필드 | 로컬 개발 | 프로덕션 (Vercel) |
|------|-----------|-------------------|
| **Application name** | `DevFlow Local` | `DevFlow` |
| **Homepage URL** | `http://localhost:3000` | `https://your-app.vercel.app` |
| **Authorization callback URL** | `http://localhost:3000/auth/callback` | `https://your-app.vercel.app/auth/callback` |

4. **Register application** 클릭
5. **Client ID** 복사
6. **Generate a new client secret** 클릭 후 **Client Secret** 복사

### 3.2 Supabase에 GitHub Provider 설정

1. Supabase Dashboard > **Authentication** > **Providers**
2. **GitHub** 찾아서 **Enable** 토글 ON
3. 입력:
   - **Client ID**: GitHub에서 복사한 값
   - **Client Secret**: GitHub에서 복사한 값
4. **Redirect URL** 복사 (다음 형식):
   ```
   https://xxxx.supabase.co/auth/v1/callback
   ```
5. **Save** 클릭

### 3.3 GitHub OAuth App 업데이트

GitHub Developer Settings로 돌아가서:

1. 생성한 OAuth App 클릭
2. **Authorization callback URL** 수정:
   ```
   https://xxxx.supabase.co/auth/v1/callback
   ```
3. **Update application** 클릭

## 4. 환경변수 설정

### 4.1 로컬 개발

```bash
cd frontend
cp .env.local.example .env.local
```

`.env.local` 파일 편집:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

### 4.2 Vercel 배포

Vercel Dashboard > Settings > Environment Variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |

## 5. 테스트

### 5.1 로컬 개발 서버 시작

```bash
cd frontend
npm run dev
```

### 5.2 로그인 테스트

1. `http://localhost:3000` 접속
2. **GitHub로 로그인** 버튼 클릭
3. GitHub 인증 페이지에서 승인
4. 대시보드로 리디렉션 확인
5. 헤더에 GitHub 사용자 이름/아바타 표시 확인

## 6. 문제 해결

### "Invalid redirect URL" 에러

- GitHub OAuth App의 callback URL이 Supabase Redirect URL과 일치하는지 확인
- 로컬 개발 시 `http://localhost:3000` (https 아님) 확인

### "supabaseUrl is required" 에러

- `.env.local` 파일이 `frontend/` 디렉토리에 있는지 확인
- 환경변수 이름 확인 (`NEXT_PUBLIC_` 접두사 필수)
- 개발 서버 재시작 필요

### GitHub 토큰이 없음 (provider_token null)

Supabase Dashboard > Authentication > Providers > GitHub:
- **Additional OAuth scopes** 확인: `read:user user:email repo`

### 로그인 후 세션 유지 안됨

브라우저 개발자 도구 > Application > Cookies:
- `sb-xxxx-auth-token` 쿠키 확인
- 쿠키 차단 설정 확인

## 7. 보안 설정 (프로덕션)

### 7.1 Row Level Security (RLS)

사용자 데이터 보호를 위해 Supabase에서 RLS 정책 설정:

```sql
-- users 테이블 예시 (필요시)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 자신의 데이터만 조회 가능
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = github_id);
```

### 7.2 API Rate Limiting

Supabase Dashboard > Settings > API:
- Rate Limiting 설정 검토
- 필요시 Pro 플랜으로 업그레이드

## 참고 링크

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [GitHub OAuth 가이드](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
