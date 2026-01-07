# PRD: 코드 시각화 시스템 재설계

**Version**: 1.5
**Date**: 2026-01-07
**Status**: In Progress
**PRD-ID**: PRD-0007

---

## v1.5 변경사항 (LLM 기반 모듈 분석 - Gemini API)

### 배경

기존 키워드 매핑 기반 모듈 제목/설명이 비개발자에게 불충분.
Google Gemini API를 활용하여 코드 분석 기반 의미있는 제목/설명 생성.

### 기술 스택

| 항목 | 값 |
|------|------|
| **LLM Provider** | Google Gemini API |
| **Model** | gemini-2.0-flash (기본) |
| **대안 모델** | gemini-1.5-pro (고품질) |
| **API 키** | 환경변수 `GEMINI_API_KEY` |

### 구현 파일

| 파일 | 역할 |
|------|------|
| `lib/ollama-client.ts` | Gemini API 클라이언트 (이름 유지) |
| `lib/hooks/useLLMAnalysis.ts` | React Hook (프론트엔드 연동) |
| `api/logic-flow/llm-analyze/route.ts` | REST API 엔드포인트 |

### API 엔드포인트

```
POST /api/logic-flow/llm-analyze
{
  "repo": "owner/repo",
  "files": [{ "path": "src/auth.ts", "layer": "logic" }],
  "mode": "title" | "description" | "causality" | "batch"
}
```

### 환경 변수 설정

```env
# .env.local (개발)
GEMINI_API_KEY=your_gemini_api_key

# Vercel 환경 변수 (배포)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash  # 선택적
```

### 기능

| 기능 | 설명 | Issue |
|------|------|-------|
| 모듈 제목 생성 | 코드 분석 기반 한글 제목 | #61 |
| 모듈 설명 생성 | 역할, 입력, 출력, 연관 모듈 | #62 |
| 인과관계 분석 | 트리거, 효과, 데이터 흐름 | #60 |

### Fallback 전략

```
Gemini API 호출
    │
    ├─ 성공 → LLM 생성 제목/설명 표시
    │
    └─ 실패 (API 키 없음, 오류)
           │
           └─ 기본 키워드 매핑 사용
```

### 비용 예상

| 모델 | 입력 (1M tokens) | 출력 (1M tokens) |
|------|------------------|------------------|
| gemini-2.0-flash | $0.10 | $0.40 |
| gemini-1.5-pro | $1.25 | $5.00 |

예상 사용량: 프로젝트당 ~10K tokens → **월 $0.01 미만**

---

## v1.4 변경사항 (바이브 코더를 위한 인과관계 시각화)

### 사용자 선택

| 항목 | 선택 |
|------|------|
| **접근법** | 스토리 기반 시각화 (시퀀스 다이어그램) |
| **추가 기능** | 에러 영향도 분석 + 데이터 흐름 추적 |

### 구현 요약

#### 1. 스토리 기반 시퀀스 다이어그램

```
사용자 → UI → Logic → API → Data
  (1)───→(2)───→(3)───→(4)───→(5)
  클릭   이벤트  검증   요청   저장
```

#### 2. 에러 영향도 분석

"이 함수 지우면 뭐가 깨져?" → 역방향 BFS로 호출자 추적

#### 3. 데이터 흐름 추적

"이 데이터는 어디서 와?" → AST 역방향 탐색으로 출처 추적

---

### 구현 대상 파일

#### 신규 파일

| 파일 | 역할 |
|------|------|
| `lib/types/sequence.ts` | 시퀀스 데이터 타입 |
| `lib/impact-analyzer.ts` | 영향도 분석 알고리즘 |
| `lib/data-flow-analyzer.ts` | 데이터 흐름 분석 |
| `lib/sequence-analyzer.ts` | 시퀀스 생성 로직 |
| `api/logic-flow/sequence/route.ts` | 시퀀스 API |
| `api/logic-flow/impact/route.ts` | 영향도 분석 API |
| `api/logic-flow/data-trace/route.ts` | 데이터 추적 API |
| `components/visualization/sequence/SequenceDiagram.tsx` | 시퀀스 다이어그램 |
| `components/visualization/impact/ImpactAnalyzer.tsx` | 영향도 분석 UI |
| `components/visualization/data-trace/DataFlowDiagram.tsx` | 데이터 흐름 UI |
| `components/visualization/nodes/SequenceNode.tsx` | 시퀀스 노드 |

#### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `ReactFlowDiagram.tsx` | ViewMode에 'sequence', 'impact', 'data-trace' 추가 |
| `visualization/page.tsx` | 새 모드 탭 UI 추가 |

---

### 인과관계 시각화 구현 단계 (5 Phase)

#### Phase 1: 기반 인프라

1. 타입 정의 (`lib/types/`)
2. 영향도 분석 알고리즘 (`lib/impact-analyzer.ts`)
3. 데이터 흐름 분석 알고리즘 (`lib/data-flow-analyzer.ts`)

#### Phase 2: 시퀀스 다이어그램

1. 시퀀스 분석 로직
2. 시퀀스 API 엔드포인트
3. SequenceNode 컴포넌트
4. SequenceDiagram 컴포넌트

#### Phase 3: 영향도 분석 UI

1. ImpactNode 컴포넌트
2. ImpactGraph 시각화
3. ImpactSummary (비개발자용)

#### Phase 4: 데이터 흐름 UI

1. DataFlowDiagram 컴포넌트
2. DataStory 컴포넌트

#### Phase 5: 통합

