# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DevFlow** - 비개발자가 AI와 협업하여 소프트웨어를 개발하는 플랫폼

핵심 컨셉: "AI가 코딩 100%, 비개발자가 검증 100%"

## Architecture (2-tier)

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js 14)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │    API Routes       │  │
│  │ /           │  │ MermaidDia- │  │ /api/repositories   │  │
│  │ /project    │  │  gram       │  │ /api/issues         │  │
│  │ /visualiza- │  │ LogicFlow-  │  │ /api/ai/resolve     │  │
│  │  tion       │  │  Viewer     │  │ /api/logic-flow/*   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth        │  │ PostgreSQL  │  │ GitHub OAuth        │  │
│  │ (Session)   │  │ (Future)    │  │ (provider_token)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Note**: `backend/` (FastAPI)는 레거시. 새 기능은 `frontend/src/app/api/`에 구현.

## Commands

### Frontend (Primary)

```bash
cd frontend
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
```

### E2E Tests (Playwright)

```bash
cd frontend
npx playwright test                          # 전체 테스트
npx playwright test tests/e2e/login.spec.ts  # 단일 파일
npx playwright test --ui                     # UI 모드
SKIP_WEB_SERVER=true npx playwright test     # 서버 재시작 없이
```

### Backend (레거시)

```bash
cd backend
ruff check src/ --fix
pytest tests/ -v
```

## Key Architecture Patterns

### Authentication Flow

1. **Client** (`supabase.ts`): `createBrowserClient`로 OAuth 시작
2. **Callback** (`/auth/callback/page.tsx`): 세션 교환 처리
3. **Server** (`auth.ts`): `createServerClient` + cookies로 API 인증
4. GitHub 토큰은 Supabase `session.provider_token`에 자동 저장

```
signInWithGitHub() → GitHub OAuth → /auth/callback → getGitHubTokenFromSession()
```

### Code Visualization System (PRD v6.3)

다층 시각화 시스템:
- **Level 0**: 레포 목록 (`/api/logic-flow/repos`)
- **Level 1-A**: 큰 그림 - 데이터 흐름 (`/api/logic-flow/analyze`)
- **Level 1-B**: 레이어별 모듈 목록
- **Level 2**: 모듈 상세 (`/api/logic-flow/module`)
- **Level 3**: 함수 실행 흐름 (`/api/logic-flow/trace`)

`skott-analyzer.ts`: AST 기반 의존성 분석 (로컬 프로젝트용)

### State Management

Zustand 사용 (설정 시). 현재 대부분 React useState 기반.

## API Routes Structure

```
frontend/src/app/api/
├── auth/
│   ├── callback/route.ts  # OAuth 콜백
│   └── me/route.ts        # 현재 사용자
├── repositories/          # GitHub 레포 목록
├── issues/                # 이슈 CRUD
├── ai/resolve/            # AI 이슈 해결
└── logic-flow/
    ├── repos/route.ts     # 레포 목록 + Mermaid
    ├── analyze/route.ts   # 코드 분석 (import 파싱, 순환 탐지)
    ├── module/route.ts    # 모듈 상세
    ├── trace/route.ts     # 함수 실행 흐름
    └── overview/route.ts  # 전체 개요
```

## Environment Variables

```env
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## Conventions

- 한글 응답, 기술 용어는 영어
- 절대 경로 사용
- 새 API는 `frontend/src/app/api/`에 구현
- Playwright E2E 테스트 필수
- Mermaid 다이어그램은 `MermaidDiagram` 컴포넌트 사용 (SSR 비활성화)

## Docs

- PRD: `tasks/prds/0005-prd-devflow-ai-collaboration.md`
- Supabase 설정: `frontend/docs/SUPABASE_SETUP.md`
