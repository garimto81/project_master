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

```powershell
cd frontend
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
```

### E2E Tests (Playwright)

```powershell
cd frontend
npm run test:e2e                             # 전체 테스트 (또는 npx playwright test)
npm run test:e2e:ui                          # UI 모드
npx playwright test tests/e2e/login.spec.ts  # 단일 파일

# 서버가 이미 실행 중일 때 (PowerShell)
$env:SKIP_WEB_SERVER="true"; npx playwright test
```

테스트 설정:
- Timeout: 60초 (테스트), 30초 (expect)
- webServer: 자동 `npm run dev` 실행 (120초 timeout)
- 브라우저: Chromium only

### Backend (레거시)

```powershell
cd backend
ruff check src/ --fix
pytest tests/ -v
```

## Key Architecture Patterns

### Authentication Flow

```
signInWithGitHub() → GitHub OAuth → /auth/callback → getGitHubTokenFromSession()
```

**파일 역할:**
- `supabase.ts`: 클라이언트 측 `createBrowserClient` + OAuth 헬퍼
- `auth.ts`: 서버 측 `createServerClient` + `requireAuth()` 미들웨어
- `/auth/callback/page.tsx`: OAuth 콜백 세션 교환

GitHub 토큰은 Supabase `session.provider_token`에 자동 저장.

### Code Visualization System (PRD v6.3)

다층 시각화 시스템 - skott 기반 AST 분석:
- **Level 0**: 레포 목록 (`/api/logic-flow/repos`)
- **Level 1-A**: 데이터 흐름 (`/api/logic-flow/analyze`) - import/export 추적
- **Level 1-B**: 레이어별 모듈 목록 (UI/Logic/API/Data/Lib)
- **Level 2**: 모듈 상세 (`/api/logic-flow/module`)
- **Level 3**: 함수 실행 흐름 (`/api/logic-flow/trace`)

**핵심 파일:**
- `skott-analyzer.ts`: AST 기반 의존성 분석, 순환 의존성 탐지
- `MermaidDiagram.tsx`: 레이어별 색상, 줌/팬, 순환 의존성 강조

## API Routes

```
frontend/src/app/api/
├── auth/
│   ├── callback/route.ts  # OAuth 콜백
│   └── me/route.ts        # 현재 사용자
├── health/route.ts        # 헬스체크
├── models/route.ts        # AI 모델 목록
├── repositories/          # GitHub 레포 CRUD
│   └── [owner]/[repo]/    # 특정 레포 조회
├── issues/                # 이슈 CRUD
│   └── [number]/          # 이슈 상세/close/reopen
├── ai/
│   ├── resolve/           # AI 이슈 해결
│   ├── approve/           # AI 솔루션 승인
│   └── reject/            # AI 솔루션 거절
└── logic-flow/
    ├── repos/route.ts     # 레포 목록 + Mermaid
    ├── analyze/route.ts   # 코드 분석 (순환 탐지 포함)
    ├── module/route.ts    # 모듈 상세
    ├── trace/route.ts     # 함수 실행 흐름
    └── overview/route.ts  # 전체 개요
```

## Testing Conventions

E2E 테스트 파일: `frontend/tests/e2e/*.spec.ts`

**data-testid 패턴:**
- 페이지: `login-page`, `dashboard`, `project-page`
- 버튼: `github-login-btn`, `logout-btn`
- 컨테이너: `mermaid-container`, `logic-flow-viewer`

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
- Mermaid 다이어그램은 `MermaidDiagram` 컴포넌트 사용 (`'use client'`)

## Docs

- PRD: `tasks/prds/0005-prd-devflow-ai-collaboration.md`
- Supabase 설정: `frontend/docs/SUPABASE_SETUP.md`
- 테스트 계획: `tasks/prds/0004-tdd-test-plan.md`

## Additional Architecture Notes

### API Client Structure

- `src/lib/api.ts`: 레거시 FastAPI 클라이언트 (localhost:8000) - 사용 비권장
- 새 API 호출: Next.js API Routes (`/api/*`)를 직접 fetch

### Layer Classification (Code Visualization)

`skott-analyzer.ts`에서 사용하는 레이어 분류:

| 레이어 | 파일 패턴 |
|--------|-----------|
| ui | components, pages, app/, .tsx/.jsx |
| api | api/, route, server |
| lib | lib/, util, helper |
| logic | hook, service, store |
| other | 위에 해당 없음 |

### Key Components

- `MermaidDiagram.tsx`: 'use client' 컴포넌트, `VISUALIZATION_LIMITS` 적용
- `skott-analyzer.ts`: 서버 전용 (Node.js 환경)

### State Management

Zustand 사용 (`zustand` v4.5). 별도 store 파일은 필요 시 `src/lib/` 또는 `src/stores/`에 생성.

### Visualization Constants

`lib/colors.ts`에서 중앙 관리:
- `LAYER_COLORS`: Mermaid 다이어그램 레이어 색상
- `VISUALIZATION_LIMITS`: 노드/엣지 표시 제한 (성능 최적화)