1. ReactFlowDiagram 확장
2. 페이지 통합
3. E2E 테스트

---

### 핵심 알고리즘

#### 영향도 분석 (reverseTraverseBFS)

```typescript
function analyzeImpact(callGraph, targetFunctionId, maxDepth = 5) {
  // 1. 역방향 BFS로 호출자 추적
  const callers = reverseTraverseBFS(callGraph, targetFunctionId, maxDepth)

  // 2. 진입점 도달 분석 (어떤 UI 기능이 영향받나?)
  const affectedEntryPoints = findAffectedEntryPoints(callGraph, callers)

  // 3. 비개발자용 요약 생성
  return generateHumanReadableSummary(...)
}
```

#### 데이터 흐름 추적

```typescript
function traceDataFlow(sourceFile, identifier, line) {
  // 1. AST에서 대상 변수 찾기
  // 2. 역방향 탐색으로 출처 추적
  // 3. 순방향 탐색으로 사용처 추적
  // 4. 스토리 형식으로 변환
}
```

---

### 예상 결과물

#### "이 함수 지우면 뭐가 깨져?"

```
🔴 높은 영향도
handleLogin() 삭제 시:
✗ 로그인 버튼 동작 안함
✗ 소셜 로그인 중단
✗ 세션 관리 불가
영향받는 기능: 3개, 파일: 5개
```

#### "이 데이터는 어디서 와?"

```
📊 userEmail 데이터 추적
1️⃣ 시작: 로그인 폼 입력
2️⃣ 검증: validateEmail()
3️⃣ 전송: POST /api/auth/login
4️⃣ 저장: Supabase 세션
5️⃣ 사용: 프로필 페이지 표시
```

---

### 검토된 아이디어 (참고용)

<details>
<summary>아이디어 1: 스토리 기반 시각화 (Story-Based) ✅ 채택</summary>

컨셉: 사용자 행동 → 시스템 반응을 "이야기"처럼 표현

```
┌─────────────────────────────────────────────────────────┐
│ 📖 시나리오: "사용자가 로그인 버튼을 클릭하면..."        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👤 사용자          🖥️ 화면           ⚙️ 처리           │
│     │                 │                 │               │
│     │ 1. 클릭        │                 │               │
│     │───────────────>│                 │               │
│     │                 │ 2. 검증 요청   │               │
│     │                 │───────────────>│               │
│     │                 │                 │ 3. API 호출  │
│     │                 │                 │─────────────>│
│     │                 │ 4. 결과 표시   │               │
│     │<────────────────│<───────────────│               │
│                                                         │
│  결과: ✅ 대시보드로 이동 | ❌ 에러 메시지 표시         │
└─────────────────────────────────────────────────────────┘
```

장점: 시간 순서대로 이해 가능
구현: 시퀀스 다이어그램 + LLM 시나리오 생성
</details>

<details>
<summary>아이디어 2: 인터랙티브 탐색 (Interactive Exploration)</summary>

컨셉: 한 함수를 클릭하면 관련 함수만 하이라이트

```
[기본 상태]
┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐
│ A │  │ B │  │ C │  │ D │  │ E │  (모두 회색)
└───┘  └───┘  └───┘  └───┘  └───┘

[B 클릭 시]
┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐
│ A │━━│ B │━━│ C │  │ D │  │ E │
└───┘  └───┘  └───┘  └───┘  └───┘
 호출자   선택   피호출자   (관계없음)
 (빨강)  (파랑)  (초록)    (회색)
```

기능:
- 클릭: 직접 연결된 함수만 표시
- 더블클릭: 전체 호출 체인 펼치기
- 우클릭: "이 함수 없으면 뭐가 안돼요?" 질문
</details>

<details>
<summary>아이디어 3: 질문 기반 인터페이스 (Q&A Interface)</summary>

컨셉: 바이브 코더가 자연어로 질문

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 무엇이 궁금하세요?                                   │
├─────────────────────────────────────────────────────────┤
│ "로그인 버튼 누르면 뭐가 실행돼?"                        │
│                                                         │
│ 📍 실행 순서:                                           │
│    1. handleLoginClick() - 버튼 클릭 처리               │
│    2. validateInput() - 이메일/비밀번호 검증            │
│    3. signInWithGitHub() - GitHub OAuth 호출            │
│    4. updateSession() - 세션 저장                       │
│                                                         │
│ ⚠️ 주의: 3번이 실패하면 에러 메시지 표시                │
│                                                         │
│ [다이어그램 보기] [코드 보기] [수정하기]                │
└─────────────────────────────────────────────────────────┘
```

예시 질문:
- "이 함수 지우면 뭐가 깨져?"
- "로그인 안되면 어디 확인해야 해?"
- "이 데이터는 어디서 와?"
</details>

<details>
<summary>아이디어 4: 레벨별 줌 (Level-Based Zoom)</summary>

컨셉: 줌 레벨에 따라 상세도 조절

```
[Level 1 - 전체 흐름] (줌 아웃)
┌────────┐     ┌────────┐     ┌────────┐
│  로그인  │────▶│  인증   │────▶│ 대시보드 │
└────────┘     └────────┘     └────────┘

[Level 2 - 모듈 단위] (중간)
┌────────────────┐  ┌────────────────┐
│ 🔐 로그인 모듈   │  │ 📊 대시보드 모듈 │
│ ├─ LoginForm   │─▶│ ├─ Dashboard   │
│ ├─ LoginBtn    │  │ ├─ ProjectList │
│ └─ ErrorMsg    │  │ └─ RepoCard    │
└────────────────┘  └────────────────┘

