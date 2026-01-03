# Task List: 코드 시각화 시스템 재설계 (PRD-0007)

**Version**: 1.2 (MVP)
**Created**: 2025-01-03
**PRD**: `tasks/prds/0007-prd-diagram-redesign.md`

---

## 진행 상황

```
전체: 17/20 (85%)
█████████████████░░░
```

---

## Phase 1: AST 분석 기반 구축

**목표**: ts-morph로 정확한 코드 분석 기반 구축

### Task 1.1: ts-morph 패키지 설치 및 기본 설정 ✅
- [x] `npm install ts-morph` 설치
- [x] TypeScript 설정 확인 (tsconfig.json)
- [x] 기본 Project 인스턴스 생성 테스트

### Task 1.2: 함수/클래스/타입 추출 로직 구현 ✅
- [x] `lib/ast-analyzer.ts` 파일 생성
- [x] 함수 추출: `extractFunctions()`, `extractMethods()`
- [x] 클래스 추출: `extractClasses()`
- [x] 타입 추출: Export/Import 추출
- [x] React 컴포넌트 판별 로직

### Task 1.3: Export 패턴 기반 레이어 분류 구현 ✅
- [x] `isReactComponent()` 함수 (JSX 반환 확인)
- [x] `isCustomHook()` 함수 (use* prefix + hooks 사용)
- [x] `isApiRouteHandler()` 함수 (GET/POST export)
- [x] `checkHasSupabase()` 함수 (Supabase 호출)
- [x] `classifyLayer()` 메인 함수

### Task 1.4: /api/logic-flow/ast 엔드포인트 구현 ✅
- [x] `app/api/logic-flow/ast/route.ts` 생성
- [x] Request/Response 타입 정의
- [x] GitHub 파일 fetch + AST 분석 연동
- [x] 에러 핸들링

---

## Phase 2: 백그라운드 분석 시스템 (MVP)

**목표**: 로그인 시 백그라운드 분석 → 캐시 저장 → 클릭 시 즉시 표시

### Task 2.1: Vercel KV 캐시 설정 ✅
- [x] `@vercel/kv` 패키지 설치
- [x] 환경 변수 설정 (.env.local.example 업데이트)
- [x] 캐시 헬퍼 함수 작성 (`lib/cache.ts`)
- [x] TTL 24시간 설정 + 메모리 캐시 폴백

### Task 2.2: /api/analysis/trigger 엔드포인트 구현 ✅
- [x] `app/api/analysis/trigger/route.ts` 생성
- [x] 레포 목록 조회 (상위 10개)
- [x] 캐시 확인 → 미스 시 백그라운드 분석 시작
- [x] fire-and-forget 패턴 구현

### Task 2.3: /api/analysis/status 엔드포인트 구현 ✅
- [x] `app/api/analysis/status/route.ts` 생성
- [x] 메모리 기반 분석 상태 관리
- [x] 진행률 추적

### Task 2.4: /api/analysis/cached 엔드포인트 구현 ✅
- [x] `app/api/analysis/cached/route.ts` 생성
- [x] Vercel KV에서 캐시 조회
- [x] 캐시 히트/미스 응답
- [x] DELETE 엔드포인트 (캐시 무효화)

### Task 2.5: useProjectAnalysis 훅 구현 ✅
- [x] `hooks/useProjectAnalysis.ts` 생성
- [x] SWR 기반 캐시 조회
- [x] 분석 상태 폴링
- [x] 캐시 미스 시 트리거 자동 호출
- [x] `useTriggerAnalysis` 배치 트리거 훅

---

## Phase 3: 호출 그래프 생성

**목표**: 함수 간 호출 관계 + API/DB 호출 추적

### Task 3.1: 함수 호출 관계 추출 로직 ✅
- [x] AST에서 CallExpression 추출
- [x] 호출 대상 함수 식별
- [x] CallEdge 인터페이스 구현
- [x] 조건부/비동기 호출 표시

### Task 3.2: API 호출 탐지 (fetch, axios) ✅
- [x] `fetch()` 호출 추출
- [x] `axios` 호출 추출
- [x] HTTP 메서드 + 경로 추출
- [x] API Route 매칭

### Task 3.3: Supabase 호출 탐지 ✅
- [x] `supabase.from().select()` 패턴 탐지
- [x] CRUD 작업 타입 분류
- [x] 테이블명 추출
- [x] `supabase.rpc()` 및 `.auth` 탐지

### Task 3.4: /api/logic-flow/graph 엔드포인트 ✅
- [x] `app/api/logic-flow/graph/route.ts` 생성
- [x] 진입점 자동 탐지 (pages, apiRoutes, eventHandlers)
- [x] 호출 그래프 생성
- [x] hotspots 계산 (호출 많은 함수)
- [x] Mermaid 다이어그램 생성

---

## Phase 4: 시각화 개선

**목표**: React Flow로 인터랙티브 다이어그램 구현

### Task 4.1: React Flow 통합 ✅
- [x] `reactflow` 패키지 설치
- [x] `ReactFlowDiagram` 컴포넌트 생성
- [x] 커스텀 노드 타입 정의 (Layer, Function, Api, Db)
- [x] 줌/팬/미니맵 설정

### Task 4.2: 레이어 뷰 개선 ✅
- [x] 레이어별 그룹화
- [x] 색상 시스템 적용 (LAYER_COLORS)
- [x] 파일/함수 노드 연결
- [x] 레이어 간 애니메이션 연결선

### Task 4.3: 흐름 뷰 구현 ✅
- [x] 함수 호출 관계 시각화
- [x] API 호출 노드 (method/path 표시)
- [x] DB 호출 노드 (table/operations 표시)
- [x] 핫스팟 강조 표시
- [x] 비동기/조건부 호출 구분 (점선/애니메이션)

---

## 의존성

```
Phase 1 (AST 분석)
    │
    ├──▶ Phase 2 (백그라운드 분석)
    │
    └──▶ Phase 3 (호출 그래프)
              │
              ▼
         Phase 4 (시각화)
```

---

## 체크리스트

### MVP 완료 기준
- [ ] 로그인 시 백그라운드 분석 시작
- [ ] 캐시 히트 시 즉시 표시 (0ms)
- [ ] 캐시 미스 시 로딩 + 실시간 분석
- [ ] 레이어 분류 정확도 > 80%
- [ ] 함수 추출 정확도 > 85%

### 테스트
- [ ] AST 분석 단위 테스트
- [ ] 캐시 API 통합 테스트
- [ ] E2E 테스트 (프로젝트 페이지)

---

## 로그

| 날짜 | 작업 | 상태 |
|------|------|------|
| 2025-01-03 | PRD v1.2 (MVP) 작성 | 완료 |
| 2025-01-03 | Task 목록 생성 | 완료 |
| 2025-01-03 | Phase 1 완료 - ts-morph 설치, ast-analyzer.ts, /api/logic-flow/ast | 완료 |
| 2025-01-03 | Phase 2 완료 - Vercel KV, analysis API, useProjectAnalysis 훅 | 완료 |
| 2025-01-03 | Phase 3 완료 - call-graph-analyzer.ts, /api/logic-flow/graph | 완료 |
| 2025-01-03 | Phase 4 완료 - ReactFlowDiagram, 커스텀 노드 (Layer/Function/Api/Db) | 완료 |
