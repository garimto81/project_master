# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DevFlow** - 비개발자가 AI와 협업하여 소프트웨어를 개발하는 플랫폼

핵심 컨셉: "AI가 코딩 100%, 비개발자가 검증 100%"

## Architecture (2-tier, PRD v6.1)

```
Vercel (Next.js 14 + API Routes) → Supabase (Auth + PostgreSQL)
```

**Note**: `backend/` (FastAPI)는 레거시. 새 기능은 `frontend/src/app/api/`에 구현.

## Commands

### Frontend

```bash
cd frontend
npm run dev          # 개발 서버
npm run build        # 빌드
npm run lint         # ESLint
```

### E2E Tests

```bash
cd frontend
npx playwright test                          # 전체
npx playwright test tests/e2e/login.spec.ts  # 단일
npx playwright test --ui                     # UI 모드
```

### Backend (레거시)

```bash
cd backend
ruff check src/ --fix
pytest tests/ -v
```

## Key Files

### Authentication

| 파일 | 역할 |
|------|------|
| `frontend/src/lib/supabase.ts` | 클라이언트 (createBrowserClient) |
| `frontend/src/lib/auth.ts` | 서버 (createServerClient + cookies) |
| `frontend/src/app/auth/callback/page.tsx` | OAuth 콜백 |

### API Routes

```
frontend/src/app/api/
├── repositories/     # GitHub 레포 목록
├── issues/           # 이슈 CRUD
├── ai/resolve/       # AI 이슈 해결
└── auth/me/          # 현재 사용자
```

## Environment

```env
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## Conventions

- 한글 응답, 기술 용어는 영어
- 절대 경로 사용
- 새 API는 `frontend/src/app/api/`에
- Playwright E2E 테스트 필수

## Docs

- PRD: `tasks/prds/0005-prd-devflow-ai-collaboration.md`
- Supabase 설정: `frontend/docs/SUPABASE_SETUP.md`