[Level 3 - 함수 단위] (줌 인)
handleClick ─▶ validate ─▶ fetchAPI ─▶ updateState
     │             │            │           │
     └─ 이벤트    └─ 검증     └─ 통신    └─ 상태변경
```
</details>

---

### 권장 하이브리드 UI (향후 확장)

```
┌─────────────────────────────────────────────────────────┐
│                    인과관계 뷰어                         │
├─────────────────────────────────────────────────────────┤
│  [📖 스토리] [🔍 탐색] [❓ Q&A] [🔎 줌 레벨: ████░░]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   (선택한 모드에 따른 시각화)                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  💬 "로그인 버튼 누르면?" [검색]                         │
│                                                         │
│  최근 질문: 로그인 | 에러처리 | 데이터저장               │
└─────────────────────────────────────────────────────────┘
```

### 구현 우선순위

| 순위 | 기능 | 난이도 | 효과 |
|:----:|------|:------:|:----:|
| 1 | 인터랙티브 하이라이트 | 중 | 높음 |
| 2 | Q&A 인터페이스 | 높음 | 매우높음 |
| 3 | 스토리 기반 뷰 | 중 | 높음 |
| 4 | 줌 레벨 | 낮음 | 중간 |

---

## v1.3 변경사항 (비개발자 친화적 개선)

### 구현 완료 항목

| 항목 | 커밋 | 설명 |
|------|------|------|
| **ReactFlowDiagram 통합** | c76cf37 | InteractiveFlowDiagram → ReactFlowDiagram 교체 |
| **비개발자 친화적 라벨** | 8522868 | 2단 라벨 + Hover 툴팁 시스템 |
| **함수명 변환 유틸리티** | 8522868 | 50+ 키워드 매핑 (LoginPage → 🔐 로그인) |

### 새로운 기능: 비개발자 친화적 노드 표시

```
┌─────────────────────┐
│  🔐 로그인          │  ← 기능명 (한글, 아이콘)
│     LoginPage       │  ← 기술명 (회색, 작게)
└─────────────────────┘
         │ hover
┌────────▼────────────┐
│ "사용자에게 보여지는 │  ← 상세 설명 툴팁
│  로그인 화면        │
│  컴포넌트입니다"    │
└─────────────────────┘
```

### 키워드 매핑 예시

| 기술명 | 표시 | 아이콘 |
|--------|------|--------|
| LoginPage | 로그인 | 🔐 |
| Dashboard | 대시보드 | 📊 |
| authService | 인증 | ✅ |
| userRoute | 회원 서버처리 | 👤 |
| utils | 도구 | 🔧 |

### 등록된 이슈

| # | 제목 | 우선순위 |
|---|------|----------|
| [#40](https://github.com/garimto81/project_master/issues/40) | 코드 분석 진행 표시 (Progress Bar) | P1 |
| [#41](https://github.com/garimto81/project_master/issues/41) | 다이어그램 직관화 추가 개선 필요 | P2 |

### 남은 과제 (Phase 5)

1. **분석 진행률 표시** (#40) - 구현 중
   - Progress Bar UI
   - 단계별 상태 (파일 스캔 → AST 분석 → 시각화)
   - 타임아웃 시 부분 결과 표시

2. **다이어그램 직관화 추가 개선** (#41)
   - 현재 2단 라벨만으로는 비개발자에게 의미 부족
   - 검토 방향:
     - 사용자 여정 중심 표시
     - AI 자동 설명 생성
     - 인터랙티브 가이드
     - 데이터 흐름 시뮬레이션

---

## Phase 5 상세: Progress Bar 구현 (#40)

### 5.1 분석 단계 정의

| 단계 | 설명 | 예상 비중 |
|------|------|----------|
| `fetching` | GitHub에서 파일 목록 가져오기 | 10% |
| `scanning` | 분석할 파일 필터링 | 10% |
| `analyzing` | AST 분석 및 레이어 분류 | 60% |
| `building` | 다이어그램 데이터 생성 | 15% |
| `complete` | 완료 | 5% |

### 5.2 UI 디자인

```
┌─────────────────────────────────────────────────────────────┐
│  코드 구조 시각화                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📊 코드 분석 중... (45%)                                   │
│  현재: 파일 구조 분석                                       │
│                                                             │
│  💡 프로젝트가 크면 시간이 더 걸릴 수 있습니다              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 API 응답 형식

```typescript
// /api/logic-flow/analyze 응답에 progress 추가
interface AnalyzeResponse {
  // 기존 필드
  repo: string
  data_flow: DataFlow

  // 진행률 (SSE 스트리밍 또는 폴링)
  progress?: {
    stage: 'fetching' | 'scanning' | 'analyzing' | 'building' | 'complete'
    percent: number        // 0-100
    message: string        // "파일 구조 분석 중..."
    filesProcessed?: number
    totalFiles?: number
  }
}
```

### 5.4 타임아웃 처리

| 시간 | 동작 |
|------|------|
| 0-10초 | 정상 진행 |
| 10-30초 | "대규모 프로젝트입니다" 안내 |
| 30초+ | 부분 결과 표시 + "계속 분석 중" 표시 |
| 60초+ | 분석 중단 + 캐시된 부분 결과 표시 |

---

## v1.2 변경사항 (MVP 간소화)

