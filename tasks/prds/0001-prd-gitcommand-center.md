# PRD: GitCommand Center

**Version**: 1.0
**Date**: 2025-12-13
**Status**: Draft
**Author**: Claude Code

---

## 1. Executive Summary

GitCommand Center는 GitHub 리포지토리와 실시간 동기화되는 **AI-Native GitOps Dashboard**입니다. 개발자가 웹 기반 터미널에서 자연어로 AI 모델(Claude, GPT-4)에게 코딩 명령을 내리고, 그 결과가 칸반 보드와 코드 시각화 다이어그램에 즉시 반영되는 통합 개발 환경을 제공합니다.

### 핵심 가치

| 문제 | 솔루션 |
|------|--------|
| 파편화된 워크플로우 (IDE/이슈/AI 분리) | 단일 대시보드에서 모든 작업 통합 |
| 코드 구조 파악 어려움 | 실시간 의존성 그래프 + 에러 히트맵 |
| AI 제어 비효율성 | 자연어 명령 + 컨텍스트 자동 주입 |

---

## 2. Target Users

### Primary Users (80%)

- **풀스택/백엔드 개발자**: 복잡한 시스템을 다루며 AI를 적극 활용
- **테크 리드**: 팀 프로젝트 진행 상황을 시각적으로 관리

### Secondary Users (20%)

- **오픈소스 메인테이너**: 이슈와 코드 변경 사항 추적
- **PM/기획자**: 기술적 진행 상황 모니터링 (읽기 전용)

### User Personas

| Persona | 역할 | Pain Point | 기대 가치 |
|---------|------|-----------|-----------|
| 김개발 | 시니어 백엔드 | AI 도구 간 컨텍스트 전환 피로 | 단일 인터페이스에서 AI 제어 |
| 이리드 | 테크 리드 | 팀원 작업 현황 파악 어려움 | 실시간 칸반 + 코드 시각화 |
| 박오픈 | OSS 메인테이너 | 이슈-코드 연결 관리 복잡 | AI 자동 이슈 처리 |

---

## 3. Core Features

### 3.1 GitHub Repository Sync

**Priority**: P0 (Critical)
**Effort**: Medium

#### 기능 상세

| 기능 | 설명 |
|------|------|
| OAuth 연동 | GitHub OAuth2.0으로 원클릭 인증 |
| 리포지토리 선택 | 사용자 소유/협업 리포지토리 목록 표시 |
| 실시간 동기화 | Webhook으로 Commit, PR, Issue 변경 1초 이내 반영 |
| 브랜치 관리 | 브랜치 선택, Diff 확인 |

#### 기술 요구사항

```yaml
Authentication:
  - GitHub OAuth 2.0
  - Scope: repo, user, admin:repo_hook

Webhook Events:
  - push
  - pull_request
  - issues
  - issue_comment

API Rate Limits:
  - 5,000 requests/hour (authenticated)
  - Caching strategy required
```

#### 수용 기준

- [ ] GitHub 로그인 후 3초 이내 리포지토리 목록 표시
- [ ] Webhook 이벤트 수신 후 1초 이내 UI 업데이트
- [ ] Private 리포지토리 접근 권한 관리

---

### 3.2 Multi-AI CLI Orchestrator

**Priority**: P0 (Critical)
**Effort**: High

#### 기능 상세

| 기능 | 설명 |
|------|------|
| 웹 터미널 | Xterm.js 기반 브라우저 내 터미널 |
| Model Routing | `@claude`, `@gpt4` 태그로 모델 지정 |
| Context Injection | 현재 파일, 이슈 번호 자동 컨텍스트 포함 |
| Action Execution | AI 제안 코드를 Apply 또는 새 브랜치로 Push |

#### 명령어 예시

```bash
# 기본 명령어
> @claude auth_service.ts의 JWT 만료 문제 분석해줘

# 다중 모델 협업
> @gpt4가 main.py 분석하고, @claude가 테스트 코드 작성해줘

# 이슈 연동
> fix: #45 인증 버그 수정하고 PR 생성해줘
```

#### 지원 AI 모델

