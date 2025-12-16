# Session State: 2025-12-16

## 현재 작업
- **Issue**: #1 - 프로젝트 표시 문제 (1개만 로드됨)
- **Branch**: `fix/issue-1-project-display`
- **진행률**: 90%

## 완료된 항목
- [x] Supabase CLI 설치 및 프로젝트 연결
- [x] GitHub OAuth Provider 설정
- [x] `.env.local` 환경변수 생성
- [x] OAuth callback 페이지 구현 (`/auth/callback`)
- [x] 클라이언트 Supabase 쿠키 기반 세션으로 변경 (`createBrowserClient`)
- [x] 서버 Supabase 쿠키 읽기 구현 (`@supabase/ssr`)
- [x] Next.js API Routes 마이그레이션 (FastAPI → Next.js)
- [x] PRD v6.1 핵심 기능 상세 설계 추가
  - 코드 로직 시각화 API/컴포넌트 설계
  - 이상 징후 감지 시스템 설계
  - 오류 번역 시스템 설계
- [x] 커밋 및 푸시 완료 (`74b824c`)

## 미완료 항목
- [ ] 로그인 후 모든 프로젝트 로드 테스트 (재시작 필요)
- [ ] E2E 테스트 업데이트 (인증 관련)
- [ ] PR 생성 및 main 머지

## 핵심 컨텍스트

### 파일 구조
```
frontend/src/lib/
├── auth.ts      # 서버 사이드 세션 (createServerClient + cookies)
└── supabase.ts  # 클라이언트 사이드 (createBrowserClient)

frontend/src/app/
├── auth/callback/page.tsx  # OAuth 리디렉션 처리
└── api/
    ├── repositories/route.ts  # GitHub 레포 목록
    ├── issues/route.ts        # 이슈 CRUD
    └── ai/resolve/route.ts    # AI 이슈 해결
```

### 인증 흐름
```
클라이언트 (브라우저)        서버 (API Routes)
       |                          |
  [GitHub 로그인]                 |
       |                          |
  [세션 쿠키 저장] ───────────────┤  ← createBrowserClient
       |                          |
  [/api/repositories 호출] ──────→|
       |                          |
       |           [쿠키에서 세션 읽기]  ← createServerClient
       |           [provider_token 획득]
       |                          |
       |←──── [모든 레포 반환]────┤
```

### 핵심 결정
- **3-tier → 2-tier**: FastAPI 백엔드 제거, Next.js API Routes로 통합
- **인증**: Supabase Auth + GitHub OAuth (무료 50,000 MAU)
- **세션 공유**: `@supabase/ssr`로 클라이언트/서버 쿠키 동기화

## 다음 단계
1. 개발 서버 재시작 (`npm run dev`)
2. 로그아웃 → 로그인 테스트
3. Network 탭에서 `/api/repositories` 응답 확인 (200 + 여러 프로젝트)
4. 성공 시 PR 생성

## 남은 변경사항 (미커밋)
- `backend/` 파일들 - 이전 작업 (필요시 별도 커밋)
- `frontend/tests/e2e/` - 테스트 수정
- `frontend/src/app/page.tsx`, `project/page.tsx` - UI 수정
- `frontend/supabase/` - Supabase 로컬 설정

## 메모
- `.env.local`은 gitignore에 포함됨 (커밋 안전)
- 401 에러 원인: 클라이언트는 localStorage, 서버는 cookies에서 세션을 찾아서 불일치
- 해결: 둘 다 `@supabase/ssr`의 쿠키 기반 클라이언트 사용