| 항목 | v1.1 | v1.2 (MVP) |
|------|------|------------|
| **데이터 저장** | Supabase DB + 캐시 | **Vercel KV 캐시만** |
| **체크포인트** | DB 저장 + 이어서 분석 | **캐시 미스 시 재분석** |
| **TTL** | 영구 + 캐시 5분 | **24시간** |
| **복잡도** | 높음 | **낮음 (MVP)** |

### MVP 전략

```
Phase 1 (MVP): 캐시만 사용 → 빠른 구현
Phase 2 (선택): DB 추가 → 영구 보관, 체크포인트
```

---

## v1.1 변경사항

| 항목 | v1.0 | v1.1 |
|------|------|------|
| **분석 시점** | 프로젝트 클릭 시 실시간 | **로그인 시 백그라운드 사전 분석** |
| **UX** | 클릭 → 로딩 → 표시 | **클릭 → 즉시 표시** |

---

## Executive Summary

현재 DevFlow의 코드 시각화 시스템은 **import 문 파싱**과 **파일명 휴리스틱**에 의존하여 실제 코드 로직을 분석하지 못한다. 이 PRD는 **AST 기반 정적 분석**을 통해 실제 함수 호출 관계와 실행 흐름을 시각화하는 시스템을 설계한다.

### 한 줄 정의

> **"로그인 → 백그라운드 분석 → 캐시 → 클릭 시 즉시 표시"**

---

## 1. 문제 정의

### 1.1 현재 상태 (As-Is)

| 항목 | 현재 방식 | 문제점 |
|------|-----------|--------|
| **레이어 분류** | 파일명 휴리스틱 (`components/*` → UI) | 오분류 빈번 |
| **의존성 분석** | import 문 정규식 파싱 | 동적 import 미지원 |
| **함수 분석** | 없음 | 호출 관계 파악 불가 |
| **실행 흐름** | 없음 | 데이터 흐름 추적 불가 |
| **노드 제한** | 레이어당 8개 | 실용성 부족 |

### 1.2 핵심 문제

```
현재: 파일 구조만 표시
src/
├── components/   → "UI 레이어입니다"
├── lib/          → "Logic 레이어입니다"
└── api/          → "Server 레이어입니다"

필요: 실제 코드 흐름 표시
LoginButton.onClick()
  → useAuth().login()
  → fetch('/api/auth/login')
  → supabase.auth.signInWithPassword()
  → session 저장
```

### 1.3 사용자 페인 포인트

| 사용자 | 문제 | 영향 |
|--------|------|------|
| **비개발자** | 다이어그램이 코드 이해에 도움 안 됨 | "이게 뭔지 모르겠어요" |
| **개발자** | 정확도가 낮아 신뢰 불가 | "그냥 코드 직접 볼게요" |
| **AI** | 코드 컨텍스트 파악 어려움 | 잘못된 수정 제안 |

---

## 2. 목표

### 2.1 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 레이어 분류 정확도 | ~30% | **>90%** |
| 함수 호출 관계 추출 | 0% | **>85%** |
| 실행 흐름 추적 | 0% | **>80%** |
| 분석 시간 (100파일) | - | **<10초** |

### 2.2 범위

**In Scope:**
- TypeScript/JavaScript 프로젝트 분석
- Next.js App Router 특화 분석
- Supabase 연동 코드 탐지
- React 컴포넌트 흐름 추적

**Out of Scope:**
- Python/기타 언어 (Phase 2)
- 런타임 동적 분석
- 테스트 코드 분석

---

## 3. 솔루션 설계

### 3.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    프로젝트 클릭                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 코드 획득                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ GitHub API → 파일 목록 → 선택적 파일 내용 fetch         ││
│  │ (캐시: Redis/KV 5분)                                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: AST 분석 (ts-morph)                               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ 함수 추출     │ │ 클래스 추출   │ │ 타입 추출         │  │
│  │ - 이름        │ │ - 메서드      │ │ - interface       │  │
│  │ - 파라미터    │ │ - 프로퍼티    │ │ - type alias      │  │
│  │ - 반환 타입   │ │ - 상속 관계   │ │ - generic         │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 호출 그래프 생성                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 함수 A                                                  ││
│  │   └─ calls → 함수 B                                     ││
│  │              └─ calls → fetch('/api/x')                 ││
│  │                         └─ matches → API Route X        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: 흐름 추출                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 진입점 탐지:                                            ││
│  │   - React 이벤트 핸들러 (onClick, onSubmit)             ││
│  │   - useEffect                                           ││
│  │   - API Route handlers (GET, POST)                      ││
│  │   - 페이지 컴포넌트                                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: 시각화                                            │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │ 레이어 뷰     │ │ 흐름 뷰       │ │ 코드 연동 뷰      │  │
│  │ (구조 파악)   │ │ (동작 이해)   │ │ (상세 확인)       │  │
│  └───────────────┘ └───────────────┘ └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 레이어 분류 로직 (개선)

**현재: 파일명 기반**
```typescript
// 현재 (부정확)
if (path.includes('components')) return 'ui'
if (path.includes('api')) return 'server'
```