| 모델 | Provider | 용도 | 우선순위 |
|------|----------|------|----------|
| Claude 3.5 Sonnet | Anthropic | 코드 분석, 리팩토링 | Primary |
| GPT-4o | OpenAI | 코드 생성, 문서화 | Primary |

#### 기술 요구사항

```yaml
Terminal:
  - Library: Xterm.js
  - Features: 256 color, Unicode, resize

AI Orchestration:
  - Framework: LangGraph
  - State Management: Redis/Memory
  - Streaming: Server-Sent Events (SSE)

Context Management:
  - File content injection
  - Issue/PR metadata
  - Git diff context
```

#### 수용 기준

- [ ] 명령어 입력 후 첫 토큰 응답 2초 이내
- [ ] 스트리밍으로 실시간 응답 표시
- [ ] 코드 블록 구문 강조
- [ ] Apply/Reject 버튼으로 코드 적용 제어

---

### 3.3 Issue-Driven Kanban Board

**Priority**: P0 (Critical)
**Effort**: Medium

#### 기능 상세

| 기능 | 설명 |
|------|------|
| GitHub Issues 연동 | Issues ↔ 칸반 카드 양방향 동기화 |
| 드래그앤드롭 | 카드 이동으로 상태 변경 |
| AI Auto-Move | AI가 PR 생성 시 카드 자동 이동 |
| Task Breakdown | AI가 큰 이슈를 하위 이슈로 분해 |

#### 칸반 컬럼

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Backlog │→│ To Do   │→│ In Prog │→│ Review  │→│ Done    │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

#### AI Auto-Move 규칙

| 트리거 | 액션 |
|--------|------|
| AI 코드 수정 시작 | Backlog → In Progress |
| AI PR 생성 | In Progress → Review |
| PR Merge | Review → Done |
| CI 실패 | Review → In Progress (with label) |

#### 기술 요구사항

```yaml
UI Library:
  - @dnd-kit/core (드래그앤드롭)
  - React Query (상태 동기화)

Real-time:
  - Supabase Realtime
  - Optimistic updates

GitHub Sync:
  - Issues API
  - Labels for column mapping
```

#### 수용 기준

- [ ] 드래그 후 500ms 이내 GitHub 동기화
- [ ] AI 명령 실행 시 칸반 카드 자동 이동
- [ ] 오프라인 작업 후 재연결 시 충돌 해결

---

### 3.4 Dynamic Code Visualization

**Priority**: P1 (High)
**Effort**: High

#### 기능 상세

| 기능 | 설명 |
|------|------|
| Dependency Graph | import/함수 호출 관계 노드-엣지 다이어그램 |
| Error Heatmap | 에러 발생 파일/모듈 적색 하이라이트 |
| Interactive | 노드 클릭 시 파일 내용 및 AI 분석 표시 |
| Real-time | CI/CD 결과 반영, LSP 에러 감지 |

#### 시각화 구성

```
┌────────────────────────────────────────────┐
│              Code Diagram                  │
│   ┌───────┐        ┌───────┐              │
│   │ auth  │───────→│ user  │              │
│   │ (RED) │        │ (OK)  │              │
│   └───────┘        └───────┘              │
│       ↓                ↓                   │
│   ┌───────┐        ┌───────┐              │
│   │ jwt   │        │  db   │              │
│   │ (RED) │        │ (OK)  │              │
│   └───────┘        └───────┘              │
└────────────────────────────────────────────┘
```

#### 노드 상태

| 색상 | 의미 |
|------|------|
| 녹색 | 정상 |
| 노랑 | 경고 (린트 에러) |
| 적색 | 에러 (테스트 실패, CI 실패) |
| 회색 | 미분석 |

#### 기술 요구사항

```yaml
Visualization:
  - Library: React Flow
  - Layout: Dagre (자동 배치)

Code Analysis:
  - Tree-sitter: AST 파싱 (40+ 언어)
  - LSP: 실시간 에러 감지

Data Sources:
  - GitHub Actions (CI/CD 결과)
  - LSP Diagnostics
  - Test Coverage Reports
```

#### 수용 기준

