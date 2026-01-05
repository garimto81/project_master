# PRD: DevFlow - 비개발자 AI 협업 개발 플랫폼

**Version**: 6.4
**Date**: 2025-12-31
**Status**: Draft

---

## 🆕 v6.4 변경사항

| 항목 | v6.3 | v6.4 |
|------|------|------|
| **인증 상태** | 매번 API 호출 | **SWR 캐시 (1분 deduping)** |
| **레포지토리 목록** | 매번 API 호출 | **SWR 캐시 (5분 deduping)** |
| **로딩 UX** | 항상 로딩 스피너 | **캐시 히트 시 즉시 표시** |
| **OAuth 콜백** | 클라이언트 처리 | **Route Handler (PKCE 지원)** |

### v6.3 → v6.4 핵심 변경

```
v6.3 (매번 API 호출)              v6.4 (SWR 캐시)
─────────────────────             ─────────────────────────
페이지 이동 시                     페이지 이동 시
  → getSession() 호출               → 캐시 확인 (즉시 반환)
  → getRepositories() 호출          → 백그라운드 revalidation
  → 로딩 스피너 표시                → 로딩 없이 즉시 표시
```

**추가된 기능:**
- `useAuth` hook: 세션 캐시 + 자동 revalidation
- `useRepositories` hook: 레포지토리 캐시 + stale-while-revalidate
- `/auth/callback/route.ts`: PKCE 기반 OAuth 콜백 처리
- `onAuthStateChange` 연동: 로그인/로그아웃 시 캐시 자동 갱신

**기술 스택 추가:**
- `swr` - React Hooks for Data Fetching (stale-while-revalidate)

**캐시 설정:**
| 데이터 | deduping | revalidateOnFocus | keepPreviousData |
|--------|----------|-------------------|------------------|
| 세션 | 60초 | false | - |
| 레포지토리 | 300초 | false | true |

---

## 🆕 v6.3 변경사항

| 항목 | v6.2 | v6.3 |
|------|------|------|
| **의존성 분석** | 휴리스틱 (파일 경로 기반 추론) | **skott 기반 실제 AST 분석** |
| **레이어 연결** | 가정 기반 ("있으면 연결됐겠지") | **실제 import/export 추적** |
| **정확도** | ~30% (추측) | **~90% (실제 분석)** |
| **순환 의존성** | 미지원 | **자동 탐지** |

### v6.2 → v6.3 핵심 변경

```
v6.2 (휴리스틱 추론)              v6.3 (skott 실제 분석)
─────────────────────             ─────────────────────────
파일 경로에 "api" 있음?           import { api } from './api'
  → Server 레이어 (가정)            → 실제 호출 관계 추출

UI + Logic 레이어 존재?           Button.tsx imports useAuth.ts
  → "아마 연결됐겠지" (추측)        → useAuth.ts imports api.ts
                                    → 실제 의존성 그래프 생성
```

**추가된 기능:**
- `skott` 라이브러리 통합 (실제 AST 분석)
- 실제 import/export 문 기반 의존성 추출
- 순환 의존성 자동 탐지 및 시각화
- 미사용 파일(dead code) 탐지
- Mermaid 다이어그램 자동 생성 (실제 관계 기반)

**기술 스택 추가:**
- `skott` - JavaScript/TypeScript 의존성 분석기
- `digraph-js` - 방향 그래프 구축 (skott 내부)

---

## 🆕 v6.2 변경사항

| 항목 | v6.1 | v6.2 |
|------|------|------|
| **시각화 전략** | 모듈 박스 단순 표시 | **데이터 흐름 중심 스토리텔링** |
| **비개발자 지원** | 기본 다이어그램 | **레이어별 시각화 (UI→로직→서버)** |
| **에러 감지** | 수동 확인 | **AST 기반 자동 위험도 분석** |
| **Level 구조** | 4단계 (Level 0-3) | **4단계 + 데이터 흐름 분석 API** |

### v6.1 → v6.2 핵심 변경

```
v6.1 (단순 모듈 표시)              v6.2 (데이터 흐름 시각화)
─────────────────────             ─────────────────────────
┌─────┐ ┌─────┐ ┌─────┐          [사용자 행동]
│auth │ │api  │ │utils│               │
└─────┘ └─────┘ └─────┘               ▼
   (모듈 박스만 표시)             ┌────┐   ┌────┐   ┌────┐
                                  │ UI │──▶│로직│──▶│서버│
                                  └────┘   └────┘   └────┘
                                       (데이터 흐름 표시)
```

**추가된 기능:**
- `POST /api/logic-flow/analyze`: AST 기반 코드 분석 + 위험도 평가
- 에러 가능 지점 자동 감지 (try-catch 누락, null 체크 없음 등)
- 레이어별 시각화 (UI → Logic → Server)

---

## 🆕 v6.1 변경사항

| 항목 | v6.0 | v6.1 |
|------|------|------|
| **아키텍처** | 3-tier (Vercel + Railway + Supabase) | **2-tier (Vercel + Supabase)** |
| **백엔드** | FastAPI (Railway) | **Next.js API Routes (서버리스)** |
| **인증** | Auth.js | **Supabase Auth** (GitHub OAuth 내장) |
| **비용** | $5/월~ | **$0/월** (무료 티어) |

### v6.0 → v6.1 핵심 변경

```
v6.0 (3-tier)                    v6.1 (2-tier)
─────────────                    ─────────────
Next.js (Vercel)                 Next.js (Vercel)
     │                                │
     ▼                                │ (API Routes = 백엔드)
FastAPI (Railway) ← 제거              │
     │                                ▼
     ▼                           Supabase
Supabase                         (Auth + DB + Storage)
```

---

## Executive Summary

**DevFlow**는 코딩을 전혀 모르는 비개발자가 AI와 협업하여 소프트웨어를 개발하는 플랫폼이다.

### 한 줄 정의

> **"AI가 코딩 100%, 비개발자가 검증 100%"**

### 핵심 문제

| 문제 | 원인 | 결과 |
|------|------|------|
| **순환 오류** | User 지시 → AI 시도 → 실패 → 반복 | 시간/토큰 낭비 |
| **AI 컨텍스트 손실** | 토큰 한도로 이전 내용 망각 | 잘못된 코드 생성 |
| **비개발자의 지옥** | 코드를 모르니 디버깅 불가 | 프로젝트 포기 |

### DevFlow 해결책

| 시스템이 하는 것 | User가 하는 것 |
|-----------------|---------------|
| 이전/현재 출력 비교 표시 | "이거 아까랑 다른데?" 판단 |
| 시도 이력 표시 | "이 정보가 빠진 것 같아" 파악 |
| 코드 → 논리 흐름 변환 | 논리 오류 발견 |
| 중복/불일치 자동 감지 | 해결 방향 지시 |

---

## 투트랙 전략

```mermaid
flowchart TB
    subgraph Track1["Track 1: PRD 생성 (외부 프로젝트)"]
        AI1["복수 AI 모델"] --> Debate["끝장 토론<br/>(제로베이스)"]
        Debate --> PRD["완벽한 PRD 도출"]
    end

    subgraph Track2["Track 2: DevFlow (이 프로젝트)"]
        subgraph AIFlow["AI 워크플로우"]
            Receive["PRD 수신"] --> Dev["개발 진행"]
            Dev --> Result["결과물 생성"]
            Result -.->|에러 시| Dev
        end

        subgraph UserFlow["User 워크플로우"]
            Check["결과물 확인"] --> Problem{"문제 발견?"}
            Problem -->|Yes| Analyze["문제 분석"]
            Analyze --> Instruct["해결 지시"]
            Instruct --> AIFlow
            Problem -->|No| Complete["완료"]
        end

        Result --> Check
    end

    PRD --> Receive
```

### 역할 분담

| 영역 | Track 1 (외부) | Track 2 (DevFlow) |
|------|----------------|-------------------|
| **입력** | 아이디어, 요구사항 | 완성된 PRD |
| **처리** | 복수 AI 끝장 토론 | AI 개발 + 이슈 관리 |
| **출력** | 완벽한 PRD | 동작하는 앱 |
| **비개발자 역할** | PRD 검토/승인 | 오류 감지 + 해결 지시 |

---

## 핵심 문제: 순환 오류

> **User 지시 → AI 시도 → 실패 → 다시 지시 → 다시 실패... 바이브 코더의 시간/자원 손실 구간**