**개선: Export 패턴 분석**
```typescript
// 개선 (정확)
function classifyByExport(sourceFile: SourceFile): LayerType {
  const exports = sourceFile.getExportedDeclarations()

  for (const [name, declarations] of exports) {
    for (const decl of declarations) {
      // React 컴포넌트 판별
      if (isReactComponent(decl)) return 'ui'

      // Custom Hook 판별
      if (isCustomHook(decl)) return 'logic'

      // API Route Handler 판별
      if (isApiRouteHandler(decl)) return 'api'

      // Supabase/DB 호출 포함
      if (containsDatabaseCall(decl)) return 'data'
    }
  }

  return 'lib' // 기본값
}

function isReactComponent(decl: Declaration): boolean {
  // JSX 반환 여부
  // React.FC / React.Component 타입
  // forwardRef, memo 사용
}

function isCustomHook(decl: Declaration): boolean {
  // use* prefix + React hooks 사용
}
```

### 3.3 함수 호출 그래프

```typescript
interface FunctionNode {
  id: string                    // 고유 ID
  name: string                  // 함수명
  file: string                  // 파일 경로
  line: number                  // 라인 번호
  type: 'function' | 'method' | 'arrow' | 'component' | 'hook'

  // 호출 관계
  calls: CallEdge[]             // 이 함수가 호출하는 함수들
  calledBy: CallEdge[]          // 이 함수를 호출하는 함수들

  // 외부 호출
  apiCalls: ApiCall[]           // fetch, axios 호출
  dbCalls: DbCall[]             // Supabase, Prisma 호출
}

interface CallEdge {
  targetId: string              // 호출 대상 함수 ID
  line: number                  // 호출 위치
  isConditional: boolean        // 조건부 호출 여부
  isAsync: boolean              // 비동기 호출 여부
}

interface ApiCall {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string                  // '/api/auth/login'
  matchedRoute?: string         // 매칭된 API Route 파일
}

interface DbCall {
  type: 'select' | 'insert' | 'update' | 'delete' | 'rpc'
  table: string                 // 테이블명
  line: number
}
```

### 3.4 실행 흐름 추출

```typescript
interface ExecutionFlow {
  id: string
  name: string                  // "로그인 흐름", "이슈 생성 흐름"
  trigger: FlowTrigger          // 시작점
  steps: FlowStep[]             // 실행 단계
}

interface FlowTrigger {
  type: 'click' | 'submit' | 'load' | 'api' | 'effect'
  element?: string              // 'LoginButton', 'IssueForm'
  handler: string               // 함수명
  file: string
  line: number
}

interface FlowStep {
  order: number
  function: string
  file: string
  line: number
  description: string           // AI 생성 설명
  type: 'sync' | 'async' | 'await'
  children?: FlowStep[]         // 중첩 호출
}
```

**예시 출력:**
```
로그인 흐름
├─ [1] LoginButton.handleClick (components/LoginButton.tsx:42)
│     "로그인 버튼 클릭 이벤트 핸들러"
├─ [2] useAuth().login (hooks/useAuth.ts:28)
│     "인증 상태 관리 훅의 로그인 함수"
├─ [3] fetch('/api/auth/login') (hooks/useAuth.ts:35)
│     "로그인 API 호출"
├─ [4] POST /api/auth/login (app/api/auth/login/route.ts:12)
│     "로그인 API 라우트 핸들러"
├─ [5] supabase.auth.signInWithPassword (app/api/auth/login/route.ts:18)
│     "Supabase 인증 서비스 호출"
└─ [6] setSession (hooks/useAuth.ts:40)
      "세션 상태 업데이트"
```

---

## 4. 백그라운드 분석 시스템 (MVP - 캐시만)

### 4.1 시스템 개요

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           사용자 로그인                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 1: 레포지토리 목록 조회                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ GitHub API → 사용자의 레포 목록 (최근 활동 기준 상위 10개)          ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 2: 순차 분석 (백그라운드)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ for each repo:                                                      ││
│  │   1. 캐시 확인 (Vercel KV)                                          ││
│  │   2. 캐시 미스 → 분석 실행 → 캐시 저장 (TTL 24시간)                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 3: 프로젝트 클릭 시                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 캐시 히트 → 즉시 표시                                               ││
│  │ 캐시 미스 → 실시간 분석 (로딩 표시)                                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 캐시 구조 (Vercel KV)

```typescript
// 캐시 키 형식
const cacheKey = `analysis:${userId}:${repoFullName}`

// 캐시 데이터
interface CachedAnalysis {
  data: ProjectAnalysis       // 분석 결과
  commitSha: string           // 분석 시점 커밋
  analyzedAt: string          // 분석 시간
}

// 캐시 설정
const CACHE_CONFIG = {
  TTL: 60 * 60 * 24,          // 24시간
  MAX_REPOS: 10,              // 로그인 시 최대 분석 레포 수
}
```

### 4.3 분석 상태 (메모리 기반)

```typescript
// 분석 상태 (서버 메모리 - 휘발성)
type AnalysisStatus = 'idle' | 'analyzing' | 'completed' | 'failed'

interface AnalysisState {
  repoFullName: string
  status: AnalysisStatus
  progress: number            // 0-100
  error?: string
}

// 전역 상태 (서버 인스턴스별)
const analysisQueue = new Map<string, AnalysisState>()
```

### 4.4 API 엔드포인트 (간소화)

```
/api/analysis/
├── trigger/route.ts       # 로그인 시 백그라운드 분석 시작
├── status/route.ts        # 분석 상태 조회 (폴링용)
└── cached/route.ts        # 캐시된 결과 조회
```

#### POST /api/analysis/trigger