- [ ] 100개 파일 리포지토리 렌더링 3초 이내
- [ ] 에러 발생 시 5초 이내 히트맵 업데이트
- [ ] 노드 클릭 시 1초 이내 상세 정보 표시

---

## 4. Technical Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitCommand Center                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15)                                      │
│  ├── Dashboard Layout                                       │
│  ├── React Flow (Code Visualization)                        │
│  ├── Xterm.js (Web Terminal)                               │
│  ├── Kanban Board (@dnd-kit)                               │
│  └── Zustand (State Management)                            │
├─────────────────────────────────────────────────────────────┤
│  Backend (FastAPI)                                          │
│  ├── GitHub API Gateway                                     │
│  ├── AI Orchestrator (LangGraph)                           │
│  ├── Code Analyzer (Tree-sitter + LSP)                     │
│  └── WebSocket Server (Real-time)                          │
├─────────────────────────────────────────────────────────────┤
│  Database & Storage                                         │
│  ├── Supabase (PostgreSQL + Realtime + Auth)               │
│  └── pgvector (Code Embeddings for RAG)                    │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ├── GitHub API + Webhooks                                 │
│  ├── Anthropic API (Claude)                                │
│  └── OpenAI API (GPT-4)                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 (App Router) | Server Components, 최신 React 기능 |
| State | Zustand | 가벼움, 보일러플레이트 최소 |
| Visualization | React Flow | MIT, 검증됨, 풍부한 예제 |
| Terminal | Xterm.js | 업계 표준 (VS Code 사용) |
| Backend | FastAPI | LangGraph 호환, 비동기 성능 |
| AI Orchestration | LangGraph | 복잡한 에이전트 흐름 제어 |
| Code Analysis | Tree-sitter | 40+ 언어 AST 파싱 |
| Database | Supabase | 실시간 구독, Auth 내장 |
| Vector Store | pgvector | PostgreSQL 통합, 75% 비용 절감 |

### 4.3 Data Models

#### User

```typescript
interface User {
  id: string;
  github_id: number;
  username: string;
  avatar_url: string;
  access_token: string; // encrypted
  created_at: Date;
  updated_at: Date;
}
```

#### Repository

```typescript
interface Repository {
  id: string;
  user_id: string;
  github_repo_id: number;
  name: string;
  full_name: string;
  default_branch: string;
  webhook_id?: number;
  last_synced_at: Date;
}
```

#### Issue (Kanban Card)

```typescript
interface Issue {
  id: string;
  repository_id: string;
  github_issue_id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  column: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  assignees: string[];
  labels: string[];
  created_at: Date;
  updated_at: Date;
}
```

#### AI Session

```typescript
interface AISession {
  id: string;
  user_id: string;
  repository_id: string;
  model: 'claude' | 'gpt4';
  messages: Message[];
  context: {
    files: string[];
    issues: number[];
    branch: string;
  };
  created_at: Date;
}
```

---

## 5. User Flow

### 5.1 Onboarding Flow

```
1. Landing Page
   ↓
2. "Login with GitHub" 클릭
   ↓
3. GitHub OAuth 인증
   ↓
4. 리포지토리 선택 화면
   ↓
5. Webhook 자동 설정
   ↓
6. Dashboard 진입
```

### 5.2 Main Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard                              │
│  ┌───────────────┬───────────────┬───────────────────────┐ │
│  │ Code Diagram  │ Kanban Board  │ Terminal              │ │
│  │ (좌측)        │ (중앙)        │ (하단)                │ │
│  └───────────────┴───────────────┴───────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

1. [Code Diagram] 적색 노드(auth_service.ts) 발견
   ↓
2. [Terminal] > @claude auth_service.ts의 에러 원인 분석해줘
   ↓
3. [AI Response] JWT 만료 로직 문제 발견, 수정 코드 제안
   ↓
4. [Terminal] > approve (또는 Apply 버튼 클릭)
   ↓
5. [자동] fix/auth-issue 브랜치 생성 + Push
   ↓
6. [Kanban] 이슈 #45 카드가 "Review"로 자동 이동
   ↓