```mermaid
flowchart TB
    subgraph Problem["현재 상황 (문제)"]
        U1["User: 이거 고쳐줘"] --> A1["AI: 수정 시도"]
        A1 --> E1["또 에러 ❌"]
        E1 --> U2["User: 아니 그게 아니라..."]
        U2 --> A2["AI: 다시 시도"]
        A2 --> E2["또 에러 ❌"]
        E2 --> Loop["반복... 시간/토큰 낭비"]
        Loop -.->|무한 반복| U1
    end

    subgraph Causes["실패 원인"]
        C1["1. AI가 뭘 모르는지 User가 모름"]
        C2["2. User 지시가 AI에게 불명확"]
        C3["3. AI 컨텍스트 손실 감지 안됨"]
        C4["4. 이전 시도 이력 안보임"]
    end

    style E1 fill:#dc2626,color:#fff
    style E2 fill:#dc2626,color:#fff
    style Loop fill:#dc2626,color:#fff
```

### AI의 숨겨진 문제

> **AI는 자신이 컨텍스트를 잃어버린 것을 모른다.**

| AI의 착각 | 현실 |
|-----------|------|
| "모든 것을 기억합니다" | 토큰 한도로 초반 내용 망각 |
| "문제가 생기면 알려드리겠습니다" | 문제를 인식하지 못함 |
| "이전 요청대로 만들었습니다" | 요청을 잊고 다르게 만듦 |

**AI가 모르는 것:**
- 토큰이 부족한지 모름
- 뭘 잊어버렸는지 모름
- 정보가 오염됐는지 모름
- 자신이 틀렸는지 모름

---

## DevFlow 해결 전략

### 시스템과 User의 역할 분담

```mermaid
flowchart TB
    subgraph System["🖥️ 시스템이 할 수 있는 것"]
        S1["이전/현재 출력 비교 표시"]
        S2["시도 이력 표시 (3번째 시도)"]
        S3["반복 실패 패턴 표시"]
        S4["코드 변경점 시각화"]
        S5["중복 코드 자동 탐지"]
        S6["함수 간 연결 관계 변화 감지"]
    end

    subgraph User["👤 User가 해야 하는 것 (시스템은 판단 못함)"]
        U1["이거 아까랑 다른데? 판단"]
        U2["이 정보가 빠진 것 같아 파악"]
        U3["올바른 정보 재공급 결정"]
        U4["해결 방향 지시"]
    end

    subgraph Result["✅ 결과"]
        R1["순환 오류 조기 탈출"]
        R2["시간/토큰 절약"]
    end

    System --> User
    User --> Result
```

### 비개발자가 AI보다 잘하는 것

| 비개발자 | AI |
|----------|-----|
| 처음 요청을 기억함 | 토큰 한도로 잊음 |
| "이거 아까 다르게 말했는데?" | 모순을 인식 못함 |
| 결과물이 틀린 것을 앎 | 자신있게 틀린 것을 제출 |
| 비즈니스 맥락 이해 | 기술적으로만 해석 |

---

## 핵심 기능

### 1. 코드 → 논리 흐름 변환

**문제**: 비개발자는 코드를 읽을 수 없다
**해결**: 코드를 논리 흐름으로 자동 변환

```
변환 전 (코드 - 이해 불가)          변환 후 (논리 흐름 - 이해 가능)
┌─────────────────────────┐        ┌─────────────────────────┐
│ function deleteProject  │        │                         │
│   (id) {                │   →    │  삭제 버튼 클릭         │
│   const result =        │        │       │                 │
│     api.delete(id);     │        │       ▼                 │
│   refreshList();        │        │  서버에 삭제 요청       │
│ }                       │        │       │                 │
│                         │        │       ▼                 │
│                         │        │  목록 새로고침          │
└─────────────────────────┘        └─────────────────────────┘
```

#### 코드 구조 다이어그램

비개발자가 코드 구조를 직관적으로 파악할 수 있도록 시각화:

```
┌────────────────────────────────────────────────────────────┐
│  코드 구조 다이어그램                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ main.py  │  │  auth/   │  │  cli/    │  │ ai_agent/│   │
│  │  (회색)  │  │  (빨강)  │  │  (회색)  │  │  (회색)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                   ⚠️ 에러                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  issue/  │  │ approval/│  │ realtime/│  │ diagram/ │   │
│  │  (회색)  │  │  (회색)  │  │  (회색)  │  │  (회색)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                            │
│  범례: ■ 회색 = 정상  ■ 빨강 = 에러                        │
└────────────────────────────────────────────────────────────┘
```

**설계 원칙**:

| 원칙 | 구현 |
|------|------|
| **단일 색상** | 모든 정상 모듈은 회색(#64748b) |
| **에러 강조** | 버그 관련 모듈만 빨간색(#dc2626) |
| **연결선 제거** | 복잡한 호출 관계 숨김 → 직관성 향상 |
| **그리드 레이아웃** | 모듈을 격자형으로 배치 |

**에러 표시 조건**:
- 이슈 라벨에 `bug` 포함
- 이슈 제목에 해당 모듈명 포함
- 조건 충족 시 해당 박스만 빨간색 + "⚠️ 에러" 표시

#### 1.1 상세 설계: 코드 로직 시각화

##### API 설계

```
POST /api/logic-flow/generate
```

**Request:**
```json
{
  "repo": "owner/repo-name",
  "path": "src/auth/login.ts",      // 특정 파일 (선택)
  "scope": "file" | "function" | "module",
  "function_name": "handleLogin",   // scope=function일 때
  "issue_number": 42                // 관련 이슈 (에러 하이라이트용)
}
```

**Response:**
```json
{
  "diagram_type": "flowchart",
  "mermaid_code": "flowchart TB\n  A[버튼 클릭] --> B[서버 요청]...",
  "nodes": [
    {
      "id": "A",
      "label": "로그인 버튼 클릭",
      "type": "user_action",
      "status": "normal",
      "source_location": { "file": "login.ts", "line": 15 }
    },
    {
      "id": "B",
      "label": "서버에 인증 요청",
      "type": "system_process",
      "status": "error",
      "error_detail": "토큰 검증 실패"
    }
  ],
  "summary": {
    "total_steps": 5,
    "error_points": 1,
    "description": "사용자 로그인 처리 흐름 (토큰 검증 단계에서 오류)"
  }
}
```

##### 노드 타입 정의

| type | 설명 | 아이콘 | 색상 |
|------|------|--------|------|
| `user_action` | 사용자 동작 (클릭, 입력) | 👤 | 파란색 |
| `system_process` | 시스템 내부 처리 | ⚙️ | 회색 |
| `api_call` | 외부 API 호출 | 🔗 | 보라색 |
| `decision` | 조건 분기 | ❓ | 노란색 |
| `result_success` | 성공 결과 | ✅ | 초록색 |
| `result_error` | 실패 결과 | ❌ | 빨간색 |

##### AI 프롬프트 설계

```markdown
## 역할
당신은 코드를 비개발자가 이해할 수 있는 논리 흐름으로 변환하는 전문가입니다.

## 규칙
1. 기술 용어 금지: `async`, `Promise`, `callback` → "처리 중", "완료 대기"
2. 함수명 → 동작 설명: `validateToken()` → "토큰이 유효한지 확인"
3. 조건문 → 질문 형태: `if (isValid)` → "유효한가?"
4. 에러 → 원인과 결과: `throw Error` → "문제 발생: ~할 수 없음"

## 출력 형식
- Mermaid flowchart 문법 사용
- 각 노드는 한글 5~15자 이내
- 최대 10단계 (복잡하면 그룹화)

## 예시
입력: function login(id, pw) { if (!validate(id)) return false; ... }
출력:
flowchart TB
    A["아이디 입력"] --> B{"아이디 형식 맞음?"}
    B -->|아니오| C["로그인 실패"]
    B -->|예| D["비밀번호 확인"]
```

##### React 컴포넌트 구조

```
src/components/logic-flow/
├── LogicFlowViewer.tsx      # 메인 뷰어 컴포넌트
├── MermaidRenderer.tsx      # Mermaid 다이어그램 렌더링
├── NodeTooltip.tsx          # 노드 호버 시 상세 정보
├── FlowControls.tsx         # 확대/축소, 전체보기 컨트롤
└── hooks/
    └── useLogicFlow.ts      # API 호출 + 상태 관리
```

**LogicFlowViewer Props:**
```typescript
interface LogicFlowViewerProps {
  repo: string;
  path?: string;
  issueNumber?: number;
  onNodeClick?: (node: FlowNode) => void;
  showLegend?: boolean;
}
```

##### 사용자 시나리오

| 시나리오 | 트리거 | 표시 내용 |
|----------|--------|----------|
| **이슈 상세 보기** | 이슈 클릭 | 관련 코드의 로직 흐름 + 에러 지점 하이라이트 |
| **파일 탐색** | 파일 선택 | 해당 파일의 주요 함수 흐름 |
| **AI 수정 결과** | AI 작업 완료 | 이전/이후 로직 비교 다이어그램 |
| **에러 발생** | 빌드/테스트 실패 | 에러 발생 지점까지의 흐름 |

##### 캐싱 전략

```
1. 파일 해시 기반 캐싱
   - 코드 변경 없으면 캐시된 다이어그램 반환
   - TTL: 24시간

2. 점진적 업데이트
   - 전체 재생성 대신 변경된 노드만 업데이트
   - diff 기반 하이라이트 지원
```

#### 1.2 보강 설계: 다층 시각화 시스템

##### 뷰 레벨 계층 (v6.2 업데이트)

```
┌─────────────────────────────────────────────────────────────────┐
│  Level 0: 전체 레포지토리 목록                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │ claude  │ │project_ │ │ other   │  ← 레포 카드              │
│  │ ⭐12    │ │ master  │ │ repo    │    (이슈 수 표시)         │
│  │ 🔴3     │ │ ⭐5     │ │ ⭐0     │                           │
│  └─────────┘ └─────────┘ └─────────┘                           │
├─────────────────────────────────────────────────────────────────┤
│  Level 1-A: 큰 그림 (High-Level Overview)        [레포 선택]    │
│                                                                 │
│     [사용자]                                                    │
│         │                                                       │
│         ▼                                                       │
│    ┌─────────┐      ┌─────────┐      ┌─────────┐               │
│    │  화면   │─────▶│  처리   │─────▶│  저장   │               │
│    │  (UI)   │      │ (Logic) │      │ (Data)  │               │
│    └─────────┘      └─────────┘      └─────────┘               │
│         │                │                │                     │
│      클릭 →           클릭 →           클릭 →                   │
│      상세보기         상세보기         상세보기                   │
│                                                                 │
│  🔴 이슈 3개: #1 로그인 실패, #2 토큰 만료, #3 권한 오류        │
├─────────────────────────────────────────────────────────────────┤
│  Level 1-B: 구체적 다이어그램 (레이어 상세)   [레이어 박스 클릭] │
│                                                                 │
│  ← 뒤로 (큰 그림)                              📦 화면(UI) 레이어│
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │LoginForm │    │Dashboard │    │Settings  │                 │
│   │ 🔴#1     │    │          │    │          │                 │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                 │
│        │               │               │                        │
│        ▼               ▼               ▼                        │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │  Button  │    │  Chart   │    │  Form    │                 │
│   │  Input   │    │  Table   │    │  Toggle  │                 │
│   └──────────┘    └──────────┘    └──────────┘                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Level 2: 모듈/컴포넌트 상세 (이슈 하이라이트)  [컴포넌트 클릭]  │
│                                                                 │
│  ┌───────────────────────────────────────┐                      │
│  │ LoginForm (이슈 #1 관련 영역 하이라이트)│                     │
│  │  ├── handleLogin() 🔴 ──→ validate() │                      │
│  │  ├── handleError()                    │                      │
│  │  └── resetForm()   ──→ clearState()  │                      │
│  └───────────────────────────────────────┘                      │
├─────────────────────────────────────────────────────────────────┤
│  Level 3: 함수 실행 흐름 (Step-by-Step)           [함수 클릭]   │
│                                                                 │
│  [시작] → [검증] → {조건} →|성공| → [처리] → [완료]             │
│                     |실패| → [에러] 🔴                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### 뷰 레벨 네비게이션 흐름 (v6.2 업데이트)

```
Level 0              Level 1-A            Level 1-B            Level 2            Level 3
─────────           ─────────────        ─────────────        ─────────────      ─────────────
전체 레포            큰 그림              구체적 다이어그램     컴포넌트 상세       함수 흐름

┌─────────┐        ┌─────────┐          ┌─────────┐          ┌─────────┐        ┌─────────┐
│ claude  │        │사용자   │          │LoginForm│          │handleLo │        │ Step 1  │
│ project │──────▶ │  ↓     │ ──────▶  │Dashboard│ ──────▶  │ gin()   │──────▶ │ Step 2  │
│ other   │ 선택   │UI→로직  │ 레이어   │Settings │ 컴포넌트 │validate │ 함수   │ Step 3  │
└─────────┘        │  →저장  │ 클릭     └─────────┘ 클릭     │()       │ 클릭   └─────────┘
                   └─────────┘                               └─────────┘
```

**드릴다운 순서:**
1. **Level 0** → 레포 선택 → **Level 1-A** (큰 그림)
2. **Level 1-A** → 레이어(UI/Logic/Data) 클릭 → **Level 1-B** (구체적 다이어그램)
3. **Level 1-B** → 컴포넌트/모듈 클릭 → **Level 2** (함수 목록 + 이슈 하이라이트)
4. **Level 2** → 함수 클릭 → **Level 3** (스텝바이스텝 실행 흐름)

**뒤로가기:**
- 각 레벨에서 "← 뒤로" 버튼으로 상위 레벨 복귀
- 브레드크럼 네비게이션: `garimto81 / claude / UI / LoginForm / handleLogin()`

##### 뷰 레벨 API

```
GET /api/logic-flow/repos?owner=garimto81                    # Level 0: 전체 레포 목록
GET /api/logic-flow/overview?repo=owner/repo                 # Level 1: 레포 모듈 구조
GET /api/logic-flow/overview?repo=owner/repo&issue=1         # Level 1+: 이슈 필터링
GET /api/logic-flow/module?repo=owner/repo&module=auth       # Level 2: 모듈 상세
GET /api/logic-flow/function?repo=owner/repo&path=...&fn=... # Level 3: 함수 흐름
```

**Level 0 Response (전체 레포 목록):**
```json
{
  "level": "user",
  "owner": "garimto81",
  "repositories": [
    {
      "name": "claude",
      "full_name": "garimto81/claude",
      "description": "Claude Code 프로젝트",
      "language": "TypeScript",
      "stars": 12,
      "open_issues": 3,
      "updated_at": "2025-12-16T..."
    },
    {
      "name": "project_master",
      "full_name": "garimto81/project_master",
      "description": "DevFlow 플랫폼",
      "language": "TypeScript",
      "stars": 5,
      "open_issues": 1,
      "updated_at": "2025-12-15T..."
    }
  ],
  "mermaid_code": "block-beta\n  columns 3\n  claude[\"claude ⭐12 🔴3\"] project_master[\"project_master ⭐5\"] ..."
}
```

**Level 1 Response (레포 모듈 구조):**
```json
{
  "level": "repo",
  "repo": "garimto81/claude",
  "modules": [
    {
      "name": "auth",
      "path": "src/auth/",
      "status": "error",
      "issue_count": 2,
      "function_count": 5
    },
    {
      "name": "api",
      "path": "src/api/",
      "status": "normal",
      "issue_count": 0,
      "function_count": 12
    }
  ],
  "issues": [
    { "number": 1, "title": "로그인 실패", "labels": ["bug"], "related_modules": ["auth"] },
    { "number": 2, "title": "토큰 만료", "labels": ["bug"], "related_modules": ["auth"] }
  ],
  "mermaid_code": "block-beta\n  columns 4\n  auth[\"auth 🔴\"] api[\"api\"] utils[\"utils\"] ..."
}
```

##### 인터랙티브 기능

| 기능 | 동작 | 결과 |
|------|------|------|
| **클릭** | 노드 클릭 | 해당 레벨로 드릴다운 / 코드 위치 표시 |
| **호버** | 노드 위에 마우스 | 툴팁 (함수 설명, 파라미터, 에러 정보) |
| **우클릭** | 컨텍스트 메뉴 | "코드 보기", "AI에게 설명 요청", "이슈 생성" |
| **줌** | 스크롤 / 핀치 | 확대/축소 |
| **패닝** | 드래그 | 다이어그램 이동 |
| **검색** | Ctrl+F | 노드/함수명 검색 + 하이라이트 |

##### 스텝바이스텝 실행 모드

비개발자가 "코드가 어떤 순서로 실행되는지" 애니메이션으로 이해:

```typescript
interface StepByStepConfig {
  speed: 'slow' | 'normal' | 'fast';  // 애니메이션 속도
  autoPlay: boolean;                   // 자동 재생
  showDataFlow: boolean;               // 데이터 흐름 표시
  highlightCurrent: boolean;           // 현재 단계 강조
}
```

**UI 컨트롤:**
```
┌─────────────────────────────────────────┐
│  ⏮️  ◀️  ⏸️  ▶️  ⏭️   [1/5 단계]  🐢━━●━━🐇  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ▶ 현재: "사용자 입력 검증"      │   │
│  │    다음: "서버에 로그인 요청"    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**API:**
```
POST /api/logic-flow/trace
{
  "repo": "owner/repo",
  "function": "handleLogin",
  "input_example": { "id": "user@email.com", "pw": "***" }
}

Response:
{
  "steps": [
    { "order": 1, "node": "A", "label": "로그인 버튼 클릭", "data": null },
    { "order": 2, "node": "B", "label": "입력값 검증", "data": { "id": "user@..." } },
    { "order": 3, "node": "C", "label": "서버 요청", "data": { "endpoint": "/api/auth" } },
    { "order": 4, "node": "D", "label": "응답 처리", "data": { "status": 200 } },
    { "order": 5, "node": "E", "label": "로그인 완료", "data": { "redirect": "/" } }
  ],
  "total_time_ms": 1234
}
```

##### 에러 트레이스 시각화

에러 발생 시 "어디서 문제가 생겼는지" 경로 표시:

```
정상 흐름:     A → B → C → D → E (초록)
에러 흐름:     A → B → C ─╳─→ ERROR (빨강)
                         │
                    "토큰 만료"
```

**API:**
```
POST /api/logic-flow/error-trace
{
  "repo": "owner/repo",
  "error": {
    "message": "Token expired",
    "stack": "at validateToken (auth.ts:42)..."
  }
}

Response:
{
  "error_path": ["A", "B", "C"],
  "error_node": "C",
  "error_detail": {
    "location": "토큰 검증 단계",
    "cause": "토큰 유효기간 만료",
    "suggestion": "재로그인 또는 토큰 갱신"
  },
  "mermaid_code": "flowchart TB\n  A[시작]-->B[입력]-->C[검증]:::error\n  classDef error fill:#dc2626"
}
```

##### 버전 비교 (Before/After)

AI 수정 전후 로직 변화를 나란히 표시:

```
┌─────────────────────┬─────────────────────┐
│  수정 전 (Before)    │  수정 후 (After)     │
├─────────────────────┼─────────────────────┤
│  A → B → C          │  A → B → B' → C     │
│       │             │       │    │        │
│       ▼             │       ▼    ▼        │
│  [에러 발생]         │  [검증 추가] → OK   │
└─────────────────────┴─────────────────────┘

변경 요약: "토큰 만료 검증 단계(B') 추가"
```

**API:**
```
POST /api/logic-flow/compare
{
  "repo": "owner/repo",
  "path": "src/auth/login.ts",
  "base_commit": "abc123",
  "head_commit": "def456"
}
```

##### 코드-다이어그램 동기화

다이어그램 노드 클릭 시 해당 코드 하이라이트:

```typescript
interface CodeDiagramSync {
  // 노드 클릭 → 코드 스크롤
  onNodeClick: (node: FlowNode) => {
    codeEditor.scrollTo(node.source_location.line);
    codeEditor.highlight(node.source_location.line, node.source_location.endLine);
  };

  // 코드 선택 → 노드 하이라이트
  onCodeSelect: (startLine: number, endLine: number) => {
    const node = findNodeByLineRange(startLine, endLine);
    diagram.highlightNode(node.id);
  };
}
```

**UI 레이아웃:**
```
┌────────────────────────────────────────────────────┐
│  [다이어그램]              │  [코드 뷰어]          │
│                           │                       │
│   A ──→ B ──→ C           │  function login() {   │
│         ▲                 │    validate(); // ←── │
│      [클릭]               │    request();         │
│                           │  }                    │
└────────────────────────────────────────────────────┘
```

##### AI 설명 통합

각 노드에 대해 AI가 비개발자 언어로 설명:

```
POST /api/logic-flow/explain
{
  "repo": "owner/repo",
  "node_id": "B",
  "context": "login flow"
}

Response:
{
  "node_id": "B",
  "explanation": {
    "what": "사용자가 입력한 이메일과 비밀번호가 올바른 형식인지 확인합니다",
    "why": "잘못된 형식의 데이터가 서버로 전송되면 오류가 발생하기 때문입니다",
    "example": "예: 이메일에 @ 기호가 없으면 '올바른 이메일 형식이 아닙니다' 메시지가 표시됩니다"
  }
}
```

##### 확장 컴포넌트 구조

```
src/components/logic-flow/
├── LogicFlowViewer.tsx        # 메인 뷰어
├── MermaidRenderer.tsx        # 다이어그램 렌더링
├── NodeTooltip.tsx            # 호버 툴팁
├── FlowControls.tsx           # 줌/패닝 컨트롤
├── StepPlayer.tsx             # 스텝바이스텝 플레이어 ⭐NEW
├── ErrorTrace.tsx             # 에러 경로 표시 ⭐NEW
├── VersionCompare.tsx         # Before/After 비교 ⭐NEW
├── CodeSync.tsx               # 코드-다이어그램 동기화 ⭐NEW
├── AIExplainer.tsx            # AI 설명 패널 ⭐NEW
├── LevelNavigator.tsx         # 레벨 전환 네비게이터 ⭐NEW
└── hooks/
    ├── useLogicFlow.ts        # API 호출
    ├── useStepPlayer.ts       # 스텝 재생 상태 ⭐NEW
    └── useCodeSync.ts         # 코드 동기화 ⭐NEW
```

##### 성능 최적화

| 전략 | 구현 |
|------|------|
| **지연 로딩** | Level 2-3은 클릭 시 로드 |
| **가상화** | 대규모 다이어그램은 뷰포트 내 노드만 렌더링 |
| **웹워커** | Mermaid 파싱을 별도 스레드에서 처리 |
| **캐싱** | IndexedDB에 다이어그램 캐시 (오프라인 지원) |

##### 비개발자 친화적 시각화 전략 ⭐NEW v6.2

> **핵심 원칙**: 단순 모듈 박스가 아닌, **데이터 흐름 중심**의 시각화

**문제**: 바이브 코더들은 "auth", "api", "utils" 같은 모듈 박스만 보면 이해 불가

**해결**: 사용자 행동 → 데이터 흐름 → 결과로 이어지는 스토리텔링 시각화

```
┌─────────────────────────────────────────────────────────────────┐
│                    Level 1: 데이터 흐름 다이어그램               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│      [사용자 행동]                                              │
│           │                                                     │
│           ▼                                                     │
│    ┌───────────┐        ┌───────────┐        ┌───────────┐     │
│    │    UI     │───────▶│   로직    │───────▶│   서버    │     │
│    │  화면표시  │        │  데이터변환 │        │  API통신  │     │
│    └───────────┘        └───────────┘        └───────────┘     │
│           │                  │                    │             │
│           ▼                  ▼                    ▼             │
│    버튼 클릭 처리       입력 검증             외부 요청         │
│    폼 입력 표시         데이터 가공           응답 처리         │
│    결과 화면 갱신       상태 관리             에러 처리         │
│                                                                 │
│  🔴 에러 가능 지점: [입력 검증 실패] [API 응답 없음] [권한 없음]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**시각화 유형 3가지:**

| 유형 | 목적 | 사용 시점 |
|------|------|----------|
| **데이터 흐름도** | 전체 구조 + 데이터 이동 경로 | Level 1 (레포 전체) |
| **의존성 그래프** | 모듈 간 호출 관계 | Level 1-2 (이슈 분석) |
| **실행 순서도** | 함수 내부 스텝바이스텝 | Level 3 (함수 상세) |

**에러 가능 지점 자동 감지:**

```
분석 기준:
├── 🔴 높음: try-catch 없는 API 호출
├── 🔴 높음: null/undefined 체크 없는 접근
├── 🟡 중간: 복잡도 10 이상 함수
├── 🟡 중간: 테스트 커버리지 없음
└── 🟢 낮음: 정상 패턴
```

**skott 기반 코드 분석 (v6.3):**

```
프로젝트 소스
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  skott 분석 엔진                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ TypeScript │  │ JavaScript │  │   JSX/TSX  │         │
│  │  Parser    │  │   Parser   │  │   Parser   │         │
│  │(ts-estree) │  │ (meriyah)  │  │            │         │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘         │
│        └───────────────┼───────────────┘                 │
│                        ▼                                 │
│              ┌─────────────────┐                         │
│              │ import/export   │                         │
│              │ 문 추출         │                         │
│              └────────┬────────┘                         │
│                       ▼                                  │
│              ┌─────────────────┐                         │
│              │ 의존성 그래프   │  ← digraph-js           │
│              │ 구축            │                         │
│              └────────┬────────┘                         │
│                       │                                  │
│        ┌──────────────┼──────────────┐                   │
│        ▼              ▼              ▼                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │순환 의존성│  │미사용 파일│  │ 모듈 관계 │              │
│  │ 탐지     │  │ 탐지     │  │ 추출     │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────┐
│ 위험도 분석  │  ← 기존 휴리스틱 보완
│ - try-catch │
│ - null check│
│ - 복잡도    │
└──────────────┘
    │
    ▼
┌──────────────┐
│ Mermaid 생성 │  → 실제 관계 기반 시각화
└──────────────┘
```

**skott vs 기존 휴리스틱 비교:**

| 항목 | 기존 (v6.2) | skott (v6.3) |
|------|-------------|--------------|
| **분석 방식** | 파일 경로 문자열 매칭 | 실제 AST 파싱 |
| **import 추적** | ❌ 미지원 | ✅ 모든 import/export 추적 |
| **순환 의존성** | ❌ 미지원 | ✅ DFS 기반 자동 탐지 |
| **미사용 코드** | ❌ 미지원 | ✅ 자동 탐지 |
| **정확도** | ~30% | ~90% |
| **성능** | - | madge 대비 7.5배 빠름 |

**API 엔드포인트 (v6.3 skott 기반):**

```
POST /api/logic-flow/analyze
{
  "repo": "owner/repo",
  "path": "src/",              // 분석 대상 경로
  "depth": "full",             // "shallow" | "medium" | "full"
  "include_risk": true,        // 에러 가능 지점 포함
  "include_circular": true     // 순환 의존성 포함 (v6.3 NEW)
}

Response (v6.3 skott 기반):
{
  "analysis_method": "skott",   // v6.3: 실제 AST 분석
  "data_flow": {
    "entry_points": ["src/app/page.tsx", "src/app/api/auth/route.ts"],
    "layers": [
      { "name": "UI", "modules": ["components/LoginForm", "components/SignupForm"] },
      { "name": "Logic", "modules": ["lib/auth", "lib/api"] },
      { "name": "Server", "modules": ["app/api/auth", "app/api/users"] }
    ],
    "connections": [
      {
        "from": "components/LoginForm.tsx",
        "to": "lib/auth.ts",
        "type": "import",
        "imports": ["signIn", "signOut"]     // v6.3: 실제 import 항목
      },
      {
        "from": "lib/auth.ts",
        "to": "lib/supabase.ts",
        "type": "import",
        "imports": ["supabase", "getSession"]
      }
    ]
  },
  "circular_dependencies": [               // v6.3 NEW: 순환 의존성
    {
      "cycle": ["moduleA.ts", "moduleB.ts", "moduleA.ts"],
      "severity": "warning",
      "suggestion": "의존성 방향 재설계 또는 인터페이스 분리"
    }
  ],
  "unused_files": [                        // v6.3 NEW: 미사용 파일
    "src/utils/deprecated.ts",
    "src/components/OldButton.tsx"
  ],
  "risk_points": [
    {
      "location": "lib/auth.ts:42",
      "function": "validateToken",
      "risk": "high",
      "reason": "API 호출 후 에러 처리 없음",
      "suggestion": "try-catch 추가 또는 응답 상태 확인"
    }
  ],
  "mermaid_code": "flowchart TB\n  LoginForm --> lib/auth\n  lib/auth --> lib/supabase\n  ...",
  "stats": {                               // v6.3 NEW: 분석 통계
    "total_files": 45,
    "analyzed_files": 42,
    "total_dependencies": 128,
    "circular_count": 1,
    "unused_count": 2
  }
}
```

### ~~2. 이상 징후 자동 감지 + 알림~~ (폐기)

> **폐기 사유**: 복잡도 대비 사용자 가치 낮음. 시각화 기능에 집중.
>
> 핵심 기능은 "코드 로직 시각화"로 통합:
> - 에러 발생 시 → 에러 지점 하이라이트로 대체
> - 로직 변경 감지 → 버전 비교 다이어그램으로 대체

### 2. 비개발자 언어로 오류 설명

```
기술적 설명 (이해 불가)
┌─────────────────────────────────────────────────────┐
│ TypeError: Cannot read property 'id' of undefined   │
│ at line 42                                          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
직관적 설명 (이해 가능)
┌─────────────────────────────────────────────────────┐
│ 문제 위치: '프로젝트 삭제' 기능                     │
│ 무슨 문제: 삭제할 프로젝트를 찾을 수 없음           │
│ 예상 원인: 이미 삭제된 프로젝트를 다시 삭제하려 함  │
│ 해결 방법: '이미 삭제된 프로젝트입니다' 메시지 추가 │
└─────────────────────────────────────────────────────┘
```

#### 3.1 상세 설계: 오류 번역 시스템

##### API 설계

```
POST /api/error/translate
```

**Request:**
```json
{
  "error_type": "runtime" | "build" | "test" | "lint",
  "raw_error": "TypeError: Cannot read property 'id' of undefined\n    at deleteProject (src/api/project.ts:42:15)",
  "context": {
    "file": "src/api/project.ts",
    "function": "deleteProject",
    "recent_changes": ["프로젝트 삭제 기능 추가"]
  }
}
```

**Response:**
```json
{
  "translated": {
    "location": "프로젝트 삭제 기능",
    "problem": "삭제할 프로젝트를 찾을 수 없음",
    "cause": "이미 삭제된 프로젝트를 다시 삭제하려 함",
    "solution": "'이미 삭제된 프로젝트입니다' 메시지 추가"
  },
  "severity": "error",
  "category": "data_not_found",
  "related_issues": [
    { "number": 42, "title": "프로젝트 삭제 오류" }
  ],
  "suggested_actions": [
    {
      "label": "AI에게 수정 요청",
      "action": "ai_fix",
      "prompt": "deleteProject 함수에서 프로젝트가 없을 때 친절한 에러 메시지를 보여주도록 수정해줘"
    },
    {
      "label": "이슈 생성",
      "action": "create_issue",
      "template": "bug"
    }
  ]
}
```

##### 오류 카테고리 매핑

| 기술적 오류 | 카테고리 | 비개발자 설명 |
|------------|----------|--------------|
| `TypeError: undefined` | `data_not_found` | "찾으려는 데이터가 없음" |
| `SyntaxError` | `code_typo` | "코드 작성 중 오타" |
| `NetworkError` | `connection_failed` | "서버 연결 실패" |
| `401 Unauthorized` | `auth_required` | "로그인이 필요함" |
| `403 Forbidden` | `no_permission` | "권한이 없음" |
| `404 Not Found` | `not_exist` | "페이지/데이터가 없음" |
| `500 Internal Error` | `server_problem` | "서버 내부 문제" |
| `CORS Error` | `blocked_request` | "브라우저가 요청을 차단함" |

##### AI 프롬프트 설계

```markdown
## 역할
당신은 기술적 오류 메시지를 비개발자가 이해할 수 있는 설명으로 번역합니다.

## 규칙
1. 전문 용어 제거: TypeError, undefined, null → 제거
2. 무엇이 문제인지 → 사용자 관점에서 설명
3. 왜 발생했는지 → 일상 비유 사용
4. 어떻게 해결하는지 → 구체적 행동 제시

## 출력 형식 (JSON)
{
  "location": "어디서 문제가 발생했는지 (기능명)",
  "problem": "무슨 문제인지 (한 문장)",
  "cause": "왜 발생했는지 (가능성 높은 원인)",
  "solution": "어떻게 해결하는지 (구체적 행동)"
}

## 예시
입력: TypeError: Cannot read property 'email' of null at sendEmail()
출력: {
  "location": "이메일 발송 기능",
  "problem": "이메일을 보낼 사용자 정보가 없음",
  "cause": "로그인하지 않은 상태에서 이메일 발송 시도",
  "solution": "먼저 로그인한 후 다시 시도하세요"
}
```

##### UI 컴포넌트

```
src/components/error/
├── ErrorExplainer.tsx       # 메인 오류 설명 컴포넌트
├── ErrorCard.tsx            # 번역된 오류 카드 UI
├── TechnicalDetails.tsx     # 기술 상세 (접기/펼치기)
├── SuggestedActions.tsx     # 추천 행동 버튼들
└── hooks/
    └── useErrorTranslation.ts  # API 호출 + 캐싱
```

**ErrorExplainer Props:**
```typescript
interface ErrorExplainerProps {
  error: {
    type: 'runtime' | 'build' | 'test' | 'lint';
    message: string;
    stack?: string;
  };
  context?: {
    file?: string;
    function?: string;
  };
  onActionClick?: (action: SuggestedAction) => void;
  showTechnicalDetails?: boolean;  // 개발자용 상세 표시
}
```

##### 실시간 오류 감지 흐름

```mermaid
sequenceDiagram
    participant Build as 빌드/테스트
    participant API as API 서버
    participant AI as AI (Claude)
    participant UI as 사용자 화면

    Build->>API: 오류 발생 (raw error)
    API->>AI: 번역 요청
    AI->>API: 번역된 설명
    API->>UI: SSE 푸시
    UI->>UI: 오류 카드 표시

    Note over UI: 사용자가 "AI에게 수정 요청" 클릭
    UI->>API: 수정 요청
    API->>AI: 코드 수정
    AI->>API: 수정된 코드
    API->>UI: 결과 표시
```

##### 에러 히스토리 저장

```typescript
interface ErrorHistory {
  id: string;
  timestamp: Date;
  raw_error: string;
  translated: TranslatedError;
  resolution?: {
    method: 'ai_fix' | 'manual' | 'ignored';
    resolved_at: Date;
    commit?: string;
  };
}
```

- 동일 오류 반복 시 "이전에도 같은 문제 발생" 알림
- 해결 방법 자동 제안 (이전 해결 사례 기반)

### 4. 이슈 기반 워크플로우

```
PRD 입력 → AI 개발 → 이슈 발생 → 시각화 → User 결정 → AI 해결 → 반복
```

| 이슈 유형 | 발생 상황 | User 역할 |
|----------|----------|----------|
| 버그 | AI 코드에서 오류 발생 | 증상 확인 + 수정 방향 지시 |
| 중복 | AI가 이미 있는 기능 재개발 | 중복 감지 + 통합 지시 |
| 불일치 | 함수 간 인터페이스 충돌 | 어느 쪽이 맞는지 결정 |
| 추가 기능 | 새로운 기능 필요 | 우선순위 결정 |

---

## UI 설계 (Mermaid 목업)

### 1. 메인 대시보드

```mermaid
block-beta
    columns 3

    block:header:3
        columns 3
        logo["🚀 DevFlow"]
        space
        user["👤 사용자명"]
    end

    block:sidebar:1
        columns 1
        nav1["📁 프로젝트"]
        nav2["📋 이슈"]
        nav3["⚙️ 설정"]
    end

    block:main:2
        columns 1
        block:projects
            columns 2
            p1["프로젝트 A<br/>진행중"]
            p2["프로젝트 B<br/>대기"]
        end
        block:recent
            columns 1
            r1["최근 활동: 버그 #12 수정 완료"]
        end
    end
```

### 2. 이슈 해결 화면

```mermaid
block-beta
    columns 4

    block:issue_list:1
        columns 1
        title1["📋 이슈 목록"]
        i1["#1 인증 버그 🔴"]
        i2["#2 다크모드 🟢"]
        i3["#3 README 🟡"]
    end

    block:detail:2
        columns 1
        title2["이슈 #1: 인증 버그"]
        status["상태: 열림 | 라벨: bug"]
        prompt["💬 AI에게 지시할 내용"]
        input["토큰 검증 로직을 수정해줘.<br/>만료된 토큰도 통과되는 문제야."]
        btn["🤖 AI에게 지시"]
    end

    block:diagram:1
        columns 1
        title3["코드 로직"]
        d1["로그인 요청"]
        d2["토큰 검증 🔴"]
        d3["권한 확인"]
        d4["응답 반환"]
    end

    style i1 fill:#dc2626,color:#fff
    style d2 fill:#dc2626,color:#fff
```

### 2-1. 코드 로직 시각화 (비개발자용)

> 비개발자가 "코드가 어떻게 동작하는지" 직관적으로 이해할 수 있는 로직 흐름

```mermaid
flowchart TB
    subgraph 사용자동작["👤 사용자 동작"]
        A1["로그인 버튼 클릭"]
    end

    subgraph 시스템처리["⚙️ 시스템 처리"]
        B1["1. 아이디/비번 확인"]
        B2["2. 토큰 생성"]
        B3["3. 토큰 검증"]
        B4["4. 권한 부여"]
    end

    subgraph 결과["📋 결과"]
        C1["로그인 성공"]
        C2["로그인 실패"]
    end

    A1 --> B1
    B1 -->|맞음| B2
    B1 -->|틀림| C2
    B2 --> B3
    B3 -->|유효| B4
    B3 -->|만료| C2
    B4 --> C1

    style B3 fill:#dc2626,color:#fff
    style C2 fill:#dc2626,color:#fff
```

**🔴 에러 지점 설명:**
- **토큰 검증**: 만료된 토큰도 통과시키는 버그 발견
- 수정 필요: "만료 여부 확인" 로직 추가

### 2-2. AI 이슈 해결 로직

```mermaid
flowchart LR
    subgraph 입력["📝 입력"]
        I1["문제 설명"]
        I2["관련 코드"]
    end

    subgraph AI처리["🤖 AI 처리"]
        A1["문제 분석"]
        A2["해결책 탐색"]
        A3["코드 수정"]
        A4["테스트 실행"]
    end

    subgraph 출력["✅ 출력"]
        O1["수정된 코드"]
        O2["변경 설명"]
    end

    I1 --> A1
    I2 --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 -->|성공| O1
    A4 -->|실패| A2
    O1 --> O2

    style A4 fill:#dc2626,color:#fff
```

### 3. AI 작업 진행 상태

```mermaid
stateDiagram-v2
    [*] --> 대기중: 이슈 선택
    대기중 --> 분석중: AI에게 지시
    분석중 --> 코딩중: 문제 파악 완료
    코딩중 --> 테스트중: 코드 작성 완료
    테스트중 --> 승인대기: 테스트 통과
    테스트중 --> 코딩중: 테스트 실패
    승인대기 --> 완료: 승인
    승인대기 --> 코딩중: 수정 요청
    완료 --> [*]

    note right of 분석중: 🔴 LIVE
    note right of 코딩중: 진행률 표시
```

### 4. 승인 플로우 모달

```mermaid
block-beta
    columns 1

    block:modal
        columns 1
        title["✅ 변경 사항 승인"]

        block:diff
            columns 2
            old["이전 코드<br/>───────<br/>if (token) {<br/>  return true;<br/>}"]
            new["새 코드<br/>───────<br/>if (token && !isExpired) {<br/>  return true;<br/>}"]
        end

        summary["📝 변경 요약: 토큰 만료 검증 추가"]

        block:buttons
            columns 3
            approve["✅ 승인"]
            edit["✏️ 수정 요청"]
            reject["❌ 거부"]
        end
    end

    style reject fill:#dc2626,color:#fff
```

### 5. 사용자 여정 플로우

```mermaid
journey
    title 비개발자의 DevFlow 사용 여정
    section PRD 입력
      PRD 작성/업로드: 5: User
      AI가 PRD 분석: 3: AI
    section 개발 진행
      AI가 코드 작성: 3: AI
      진행 상황 확인: 5: User
    section 이슈 해결
      버그 발견: 2: User
      문제 설명 입력: 5: User
      AI가 수정: 3: AI
    section 검증
      결과 확인: 5: User
      승인/거부 결정: 5: User
      배포: 5: User, AI
```

### 6. 시스템 아키텍처 (2-tier)

```mermaid
flowchart TB
    subgraph Vercel["☁️ Vercel"]
        subgraph Client["🖥️ Frontend (Next.js)"]
            UI["UI 컴포넌트"]
            State["상태 관리"]
            Mermaid["Mermaid 다이어그램"]
        end

        subgraph APIRoutes["⚙️ API Routes (서버리스)"]
            API["REST API"]
            Context["컨텍스트 관리"]
        end
    end

    subgraph Supabase["🗄️ Supabase"]
        Auth["GitHub OAuth"]
        DB["PostgreSQL + RLS"]
    end

    subgraph AI["🤖 AI Layer"]
        Claude["Claude Opus"]
        GPT["GPT-4o"]
        Gemini["Gemini"]
    end

    User["👤 비개발자"] --> Client
    Client --> APIRoutes
    APIRoutes <--> Auth
    APIRoutes <--> DB
    APIRoutes <--> AI
```

---

## 대상 사용자

| 페르소나 | 배경 | 역량 |
|----------|------|------|
| 기획자 | IT 기획 5년, 코딩 0 | 논리적 사고, 요구사항 정의 |
| 디자이너 | UX 디자인 3년 | 시각적 검증, 사용자 관점 |
| 창업자 | 비기술 배경 | 비즈니스 판단, 우선순위 |
| PM | 프로젝트 관리 7년 | 논리 흐름 검증 |

### 필요 역량 vs 불필요 역량

| 필요 (User가 갖춘 것) | 불필요 (AI가 담당) |
|---------------------|-------------------|
| 논리적 사고력 | 프로그래밍 언어 지식 |
| 비즈니스 도메인 지식 | 코드 문법/구조 이해 |
| 자연어로 요구사항 설명 | 기술 스택 선택 |
| 결과물 평가 능력 | 디버깅 기술 |

---

## 기술 아키텍처

> 📊 시스템 아키텍처 다이어그램은 [UI 설계 섹션 #6](#6-시스템-아키텍처-2-tier) 참조

### 기술 스택 (2-tier)

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **Frontend** | Next.js, Mermaid.js | UI, 다이어그램 렌더링 |
| **Backend** | Next.js API Routes | 서버리스 API |
| **Auth** | Supabase Auth | GitHub OAuth |
| **AI** | Claude, GPT-4o, Gemini | 코드 생성, 분석 |
| **Database** | Supabase PostgreSQL | 데이터 저장, RLS |
| **Code Analysis** | skott, ts-morph | AST 기반 의존성 분석 (v6.3) |

### 컨텍스트 손실 대응

```mermaid
flowchart LR
    subgraph Save["1️⃣ 자동 저장"]
        S1["요청/응답 로그"]
        S2["코드 변경 이력"]
        S3["원본 PRD"]
    end

    subgraph Detect["2️⃣ 이상 탐지"]
        D1["출력 비교"]
        D2["중복 감지"]
        D3["연결 끊김"]
    end

    subgraph Recover["3️⃣ 복구"]
        R1["User 확인"]
        R2["정보 선택"]
        R3["AI 재주입"]
    end

    Save --> Detect
    Detect -->|알림| Recover
```

---

## 핵심 차별점

| 도구 | 대상 | 방식 | 한계 |
|------|------|------|------|
| **Copilot/Cursor** | 개발자 | 코드 자동완성 | 비개발자 사용 불가 |
| **Claude Code/Aider** | 개발자 | 자연어 → 코드 | 기술 용어 필요 |
| **DevFlow** | **비개발자** | 자연어 → AI 100% 구현 | - |

### DevFlow 강점

1. **코드 숨김** → 논리 흐름만 표시
2. **비즈니스 언어**로 소통
3. **실행 결과**로 검증 (코드 검토 불필요)
4. **시스템이 비교/이력 제공** → User가 판단

---

## 성공 지표

| 지표 | 목표 |
|------|------|
| 비개발자 프로젝트 완료율 | > 80% |
| 코드 작성 0% 달성 | 100% |
| 순환 오류 평균 횟수 | < 3회 |
| 컨텍스트 복구 성공률 | > 95% |

---

## 🆕 공개 웹앱 아키텍처 (2-tier)

### 인증 시스템 (Supabase Auth + GitHub OAuth)

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js (Vercel)
    participant S as Supabase Auth
    participant G as GitHub
    participant DB as Supabase DB

    U->>N: 1. "GitHub으로 로그인" 클릭
    N->>S: 2. supabase.auth.signInWithOAuth({provider: 'github'})
    S->>G: 3. OAuth 리다이렉트
    G->>U: 4. 권한 승인 요청
    U->>G: 5. 승인
    G->>S: 6. Authorization Code + Token
    S->>S: 7. 사용자 생성/조회 (auth.users)
    S->>N: 8. Session + Access Token
    N->>N: 9. API Route 호출 (서버리스)
    N->>DB: 10. 데이터 조회 (RLS 적용)
    DB->>N: 11. 결과
    N->>U: 12. 응답
```

### 인증 솔루션 비교 (2025)

| 솔루션 | 무료 MAU | 장점 | 단점 | 추천 |
|--------|----------|------|------|------|
| **Supabase Auth** | 50,000 | DB 통합, RLS, GitHub OAuth 내장 | UI 단순 | ✅ **채택** |
| Auth.js | 무제한 | 완전 제어, 무료 | 직접 구현, 1-3시간 | - |
| Clerk | 10,000 | 최고 UI, 빠른 설정 | 유료 전환 빠름 ($550/월) | - |

### 채택: Supabase Auth + GitHub OAuth

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GitHub OAuth 로그인
export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'read:user user:email repo',
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

// 현재 세션 조회
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// GitHub Access Token 가져오기
export async function getGitHubToken() {
  const session = await getSession()
  return session?.provider_token  // GitHub API 호출용
}
```

### GitHub OAuth 권한 범위

| Scope | 용도 | 필수 |
|-------|------|------|
| `read:user` | 사용자 프로필 조회 | ✅ |
| `user:email` | 이메일 조회 | ✅ |
| `repo` | 레포지토리 접근 (비공개 포함) | ✅ |
| `write:repo_hook` | Webhook 설정 (향후) | 선택 |

### 배포 아키텍처 (2-tier)

```mermaid
flowchart TB
    subgraph Internet["🌐 인터넷"]
        User["👤 사용자"]
    end

    subgraph Vercel["☁️ Vercel (Frontend + Backend)"]
        Next["Next.js App"]
        API["API Routes (서버리스)"]
        Edge["Edge Functions"]
    end

    subgraph Supabase["🗄️ Supabase (All-in-One Backend)"]
        Auth["Supabase Auth"]
        DB[(PostgreSQL)]
        Storage["File Storage"]
        RLS["Row Level Security"]
    end

    subgraph External["🔗 외부 서비스"]
        GitHub["GitHub API"]
        Claude["Claude API"]
        GPT["OpenAI API"]
    end

    User --> Next
    Next --> API
    API <--> Auth
    API <--> DB
    API --> Storage
    API <--> GitHub
    API <--> Claude
    API <--> GPT
    Auth <--> GitHub
```

### 기술 스택 (2-tier 공개 웹앱)

| 레이어 | 기술 | 역할 | 비용 |
|--------|------|------|------|
| **Frontend** | Vercel + Next.js | 호스팅, SSR, Edge | 무료 (Hobby) |
| **Backend** | Next.js API Routes | 서버리스 함수 | 무료 (Vercel 포함) |
| **Auth** | Supabase Auth | GitHub OAuth, 세션 | 무료 (50,000 MAU) |
| **Database** | Supabase PostgreSQL | 데이터 저장, RLS | 무료 (500MB) |
| **Storage** | Supabase Storage | 파일 저장 | 무료 (1GB) |
| **합계** | - | - | **$0/월** |

### 보안 요구사항

| 항목 | 구현 방법 |
|------|----------|
| **HTTPS** | Vercel 자동 적용 |
| **CORS** | Next.js API Routes 설정 |
| **Rate Limiting** | Vercel Edge Middleware |
| **Input Validation** | Zod 스키마 검증 |
| **SQL Injection** | Supabase Parameterized Query |
| **XSS** | Next.js 자동 이스케이프 |
| **CSRF** | Supabase Auth 내장 보호 |
| **RLS** | Supabase Row Level Security |
| **Secrets** | Vercel 환경변수 |

### 멀티테넌시 데이터 모델

```mermaid
erDiagram
    users ||--o{ projects : owns
    users ||--o{ api_tokens : has
    projects ||--o{ issues : contains
    projects ||--o{ ai_sessions : has

    users {
        uuid id PK
        string github_id UK
        string email
        string avatar_url
        timestamp created_at
    }

    projects {
        uuid id PK
        uuid user_id FK
        string repo_full_name
        jsonb settings
        timestamp last_synced
    }

    issues {
        uuid id PK
        uuid project_id FK
        int github_issue_number
        string state
        jsonb ai_history
    }

    ai_sessions {
        uuid id PK
        uuid project_id FK
        string model_used
        int tokens_used
        timestamp created_at
    }
```

### Row Level Security (RLS) 정책

```sql
-- users 테이블: 본인만 접근
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- projects 테이블: 소유자만 접근
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- issues 테이블: 프로젝트 소유자만 접근
CREATE POLICY "Users can manage project issues" ON issues
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
```

### 배포 단계 (2-tier)

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: Supabase 설정"]
        S1["프로젝트 생성"]
        S2["GitHub OAuth 설정"]
        S3["DB 스키마 + RLS"]
    end

    subgraph Phase2["Phase 2: Vercel 배포"]
        V1["GitHub 연결"]
        V2["환경변수 설정"]
        V3["자동 배포"]
    end

    subgraph Phase3["Phase 3: 안정화"]
        M1["Vercel Analytics"]
        L1["Supabase Logs"]
        T1["E2E 테스트"]
    end

    Phase1 --> Phase2 --> Phase3
```

### 환경변수 (필수)

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI (선택)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
```

> **참고**: GitHub Token은 Supabase Auth가 자동 관리 (provider_token)

### 마이그레이션 계획 (현재 → 2-tier)

| 현재 코드 | 마이그레이션 | 비고 |
|----------|-------------|------|
| `backend/src/main.py` | `frontend/src/app/api/` | FastAPI → Next.js API Routes |
| `backend/src/issue/` | `frontend/src/app/api/issues/` | 이슈 API |
| `backend/src/ai_agent/` | `frontend/src/app/api/ai/` | AI 호출 API |
| 환경변수 `GITHUB_TOKEN` | Supabase `provider_token` | 사용자별 토큰 |
| Docker 설정 | 삭제 | Vercel 서버리스 |

### API Routes 구조 (예정)

```
frontend/src/app/api/
├── auth/
│   └── callback/route.ts     # OAuth 콜백
├── repositories/
│   ├── route.ts              # GET /api/repositories
│   └── [owner]/[repo]/
│       └── route.ts          # GET /api/repositories/:owner/:repo
├── issues/
│   ├── route.ts              # GET /api/issues
│   └── [number]/
│       └── route.ts          # GET/PATCH /api/issues/:number
└── ai/
    └── resolve/route.ts      # POST /api/ai/resolve
```

### 삭제 대상

| 폴더/파일 | 이유 |
|----------|------|
| `backend/` | Next.js API Routes로 대체 |
| `docker-compose.yml` | Vercel 서버리스로 대체 |
| `.env` GITHUB_TOKEN | Supabase provider_token으로 대체 |

---

## 로드맵

```mermaid
timeline
    title DevFlow 개발 로드맵
    section Phase 1: MVP
        PRD 입력 : AI 개발 : 미리보기
    section Phase 2: 시각화 ⭐핵심
        다층 뷰 시스템 : 스텝바이스텝 : 에러 트레이스 : AI 설명
    section Phase 3: 안정화
        E2E 테스트 : 피드백 반영
    section Phase 4: 공개 배포
        GitHub OAuth : Vercel 배포 : 멀티테넌시
```

| Phase | 목표 | 상태 |
|-------|------|------|
| **1. MVP** | PRD 입력 → AI 개발 → 미리보기 | ✅ 완료 |
| ~~**2. 감지 시스템**~~ | ~~이상 징후 자동 감지 + 알림~~ | ❌ 폐기 |
| **2. 시각화** ⭐ | 다층 뷰 + 스텝바이스텝 + 에러 트레이스 + AI 설명 | ✅ UI 완료 |
| **2-1. skott 통합** ⭐ | 실제 AST 분석 + 의존성 그래프 + 순환 탐지 | 📋 설계완료 |
| **3. 안정화** | E2E 테스트 + 피드백 반영 | ✅ 완료 |
| **4. 공개 배포** | GitHub OAuth + Vercel + 멀티테넌시 | 🔄 95% |

---

## 🆕 인증 시스템 이슈 현황 (2026-01-05)

### 해결된 이슈

| 이슈 | 설명 | 해결 방법 | PR |
|------|------|----------|-----|
| [#55](https://github.com/garimto81/project_master/issues/55) | `auth_failed` 에러 | 레거시 `/api/auth/callback` 삭제, Suspense boundary 추가 | [#56](https://github.com/garimto81/project_master/pull/56) |

### 진행 중인 이슈

| 이슈 | 설명 | 원인 | 상태 |
|------|------|------|------|
| [#57](https://github.com/garimto81/project_master/issues/57) | `invalid_code` 에러 | Supabase/GitHub OAuth 설정 불일치 추정 | 🔍 조사 중 |

### 확인 필요 설정

**Supabase Dashboard** (`uxfztmyqocirqzgjowzb`):
- Authentication > URL Configuration > Site URL
- Authentication > URL Configuration > Redirect URLs
- Authentication > Providers > GitHub (Client ID/Secret)

**GitHub OAuth App**:
- Authorization callback URL: `https://uxfztmyqocirqzgjowzb.supabase.co/auth/v1/callback`

---

## 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| AI가 비즈니스 로직 오해 | 높음 | 단계별 확인 + 체크리스트 |
| 토큰 한도 컨텍스트 손실 | 높음 | 자동 저장 + 복구 시스템 |
| 비개발자가 검증 어려워함 | 중간 | 실행 결과 기반 검증 |

---

## 요약

```mermaid
mindmap
  root((DevFlow))
    미션
      코딩 0%로 소프트웨어 개발
    역할 분담
      AI 100%
        분석
        설계
        구현
        테스트
      User 100%
        논리 확인
        오류 감지
        해결 지시
    핵심 해결
      순환 오류
        시스템: 비교/이력 제공
        User: 조기 탈출
      컨텍스트 손실
        시스템: 자동 저장
        User: 재공급
      코드 이해 불가
        논리 흐름 변환
    타겟 사용자
      기획자
      디자이너
      PM
      창업자
```

### 한 줄 요약

> **"AI가 코딩 100%, 비개발자가 검증 100%"** - 코드 없이 아이디어를 현실로

---

## 🆕 Phase 2-1: skott 통합 구현 계획

### 목표

기존 휴리스틱 기반 분석을 skott 기반 실제 AST 분석으로 교체하여 의존성 그래프 정확도를 30% → 90%로 향상

### 구현 단계

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: skott 설치 및 기본 통합                                 │
├─────────────────────────────────────────────────────────────────┤
│  - npm install skott                                            │
│  - API Route에서 skott 호출 래퍼 생성                            │
│  - 기본 의존성 그래프 추출 테스트                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: analyze API 리팩토링                                    │
├─────────────────────────────────────────────────────────────────┤
│  - 기존 inferLayer() 함수를 skott 결과로 대체                    │
│  - 실제 import/export 기반 connections 생성                      │
│  - 순환 의존성 탐지 결과 추가                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Mermaid 다이어그램 개선                                 │
├─────────────────────────────────────────────────────────────────┤
│  - 실제 의존성 관계 기반 flowchart 생성                          │
│  - 순환 의존성 노드 하이라이트 (빨간색)                           │
│  - 미사용 파일 회색 처리                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: UI 업데이트                                             │
├─────────────────────────────────────────────────────────────────┤
│  - 순환 의존성 경고 표시 컴포넌트                                 │
│  - 미사용 파일 목록 표시                                         │
│  - 분석 통계 대시보드                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 파일 변경 계획

| 파일 | 변경 내용 |
|------|----------|
| `package.json` | skott 의존성 추가 |
| `src/app/api/logic-flow/analyze/route.ts` | skott 통합, 기존 휴리스틱 제거 |
| `src/lib/skott-analyzer.ts` | skott 래퍼 유틸리티 (NEW) |
| `src/components/logic-flow/CircularWarning.tsx` | 순환 의존성 경고 UI (NEW) |
| `src/components/logic-flow/UnusedFiles.tsx` | 미사용 파일 목록 UI (NEW) |

### skott API 사용 예시

```typescript
// src/lib/skott-analyzer.ts
import { Skott } from 'skott'

export async function analyzeWithSkott(entrypoint: string) {
  const skott = new Skott({
    entrypoint,
    circularMaxDepth: 20,
    includeBaseDir: false,
    dependencyTracking: {
      thirdParty: false,
      builtin: false,
      typeOnly: true
    }
  })

  const { graph, files } = await skott.initialize()

  return {
    // 모든 파일 간 의존성
    dependencies: graph.toJSON(),

    // 순환 의존성
    circularDependencies: graph.findCircularDependencies(),

    // 미사용 파일
    unusedFiles: graph.findUnusedFiles(),

    // 진입점에서 도달 가능한 파일
    reachableFiles: graph.findReachableFiles(entrypoint)
  }
}
```

### 테스트 계획

| 테스트 | 검증 내용 |
|--------|----------|
| Unit | skott 래퍼 함수 동작 |
| Integration | API Route → skott → Mermaid 파이프라인 |
| E2E | 실제 프로젝트 분석 → UI 표시 |

### 예상 결과

```
Before (v6.2 휴리스틱)          After (v6.3 skott)
─────────────────────           ─────────────────────
UI → Logic → Server (추측)      LoginForm.tsx
                                    │
                                    ├──► useAuth.ts
                                    │       │
                                    │       └──► supabase.ts
                                    │
                                    └──► api.ts
                                            │
                                            └──► /api/auth/route.ts

                                🔴 순환 의존성: moduleA ↔ moduleB
                                ⚪ 미사용 파일: deprecated.ts
```

### 참고 자료

- [skott GitHub](https://github.com/antoine-coulon/skott)
- [skott npm](https://www.npmjs.com/package/skott)
- [Introducing Skott](https://dev.to/antoinecoulon/introducing-skott-the-new-madge-1bfl)