```typescript
// Request
{
  repos?: string[]          // 분석할 레포 (없으면 상위 10개)
}

// Response
{
  triggered: string[]       // 분석 시작된 레포
  cached: string[]          // 이미 캐시된 레포
}

// 구현
export async function POST(request: Request) {
  const { repos } = await request.json()
  const session = await getSession()

  // 1. 레포 목록 가져오기 (없으면 최근 활동 상위 10개)
  const targetRepos = repos || await getRecentRepos(session, 10)

  const triggered: string[] = []
  const cached: string[] = []

  for (const repo of targetRepos) {
    const cacheKey = `analysis:${session.user.id}:${repo}`
    const existing = await kv.get(cacheKey)

    if (existing) {
      cached.push(repo)
    } else {
      // 백그라운드 분석 시작 (fire-and-forget)
      analyzeInBackground(session, repo)
      triggered.push(repo)
    }
  }

  return NextResponse.json({ triggered, cached })
}
```

#### GET /api/analysis/status

```typescript
// Request: GET /api/analysis/status?repo=owner/repo

// Response
{
  status: 'idle' | 'analyzing' | 'completed' | 'failed'
  progress?: number         // 분석 중일 때만
  cached: boolean           // 캐시 존재 여부
  error?: string
}
```

#### GET /api/analysis/cached

```typescript
// Request: GET /api/analysis/cached?repo=owner/repo

// Response (캐시 히트)
{
  data: ProjectAnalysis
  commitSha: string
  analyzedAt: string
}

// Response (캐시 미스)
{
  error: 'not_cached'
}
```

### 4.5 클라이언트 훅 (간소화)

```typescript
// hooks/useProjectAnalysis.ts
import useSWR from 'swr'

export function useProjectAnalysis(repoFullName: string) {
  // 1. 캐시 확인
  const { data: cached, error: cacheError } = useSWR(
    `/api/analysis/cached?repo=${encodeURIComponent(repoFullName)}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  // 2. 분석 상태 폴링 (캐시 없을 때만)
  const { data: status } = useSWR(
    !cached && !cacheError
      ? `/api/analysis/status?repo=${encodeURIComponent(repoFullName)}`
      : null,
    fetcher,
    { refreshInterval: 2000 }  // 2초마다 폴링
  )

  // 3. 캐시 없으면 분석 트리거
  useEffect(() => {
    if (cacheError?.message === 'not_cached') {
      fetch('/api/analysis/trigger', {
        method: 'POST',
        body: JSON.stringify({ repos: [repoFullName] })
      })
    }
  }, [cacheError, repoFullName])

  return {
    analysis: cached?.data,
    isLoading: !cached && status?.status === 'analyzing',
    isReady: !!cached,
    progress: status?.progress,
    error: status?.error,
  }
}
```

### 4.6 프로젝트 페이지 UX (간소화)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  프로젝트 클릭                                                          │
└─────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ 캐시 확인    │
    └──────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────┐
│ 캐시 有 │  │ 캐시 無     │
└─────────┘  └─────────────┘
     │              │
     ▼              ▼
┌─────────┐  ┌─────────────────────────────────────┐
│ 즉시    │  │ 실시간 분석 시작                    │
│ 표시    │  │                                     │
│ (0ms)   │  │  ┌────────────────────────────────┐ │
└─────────┘  │  │ ████████░░░░░░░░░░░░ 45%       │ │
             │  │ "코드 분석 중..."              │ │
             │  └────────────────────────────────┘ │
             └─────────────────────────────────────┘
                    │
                    ▼ (완료 시)
             ┌─────────────────────────────────────┐
             │ 다이어그램 표시 + 캐시 저장         │
             └─────────────────────────────────────┘
```

### 4.7 캐시 무효화 (MVP)

| 이벤트 | 동작 |
|--------|------|
| **24시간 경과** | 자동 만료 (TTL) |
| **수동 새로고침** | 캐시 삭제 + 재분석 |
| **새 커밋** | Phase 2에서 구현 |

```typescript
// 수동 새로고침
async function refreshAnalysis(repoFullName: string) {
  const cacheKey = `analysis:${userId}:${repoFullName}`

  // 1. 캐시 삭제
  await kv.del(cacheKey)

  // 2. 재분석 트리거
  await fetch('/api/analysis/trigger', {
    method: 'POST',
    body: JSON.stringify({ repos: [repoFullName] })
  })
}
```

### 4.8 MVP 제약사항

| 항목 | MVP (v1.2) | Phase 2 |
|------|------------|---------|
| 저장소 | Vercel KV (캐시) | + Supabase DB |
| TTL | 24시간 고정 | 커밋 기반 무효화 |
| 체크포인트 | 없음 (실패 시 재시작) | 이어서 분석 |
| 동시 분석 | 순차 처리 | 병렬 워커 |
| 웹훅 | 미지원 | GitHub 웹훅 |

### 4.9 Phase 2 마이그레이션 경로

```
MVP (캐시만)
    │
    ▼ 필요시 추가
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: DB 추가                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 1. Supabase 테이블 생성 (analysis_jobs, project_analyses)           ││
│  │ 2. 캐시 미스 시 DB 조회 fallback 추가                               ││
│  │ 3. 분석 완료 시 DB에도 저장                                         ││
│  │ 4. 체크포인트 로직 추가                                             ││
│  │ 5. GitHub 웹훅 연동                                                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. API 설계 (logic-flow)

### 5.1 새로운 엔드포인트

```
/api/logic-flow/
├── analyze/route.ts        # 기존 (유지, 하위 호환)
├── ast/route.ts            # NEW: AST 기반 심층 분석
├── graph/route.ts          # NEW: 호출 그래프 생성
├── flow/route.ts           # NEW: 실행 흐름 추출
└── cache/route.ts          # NEW: 분석 결과 캐싱
```

### 5.2 AST 분석 API

**POST /api/logic-flow/ast**

```typescript
// Request
{
  repo: string                  // "owner/repo"
  branch?: string               // "main" (기본값)
  paths?: string[]              // 분석할 경로 (기본: 전체)
  depth: 'shallow' | 'medium' | 'deep'
}