7. [Code Diagram] auth_service.ts 노드가 녹색으로 변경
```

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| 초기 로딩 | < 3초 | Lighthouse |
| API 응답 | < 500ms | p95 |
| AI 첫 토큰 | < 2초 | SSE 응답 시간 |
| 실시간 업데이트 | < 1초 | Webhook → UI |

### 6.2 Scalability

| Metric | Target |
|--------|--------|
| 동시 사용자 | 1,000명 |
| 리포지토리/사용자 | 50개 |
| 파일/리포지토리 | 10,000개 |

### 6.3 Security

| 항목 | 요구사항 |
|------|----------|
| 인증 | GitHub OAuth 2.0 only |
| 토큰 저장 | AES-256 암호화 |
| API 통신 | HTTPS only |
| CORS | 화이트리스트 도메인만 허용 |

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Next.js 15 프로젝트 셋업
- [ ] Supabase 연동 (Auth, Database)
- [ ] GitHub OAuth 구현
- [ ] 기본 대시보드 레이아웃

### Phase 2: GitHub Integration (Week 3-4)

- [ ] 리포지토리 목록 조회
- [ ] Webhook 설정/관리
- [ ] 실시간 이벤트 수신
- [ ] 브랜치/커밋 정보 표시

### Phase 3: AI Terminal (Week 5-6)

- [ ] Xterm.js 터미널 구현
- [ ] LangGraph 에이전트 셋업
- [ ] Claude/GPT-4 API 연동
- [ ] 컨텍스트 자동 주입

### Phase 4: Kanban Board (Week 7-8)

- [ ] Issues ↔ 칸반 동기화
- [ ] 드래그앤드롭 구현
- [ ] AI Auto-Move 로직
- [ ] 라벨/필터링

### Phase 5: Code Visualization (Week 9-10)

- [ ] Tree-sitter 코드 분석
- [ ] React Flow 다이어그램
- [ ] Error Heatmap 연동
- [ ] 인터랙티브 노드

### Phase 6: Polish & Launch (Week 11-12)

- [ ] 성능 최적화
- [ ] 에러 처리/로깅
- [ ] 문서화
- [ ] 베타 테스트

---

## 8. Success Metrics

### 8.1 MVP Success Criteria

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| GitHub 연동 성공률 | > 95% | OAuth 완료율 |
| AI 명령 성공률 | > 90% | 유효 응답 비율 |
| 칸반 동기화 정확도 | > 99% | GitHub vs 앱 상태 일치 |

### 8.2 User Engagement (Post-Launch)

| Metric | Target |
|--------|--------|
| DAU/MAU | > 30% |
| 평균 세션 시간 | > 15분 |
| AI 명령/세션 | > 5회 |

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| GitHub API Rate Limit | High | Medium | 캐싱, 배치 요청 |
| AI 비용 증가 | High | High | 사용량 제한, 티어별 과금 |
| 실시간 동기화 지연 | Medium | Medium | 낙관적 업데이트, 재시도 로직 |
| Tree-sitter 언어 미지원 | Low | Low | 폴백 파서, 커뮤니티 grammar |

---

## 10. Open Questions

1. **모바일 지원**: 반응형 웹으로 충분한가, 별도 앱 필요한가?
2. **팀 기능**: 다중 사용자 협업 기능 범위는?
3. **과금 모델**: Freemium vs 유료 전용?
4. **Self-hosted**: 온프레미스 배포 지원 여부?

---

## 11. Appendix

### A. 경쟁사 분석

| 제품 | 강점 | 약점 |
|------|------|------|
| GitHub Copilot | IDE 통합, 코드 완성 | 프로젝트 관리 없음 |
| Cursor | AI-first IDE | 웹 기반 아님 |
| Linear | 칸반, 이슈 관리 | AI 코딩 없음 |
| **GitCommand Center** | 통합 (AI+칸반+시각화) | 신규 제품 |

### B. 기술 문서 참조

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [React Flow Examples](https://reactflow.dev/examples)
- [Xterm.js Guide](https://xtermjs.org/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)

---

**Next Steps**:
1. `/todo` 실행하여 Task 목록 생성
2. Phase 1 Foundation 착수