// Response
{
  files: {
    path: string
    layer: LayerType
    functions: FunctionNode[]
    classes: ClassNode[]
    exports: ExportInfo[]
    imports: ImportInfo[]
  }[]

  stats: {
    totalFiles: number
    totalFunctions: number
    totalClasses: number
    analysisTime: number        // ms
  }
}
```

### 5.3 호출 그래프 API

**POST /api/logic-flow/graph**

```typescript
// Request
{
  repo: string
  entryPoints?: string[]        // 분석 시작점 (기본: 자동 탐지)
  maxDepth?: number             // 최대 호출 깊이 (기본: 10)
}

// Response
{
  nodes: FunctionNode[]
  edges: CallEdge[]

  entryPoints: {
    pages: string[]             // 페이지 컴포넌트
    apiRoutes: string[]         // API 라우트
    eventHandlers: string[]     // 이벤트 핸들러
  }

  hotspots: {                   // 호출이 많은 함수
    functionId: string
    callCount: number
  }[]
}
```

### 5.4 실행 흐름 API

**POST /api/logic-flow/flow**

```typescript
// Request
{
  repo: string
  trigger: {
    type: 'click' | 'submit' | 'load' | 'api'
    target: string              // 함수명 또는 파일:라인
  }
}

// Response
{
  flow: ExecutionFlow

  visualization: {
    mermaid: string             // Mermaid 시퀀스 다이어그램
    reactFlow: ReactFlowData    // React Flow 데이터
  }

  warnings: {
    type: 'async-without-await' | 'uncaught-error' | 'circular-call'
    location: string
    message: string
  }[]
}
```

---

## 6. 시각화 설계

### 6.1 3가지 뷰 모드

| 뷰 | 용도 | 대상 사용자 |
|----|------|-------------|
| **레이어 뷰** | 전체 구조 파악 | 비개발자 |
| **흐름 뷰** | 특정 기능 동작 이해 | 비개발자 + 개발자 |
| **코드 뷰** | 상세 코드 확인 | 개발자 |

### 6.2 레이어 뷰 (개선)

```
┌─────────────────────────────────────────────────────────────┐
│                        레이어 뷰                            │
├─────────────────────────────────────────────────────────────┤
│  [사용자 액션]                                              │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  UI Layer                                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │   │
│  │  │LoginPage │ │Dashboard │ │ProjectPg │  +12 more   │   │
│  │  └──────────┘ └──────────┘ └──────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Logic Layer                                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │   │
│  │  │ useAuth  │ │useIssues │ │ useRepo  │  +5 more    │   │
│  │  └──────────┘ └──────────┘ └──────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Layer                                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │   │
│  │  │/api/auth │ │/api/issue│ │/api/repo │  +8 more    │   │
│  │  └──────────┘ └──────────┘ └──────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Data Layer (Supabase)                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │   │
│  │  │  users   │ │ projects │ │  issues  │             │   │
│  │  └──────────┘ └──────────┘ └──────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 흐름 뷰 (NEW)

```
┌─────────────────────────────────────────────────────────────┐
│  흐름 뷰: "로그인 흐름"                          [코드 보기]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │ LoginButton  │ ◀── 클릭                                 │
│  │  onClick()   │                                          │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │   useAuth    │                                          │
│  │   login()    │                                          │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐     ┌──────────────┐                     │
│  │    fetch     │────▶│ /api/auth/   │                     │
│  │   (POST)     │     │   login      │                     │
│  └──────────────┘     └──────┬───────┘                     │
│                              │                              │
│                              ▼                              │
│                       ┌──────────────┐                     │
│                       │   Supabase   │                     │
│                       │ signIn()     │                     │
│                       └──────┬───────┘                     │
│                              │                              │
│                              ▼                              │
│                       ┌──────────────┐                     │
│                       │   Session    │                     │
│                       │   저장됨     │                     │
│                       └──────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 코드 연동 뷰 (NEW)

```
┌────────────────────────────┬────────────────────────────────┐
│        다이어그램          │          코드 뷰어            │
├────────────────────────────┼────────────────────────────────┤
│                            │                                │
│   ┌────────┐               │  // hooks/useAuth.ts           │
│   │useAuth │ ◀── 선택됨    │                                │
│   └────────┘               │  export function useAuth() {   │
│       │                    │    const [session, setSession] │
│       ▼                    │      = useState(null)          │
│   ┌────────┐               │                                │
│   │ login  │               │    async function login() { ◀──│
│   └────────┘               │      const res = await fetch(  │
│       │                    │        '/api/auth/login',      │
│       ▼                    │        { method: 'POST' }      │
│   ┌────────┐               │      )                         │
│   │ fetch  │               │      setSession(data.session)  │
│   └────────┘               │    }                           │
│                            │                                │
│                            │    return { session, login }   │
│                            │  }                             │
│                            │                                │
└────────────────────────────┴────────────────────────────────┘
```

---

## 7. 기술 스택

### 7.1 분석 엔진

| 라이브러리 | 용도 | 선택 이유 |
|-----------|------|-----------|
| **ts-morph** | AST 분석 | TypeScript Compiler API wrapper, 타입 안정성 |
| **@swc/core** | 빠른 파싱 | 대용량 프로젝트 성능 |
| **skott** | 의존성 그래프 | 기존 코드 활용 (순환 탐지) |

### 7.2 시각화

| 라이브러리 | 용도 | 선택 이유 |
|-----------|------|-----------|
| **React Flow** | 인터랙티브 다이어그램 | 줌/팬, 노드 드래그, 커스터마이징 |
| **Monaco Editor** | 코드 뷰어 | VS Code 동일 엔진, 문법 강조 |
| **Mermaid** | 정적 다이어그램 | 기존 코드 호환, 내보내기용 |

### 7.3 캐싱

| 기술 | 용도 | TTL |
|------|------|-----|
| **Vercel KV** | 분석 결과 캐시 | 5분 |
| **SWR** | 클라이언트 캐시 | 1분 |

---

## 8. 구현 계획

### Phase 1: AST 분석 기반 구축 (Week 1-2)

- [ ] ts-morph 통합 및 기본 파싱
- [ ] 함수/클래스/타입 추출
- [ ] Export 패턴 기반 레이어 분류
- [ ] `/api/logic-flow/ast` 엔드포인트

### Phase 2: 호출 그래프 (Week 3-4)

- [ ] 함수 호출 관계 추출
- [ ] API 호출 탐지 (fetch, axios)
- [ ] Supabase 호출 탐지
- [ ] `/api/logic-flow/graph` 엔드포인트

### Phase 3: 실행 흐름 (Week 5-6)

- [ ] 진입점 자동 탐지
- [ ] 흐름 추적 알고리즘
- [ ] AI 설명 생성 (선택)
- [ ] `/api/logic-flow/flow` 엔드포인트

### Phase 4: 시각화 (Week 7-8) ✅ 부분 완료

- [x] React Flow 통합 (c76cf37)
- [x] 레이어 뷰 모드 구현
- [x] 비개발자 친화적 라벨 시스템 (8522868)
- [x] 기존 컴포넌트 교체 (InteractiveFlowDiagram → ReactFlowDiagram)
- [ ] 흐름 뷰 모드 구현
- [ ] Monaco Editor 코드 연동 (우선순위 낮음)

### Phase 5: UX 개선 (진행 중)

- [ ] 분석 진행률 Progress Bar (#40)
- [ ] 다이어그램 직관화 추가 개선 (#41)
- [ ] 타임아웃 시 부분 결과 표시
- [ ] 사용자 여정 중심 표시 (검토 중)

---

## 9. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| GitHub API 율 제한 | 분석 실패 | 캐싱 + 선택적 파일 fetch |
| 대규모 프로젝트 성능 | 타임아웃 | 점진적 분석 + 웹워커 |
| 동적 import 미지원 | 불완전한 그래프 | 경고 표시 + Phase 2 대응 |
| ts-morph 메모리 | 서버리스 제한 | SWC 폴백 |

---

## 10. 성공 기준

### 10.1 기능 완성도 (MVP)

- [ ] 로그인 후 상위 10개 레포 백그라운드 분석 시작
- [ ] 캐시 히트 시 즉시 표시 (0ms 로딩)
- [ ] 캐시 미스 시 실시간 분석 + 로딩 표시
- [ ] 함수 호출 관계 85% 이상 정확도
- [ ] Next.js App Router 100% 지원
- [ ] Supabase 호출 자동 탐지

### 10.2 사용자 경험 (MVP)

- [ ] 비개발자가 흐름 뷰만으로 기능 이해 가능
- [ ] 노드 클릭 → 코드 위치 즉시 표시
- [ ] 분석 진행률 실시간 표시
- [ ] 수동 새로고침 버튼 제공
- [ ] 모바일 반응형 지원

### 10.3 Phase 2 추가 기준

- [ ] 분석 중단 후 이어서 분석 가능
- [ ] GitHub 웹훅으로 커밋 시 자동 재분석
- [ ] 분석 결과 영구 보관 (DB)

---

## 11. 참고 자료

- [ts-morph 문서](https://ts-morph.com/)
- [React Flow 문서](https://reactflow.dev/)
- [skott GitHub](https://github.com/antoine-music/skott)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)

---

## Appendix A: 데이터 스키마

```typescript
// 전체 분석 결과
interface ProjectAnalysis {
  repo: string
  branch: string
  analyzedAt: string

  // Phase 1: AST 분석
  files: FileAnalysis[]
  layers: LayerSummary[]

  // Phase 2: 호출 그래프
  functions: FunctionNode[]
  callGraph: CallEdge[]

  // Phase 3: 실행 흐름
  flows: ExecutionFlow[]
  entryPoints: EntryPoint[]

  // 메타데이터
  stats: AnalysisStats
  warnings: AnalysisWarning[]
}

type LayerType = 'ui' | 'logic' | 'api' | 'data' | 'lib' | 'unknown'
```

---

## Appendix B: Mermaid 시퀀스 다이어그램 예시

```mermaid
sequenceDiagram
    participant User as 사용자
    participant Button as LoginButton
    participant Hook as useAuth
    participant API as /api/auth/login
    participant DB as Supabase

    User->>Button: 클릭
    Button->>Hook: login()
    Hook->>API: POST /api/auth/login
    API->>DB: signInWithPassword()
    DB-->>API: session
    API-->>Hook: { session }
    Hook-->>Button: 성공
    Button-->>User: 대시보드 이동
```
