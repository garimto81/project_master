# PRD: 행동 중심 코드 시각화 시스템

**Version**: 1.0
**Date**: 2026-01-12
**Status**: Draft
**PRD-ID**: PRD-0008

---

## Executive Summary

현재 DevFlow의 시각화는 **"코드가 어떻게 정리되어 있는가"**(구조)를 보여주지만, 비개발자가 알아야 할 **"코드가 어떻게 작동하는가"**(행동)는 보여주지 못한다. 이 PRD는 **행동 중심 시각화** 패러다임으로의 전환을 정의한다.

### 한 줄 정의

> **"레이어/모듈 구조" → "사용자 여정 시퀀스"**

---

## 1. 문제 정의

### 1.1 현재 상태 (As-Is)

```
❌ 현재 시각화가 보여주는 것:
"UI Layer에 LoginPage가 있습니다"
"Logic Layer에 useAuth가 있습니다"
"LoginPage가 useAuth를 import합니다"
```

→ 비개발자 반응: **"그래서 뭐요? 이게 뭔데요?"**

### 1.2 근본 원인

| 문제 | 현재 | 필요 |
|------|------|------|
| **관점** | 개발자 (코드 구조) | 사용자 (기능 동작) |
| **표현** | 정적 (import 관계) | 동적 (실행 순서) |
| **언어** | 기술 용어 (useAuth, fetch) | 업무 언어 (로그인, 서버 요청) |
| **목적** | "이게 어디 있나" | "이게 어떻게 작동하나" |

### 1.3 무의미한 정보의 예시

**현재 시각화 출력:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ UI Layer    │────▶│ Logic Layer │────▶│ API Layer   │
│ LoginPage   │     │ useAuth     │     │ /api/auth   │
└─────────────┘     └─────────────┘     └─────────────┘
```

**비개발자의 질문:**
- "로그인 버튼 누르면 뭐가 일어나?" → **대답 못함**
- "이거 고치면 뭐가 깨져?" → **대답 못함**
- "이 데이터가 어디서 와?" → **대답 못함**

---

## 2. 목표

### 2.1 패러다임 전환

| FROM | TO |
|------|-----|
| **구조 중심** (HOW it's organized) | **행동 중심** (WHAT happens) |
| "LoginPage는 UI Layer에 있다" | "로그인 버튼 클릭 → 검증 → 서버 요청 → 대시보드" |
| 파일/모듈 단위 | 사용자 액션 단위 |
| import 관계 | 실행 순서 |

### 2.2 성공 지표

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| **비개발자 이해도** | "이 다이어그램으로 기능 설명해보세요" | 80% 정확 |
| **질문 응답률** | 4대 질문 중 답변 가능 비율 | 100% |
| **사용자 만족도** | "시각화가 도움됐나요?" | 4/5점 이상 |

### 2.3 4대 핵심 질문 (비개발자)

| # | 질문 | 필요 시각화 |
|---|------|-------------|
| 1 | "이 기능이 어떻게 작동해?" | 사용자 여정 시퀀스 |
| 2 | "이거 수정하면 뭐가 깨져?" | 영향도 분석 |
| 3 | "이 데이터가 어디서 와?" | 데이터 흐름 추적 |
| 4 | "문제 생기면 어디 봐야해?" | 역추적 가이드 |

---

## 3. 솔루션 설계

### 3.1 시각화 유형 (우선순위순)

#### P0: 사용자 여정 시퀀스 (가장 중요)

**목적**: "이 기능이 어떻게 작동하는가?"

**입력**: "로그인 기능"

**출력**:
```
sequenceDiagram
    사용자->>로그인화면: 버튼 클릭
    로그인화면->>검증: 입력값 확인
    검증->>서버: 로그인 요청
    서버-->>검증: 성공/실패
    검증-->>로그인화면: 결과 표시
    로그인화면-->>사용자: 대시보드 이동
```

**텍스트 버전** (비개발자용):
```
로그인 흐름:
  1️⃣ 로그인 버튼 클릭 (사용자 액션)
  2️⃣ 입력값 검증 (이메일 형식 확인)
  3️⃣ 서버에 요청 (POST /api/auth)
  4️⃣ 토큰 저장 (세션에 저장)
  5️⃣ 대시보드 이동 (페이지 전환)
```

---

#### P1: 영향도 분석

**목적**: "이걸 바꾸면 뭐가 깨지는가?"

**입력**: "useAuth 함수 삭제"

**출력**:
```
🔴 높은 위험 - 영향 범위: 5개 기능

직접 영향:
- LoginPage (로그인 불가)
- SignupPage (회원가입 불가)

간접 영향:
- 모든 인증 필요 페이지
- API 호출 실패

영향받는 사용자 기능:
✗ 로그인
✗ 회원가입
✗ 프로필 조회
✗ 설정 변경
```

---

#### P2: 데이터 흐름 추적

**목적**: "이 데이터가 어디서 와서 어디로 가는가?"

**입력**: "userEmail 변수"

**출력**:
```
📊 userEmail 데이터 여정

📍 출발: 로그인 폼 (사용자 입력)
     ↓
⚙️ 검증: validateEmail() (형식 확인)
     ↓
📤 전송: fetch('/api/auth') (서버로 보냄)
     ↓
💾 저장: Supabase users 테이블 (데이터베이스)
     ↓
📍 도착: 프로필 페이지 (사용자에게 표시)
```

---

#### P3: 문제 역추적 가이드

**목적**: "문제가 생기면 어디부터 확인해야 하는가?"

**입력**: "로그인 안 됨"

**출력**:
```
🔍 로그인 문제 체크리스트

□ 1. 입력값이 올바른가?
     └ 확인: 이메일 형식, 비밀번호 길이
     └ 파일: LoginForm.tsx:42

□ 2. 네트워크 요청이 가는가?
     └ 확인: DevTools Network 탭
     └ 파일: useAuth.ts:28

□ 3. API가 응답하는가?
     └ 확인: 서버 로그
     └ 파일: api/auth/login/route.ts:12

□ 4. 토큰이 저장되는가?
     └ 확인: localStorage/session
     └ 파일: useAuth.ts:40

□ 5. 리다이렉트가 작동하는가?
     └ 확인: router.push 호출
     └ 파일: LoginPage.tsx:55
```

---

### 3.2 기술적 구현

#### 분석 엔진

| 기능 | 구현 방식 |
|------|----------|
| **Entry Point 탐지** | UI 이벤트 핸들러 (onClick, onSubmit) AST 탐색 |
| **호출 체인 추적** | 함수 A → B → C 관계 추출 (ts-morph) |
| **역방향 의존성** | "누가 나를 사용하는가" BFS 탐색 |
| **데이터 흐름** | 변수 추적 (할당 → 사용 → 전달) |

#### API 확장

```
/api/logic-flow/
├── analyze        # 기존: 레이어 분석
├── journey        # 신규: 사용자 여정 시퀀스
├── impact         # 신규: 영향도 분석
├── dataflow       # 신규: 데이터 흐름
└── troubleshoot   # 신규: 문제 역추적
```

#### 비개발자 언어 변환

| 기술 용어 | 비개발자 언어 |
|-----------|---------------|
| onClick handler | 버튼 클릭 시 |
| async/await | 처리 중... |
| fetch API | 서버에 요청 |
| setState | 화면 업데이트 |
| useEffect | 자동 실행 |
| try-catch | 오류 확인 |
| return | 결과 반환 |
| import | 가져오기 |
| export | 내보내기 |

---

## 4. 상세 설계

### 4.1 사용자 여정 시퀀스 API

**POST /api/logic-flow/journey**

```typescript
// Request
{
  repo: string              // "owner/repo"
  feature: string           // "로그인", "회원가입", "이슈 생성"
  entryPoint?: string       // 시작점 (자동 탐지 가능)
}

// Response
{
  journey: {
    name: string            // "로그인 흐름"
    trigger: {
      type: 'click' | 'submit' | 'load'
      element: string       // "로그인 버튼"
      file: string          // "LoginPage.tsx"
      line: number
    }
    steps: Array<{
      order: number
      action: string        // "버튼 클릭", "입력값 검증"
      technical: string     // "handleLoginClick()"
      file: string
      line: number
      type: 'user' | 'logic' | 'api' | 'data'
    }>
    outcome: {
      success: string       // "대시보드로 이동"
      failure: string       // "에러 메시지 표시"
    }
  }

  visualization: {
    mermaid: string         // Mermaid 시퀀스 다이어그램
    text: string            // 텍스트 버전 (번호 리스트)
  }
}
```

### 4.2 영향도 분석 API

**POST /api/logic-flow/impact**

```typescript
// Request
{
  repo: string
  target: {
    type: 'function' | 'file' | 'module'
    name: string            // "useAuth" 또는 "lib/auth.ts"
  }
  action: 'delete' | 'modify' | 'rename'
}

// Response
{
  risk: 'high' | 'medium' | 'low'

  directImpact: Array<{
    name: string            // "LoginPage"
    type: string            // "컴포넌트"
    consequence: string     // "로그인 불가"
    file: string
    line: number
  }>

  indirectImpact: Array<{
    name: string
    depth: number           // 영향 전파 깊이
    consequence: string
  }>

  userFeatures: string[]    // ["로그인", "회원가입", "프로필"]

  summary: string           // 비개발자용 한 줄 요약
}
```

### 4.3 데이터 흐름 API

**POST /api/logic-flow/dataflow**

```typescript
// Request
{
  repo: string
  variable: string          // "userEmail"
  file?: string             // 시작 파일 (선택)
}

// Response
{
  variable: string

  journey: Array<{
    step: number
    stage: 'origin' | 'transform' | 'transfer' | 'store' | 'display'
    action: string          // "사용자 입력", "형식 검증"
    technical: string       // "e.target.value"
    file: string
    line: number
  }>

  origin: {
    type: 'user-input' | 'api-response' | 'database' | 'constant'
    description: string     // "로그인 폼에서 사용자가 입력"
  }

  destinations: Array<{
    name: string            // "프로필 페이지"
    usage: string           // "사용자 이름으로 표시"
    file: string
  }>
}
```

---

## 5. UI/UX 설계

### 5.1 메인 뷰 전환

```
┌─────────────────────────────────────────────────────────────┐
│  코드 이해하기                                                │
├─────────────────────────────────────────────────────────────┤
│  [📖 기능 흐름] [⚠️ 영향 분석] [📊 데이터 추적] [🔍 문제 해결]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  (선택한 뷰에 따른 시각화)                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 기능 흐름 뷰 (P0)

```
┌─────────────────────────────────────────────────────────────┐
│  📖 로그인 기능 흐름                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐  │
│  │ 👤   │───▶│ 📝   │───▶│ ✓    │───▶│ 📤   │───▶│ 📊   │  │
│  │ 클릭  │    │ 입력  │    │ 검증  │    │ 전송  │    │ 완료  │  │
│  └──────┘    └──────┘    └──────┘    └──────┘    └──────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  1️⃣ 로그인 버튼 클릭                                        │
│     사용자가 로그인 버튼을 누릅니다                          │
│                                                             │
│  2️⃣ 입력값 검증                                             │
│     이메일 형식과 비밀번호를 확인합니다                       │
│                                                             │
│  3️⃣ 서버에 요청                                             │
│     입력한 정보를 서버로 보냅니다                            │
│                                                             │
│  4️⃣ 결과 처리                                               │
│     ✅ 성공: 대시보드로 이동                                 │
│     ❌ 실패: 에러 메시지 표시                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 영향 분석 뷰 (P1)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ useAuth 삭제 시 영향                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 높은 위험                                                │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                       useAuth                          │ │
│  │                          │                             │ │
│  │     ┌────────────────────┼────────────────────┐        │ │
│  │     │                    │                    │        │ │
│  │     ▼                    ▼                    ▼        │ │
│  │  ┌──────┐           ┌──────┐            ┌──────┐       │ │
│  │  │로그인│           │회원가입│           │프로필│       │ │
│  │  │ 불가 │           │ 불가  │            │조회불가│     │ │
│  │  └──────┘           └──────┘            └──────┘       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  영향받는 기능:                                              │
│  • 로그인/로그아웃                                           │
│  • 회원가입                                                  │
│  • 프로필 조회/수정                                          │
│  • 모든 인증 필요 페이지                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 구현 계획

### Phase 1: 사용자 여정 시퀀스 (P0)

1. Entry Point 탐지 알고리즘
   - onClick, onSubmit 핸들러 AST 탐색
   - 페이지 컴포넌트 진입점 식별

2. 호출 체인 추적
   - 함수 호출 관계 추출 (ts-morph)
   - 최대 깊이 10 제한

3. 시퀀스 생성
   - Mermaid sequence diagram 생성
   - 비개발자 텍스트 버전 생성

4. API 엔드포인트
   - POST /api/logic-flow/journey

### Phase 2: 영향도 분석 (P1)

1. 역방향 의존성 그래프
   - "누가 나를 사용하는가" 계산
   - BFS 탐색 (깊이 5 제한)

2. 기능 단위 매핑
   - 파일 → 사용자 기능 매핑 테이블
   - 자동 추론 + 수동 보정

3. API 엔드포인트
   - POST /api/logic-flow/impact

### Phase 3: 데이터 흐름 + 역추적 (P2-P3)

1. 변수 추적 알고리즘
2. 문제 체크리스트 생성
3. API 엔드포인트 추가

### Phase 4: UI 통합

1. 뷰 전환 UI
2. 시각화 컴포넌트
3. E2E 테스트

---

## 7. 검증 방법

### 7.1 비개발자 테스트

**테스트 시나리오**:
1. 로그인 기능의 시퀀스 다이어그램 제시
2. "이 다이어그램을 보고 로그인이 어떻게 작동하는지 설명해보세요"
3. 80% 이상 정확하게 설명하면 성공

**평가 기준**:
- 주요 단계 언급 여부
- 순서 정확성
- 성공/실패 케이스 이해

### 7.2 4대 질문 테스트

각 질문에 대해 시각화가 유의미한 답변을 제공하는지 확인:

| 질문 | 테스트 방법 |
|------|-------------|
| "어떻게 작동해?" | 시퀀스 다이어그램으로 설명 가능 |
| "뭐가 깨져?" | 영향받는 기능 목록 제공 |
| "데이터 어디서 와?" | 데이터 여정 표시 |
| "어디 확인해?" | 체크리스트 제공 |

---

## 8. 기존 시스템과의 관계

### PRD-0007과의 차이

| 구분 | PRD-0007 (v1.4) | PRD-0008 |
|------|-----------------|----------|
| **초점** | 구조 + 일부 흐름 | 행동 중심 |
| **시퀀스** | 선택적 추가 기능 | 핵심 기능 |
| **비개발자 우선** | 부분적 | 완전히 |
| **기술 용어** | 그대로 표시 | 업무 언어 변환 |

### 통합 전략

1. PRD-0007의 기존 분석 엔진 활용
2. 새로운 행동 중심 뷰 추가
3. 기존 레이어 뷰는 "개발자 뷰"로 유지

---

## 9. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 동적 호출 미탐지 | 불완전한 시퀀스 | 경고 표시 + 수동 보완 |
| 대규모 프로젝트 | 복잡한 시퀀스 | 주요 흐름만 표시 옵션 |
| 언어 변환 오류 | 혼란 | LLM 보정 + fallback |

---

## 10. TDD 설계 (Red-Green-Refactor)

### 10.1 P0: 사용자 여정 시퀀스 테스트

#### Unit Tests: Entry Point 탐지

```typescript
// tests/unit/journey/entry-point-detector.test.ts

describe('EntryPointDetector', () => {
  describe('detectEventHandlers', () => {
    it('onClick 핸들러를 탐지해야 함', async () => {
      const code = `
        function LoginButton() {
          const handleClick = () => { login() }
          return <button onClick={handleClick}>로그인</button>
        }
      `
      const result = await detectEventHandlers(code)

      expect(result).toContainEqual({
        type: 'click',
        handler: 'handleClick',
        element: 'button',
        line: expect.any(Number)
      })
    })

    it('onSubmit 핸들러를 탐지해야 함', async () => {
      const code = `
        function LoginForm() {
          const handleSubmit = (e) => { e.preventDefault(); login() }
          return <form onSubmit={handleSubmit}>...</form>
        }
      `
      const result = await detectEventHandlers(code)

      expect(result).toContainEqual({
        type: 'submit',
        handler: 'handleSubmit',
        element: 'form',
        line: expect.any(Number)
      })
    })

    it('인라인 핸들러도 탐지해야 함', async () => {
      const code = `<button onClick={() => login()}>로그인</button>`
      const result = await detectEventHandlers(code)

      expect(result.length).toBe(1)
      expect(result[0].type).toBe('click')
    })
  })
})
```

#### Unit Tests: 호출 체인 추적

```typescript
// tests/unit/journey/call-chain-tracer.test.ts

describe('CallChainTracer', () => {
  describe('traceCallChain', () => {
    it('직접 호출 체인을 추적해야 함', async () => {
      const files = {
        'LoginPage.tsx': `
          function handleLogin() { validateInput(); submitLogin() }
        `,
        'auth.ts': `
          function validateInput() { return true }
          function submitLogin() { fetch('/api/auth') }
        `
      }

      const result = await traceCallChain(files, 'handleLogin')

      expect(result.steps).toHaveLength(3)
      expect(result.steps[0].function).toBe('handleLogin')
      expect(result.steps[1].function).toBe('validateInput')
      expect(result.steps[2].function).toBe('submitLogin')
    })

    it('최대 깊이를 초과하면 중단해야 함', async () => {
      // 재귀 호출 또는 깊은 체인
      const result = await traceCallChain(files, 'deepFunction', { maxDepth: 5 })

      expect(result.steps.length).toBeLessThanOrEqual(5)
      expect(result.truncated).toBe(true)
    })

    it('비동기 호출을 표시해야 함', async () => {
      const code = `
        async function fetchData() {
          const data = await fetch('/api/data')
          return data.json()
        }
      `
      const result = await traceCallChain({ 'file.ts': code }, 'fetchData')

      expect(result.steps.some(s => s.isAsync)).toBe(true)
    })
  })
})
```

#### Unit Tests: 시퀀스 생성

```typescript
// tests/unit/journey/sequence-generator.test.ts

describe('SequenceGenerator', () => {
  describe('generateMermaid', () => {
    it('올바른 Mermaid 시퀀스 다이어그램을 생성해야 함', () => {
      const journey = {
        name: '로그인 흐름',
        steps: [
          { order: 1, action: '버튼 클릭', type: 'user' },
          { order: 2, action: '입력 검증', type: 'logic' },
          { order: 3, action: '서버 요청', type: 'api' }
        ]
      }

      const mermaid = generateMermaid(journey)

      expect(mermaid).toContain('sequenceDiagram')
      expect(mermaid).toContain('사용자')
      expect(mermaid).toContain('버튼 클릭')
    })
  })

  describe('generateText', () => {
    it('비개발자용 텍스트 버전을 생성해야 함', () => {
      const journey = {
        steps: [
          { order: 1, action: '버튼 클릭', technical: 'handleClick()' }
        ]
      }

      const text = generateText(journey)

      expect(text).toContain('1️⃣')
      expect(text).toContain('버튼 클릭')
      expect(text).not.toContain('handleClick') // 기술 용어 숨김
    })
  })
})
```

#### Integration Tests: Journey API

```typescript
// tests/integration/api/journey.test.ts

describe('POST /api/logic-flow/journey', () => {
  it('로그인 기능의 여정을 반환해야 함', async () => {
    const response = await fetch('/api/logic-flow/journey', {
      method: 'POST',
      body: JSON.stringify({
        repo: 'test/repo',
        feature: '로그인'
      })
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.journey.name).toBe('로그인 흐름')
    expect(data.journey.steps.length).toBeGreaterThan(0)
    expect(data.visualization.mermaid).toContain('sequenceDiagram')
    expect(data.visualization.text).toContain('1️⃣')
  })

  it('존재하지 않는 기능은 빈 결과를 반환해야 함', async () => {
    const response = await fetch('/api/logic-flow/journey', {
      method: 'POST',
      body: JSON.stringify({
        repo: 'test/repo',
        feature: '존재하지않는기능'
      })
    })

    const data = await response.json()

    expect(data.journey.steps).toHaveLength(0)
    expect(data.suggestions).toBeDefined() // 유사 기능 제안
  })
})
```

---

### 10.2 P1: 영향도 분석 테스트

#### Unit Tests: 역방향 의존성

```typescript
// tests/unit/impact/reverse-dependency.test.ts

describe('ReverseDependencyAnalyzer', () => {
  describe('findCallers', () => {
    it('함수를 호출하는 모든 파일을 찾아야 함', async () => {
      const graph = {
        'useAuth': ['LoginPage', 'SignupPage', 'ProfilePage'],
        'LoginPage': ['App'],
        'SignupPage': ['App']
      }

      const callers = findCallers(graph, 'useAuth')

      expect(callers).toContain('LoginPage')
      expect(callers).toContain('SignupPage')
      expect(callers).toContain('ProfilePage')
    })

    it('깊이 제한을 적용해야 함', async () => {
      const callers = findCallers(graph, 'useAuth', { maxDepth: 1 })

      expect(callers).not.toContain('App') // 깊이 2
    })
  })

  describe('calculateRisk', () => {
    it('호출자가 많으면 높은 위험으로 판정해야 함', () => {
      const impact = { directCount: 10, indirectCount: 20 }

      const risk = calculateRisk(impact)

      expect(risk).toBe('high')
    })

    it('호출자가 적으면 낮은 위험으로 판정해야 함', () => {
      const impact = { directCount: 1, indirectCount: 0 }

      const risk = calculateRisk(impact)

      expect(risk).toBe('low')
    })
  })
})
```

#### Unit Tests: 기능 매핑

```typescript
// tests/unit/impact/feature-mapper.test.ts

describe('FeatureMapper', () => {
  describe('mapToUserFeatures', () => {
    it('파일을 사용자 기능으로 매핑해야 함', () => {
      const files = ['LoginPage.tsx', 'useAuth.ts', 'api/auth/route.ts']

      const features = mapToUserFeatures(files)

      expect(features).toContain('로그인')
    })

    it('여러 기능에 영향을 주는 경우 모두 반환해야 함', () => {
      const files = ['useAuth.ts'] // 인증 관련 여러 기능에 영향

      const features = mapToUserFeatures(files)

      expect(features).toContain('로그인')
      expect(features).toContain('회원가입')
      expect(features).toContain('프로필')
    })
  })
})
```

#### Integration Tests: Impact API

```typescript
// tests/integration/api/impact.test.ts

describe('POST /api/logic-flow/impact', () => {
  it('함수 삭제 시 영향도를 반환해야 함', async () => {
    const response = await fetch('/api/logic-flow/impact', {
      method: 'POST',
      body: JSON.stringify({
        repo: 'test/repo',
        target: { type: 'function', name: 'useAuth' },
        action: 'delete'
      })
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.risk).toMatch(/high|medium|low/)
    expect(data.directImpact.length).toBeGreaterThan(0)
    expect(data.userFeatures.length).toBeGreaterThan(0)
    expect(data.summary).toBeTruthy() // 비개발자 요약
  })
})
```

---

### 10.3 P2: 데이터 흐름 테스트

```typescript
// tests/unit/dataflow/variable-tracer.test.ts

describe('VariableTracer', () => {
  describe('traceVariable', () => {
    it('변수의 출발점을 찾아야 함', async () => {
      const code = `
        function LoginForm() {
          const [email, setEmail] = useState('')
          return <input value={email} onChange={e => setEmail(e.target.value)} />
        }
      `

      const result = await traceVariable(code, 'email')

      expect(result.origin.type).toBe('user-input')
    })

    it('변수의 사용처를 모두 찾아야 함', async () => {
      const result = await traceVariable(files, 'userEmail')

      expect(result.destinations.length).toBeGreaterThan(0)
      expect(result.destinations.some(d => d.name.includes('프로필'))).toBe(true)
    })
  })
})
```

---

### 10.4 P3: 문제 역추적 테스트

```typescript
// tests/unit/troubleshoot/checklist-generator.test.ts

describe('ChecklistGenerator', () => {
  describe('generateChecklist', () => {
    it('문제에 대한 체크리스트를 생성해야 함', async () => {
      const journey = { /* 로그인 여정 */ }
      const problem = '로그인 안 됨'

      const checklist = generateChecklist(journey, problem)

      expect(checklist.items.length).toBeGreaterThan(0)
      expect(checklist.items[0]).toHaveProperty('step')
      expect(checklist.items[0]).toHaveProperty('check')
      expect(checklist.items[0]).toHaveProperty('file')
    })
  })
})
```

---

### 10.5 E2E Tests

```typescript
// tests/e2e/behavior-visualization.spec.ts

import { test, expect } from '@playwright/test'

test.describe('행동 중심 시각화', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/visualization')
  })

  test('기능 흐름 탭이 표시되어야 함', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /기능 흐름/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /영향 분석/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /데이터 추적/ })).toBeVisible()
  })

  test('기능 선택 시 시퀀스 다이어그램이 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: /기능 흐름/ }).click()
    await page.getByRole('combobox', { name: /기능 선택/ }).selectOption('로그인')

    // 시퀀스 다이어그램 렌더링 대기
    await expect(page.locator('[data-testid="sequence-diagram"]')).toBeVisible()

    // 단계 목록 확인
    await expect(page.getByText('1️⃣')).toBeVisible()
  })

  test('영향 분석 탭에서 함수 선택 시 영향도가 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: /영향 분석/ }).click()
    await page.getByRole('textbox', { name: /함수명/ }).fill('useAuth')
    await page.getByRole('button', { name: /분석/ }).click()

    await expect(page.locator('[data-testid="impact-result"]')).toBeVisible()
    await expect(page.getByText(/위험|영향/)).toBeVisible()
  })

  test('비개발자 언어로 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: /기능 흐름/ }).click()
    await page.getByRole('combobox', { name: /기능 선택/ }).selectOption('로그인')

    // 기술 용어가 아닌 비개발자 언어 확인
    await expect(page.getByText('버튼 클릭')).toBeVisible()
    await expect(page.getByText('서버에 요청')).toBeVisible()

    // 기술 용어는 숨겨져야 함 (또는 hover 시에만 표시)
    await expect(page.getByText('handleClick')).not.toBeVisible()
  })
})
```

---

## 11. TODO 체크리스트

### Phase 1: 사용자 여정 시퀀스 (P0)

#### 분석 엔진
- [ ] `lib/journey/entry-point-detector.ts` - Entry Point 탐지
  - [ ] onClick 핸들러 탐지
  - [ ] onSubmit 핸들러 탐지
  - [ ] 인라인 핸들러 탐지
  - [ ] 페이지 컴포넌트 진입점 탐지

- [ ] `lib/journey/call-chain-tracer.ts` - 호출 체인 추적
  - [ ] 직접 호출 추적
  - [ ] 비동기 호출 표시
  - [ ] 최대 깊이 제한
  - [ ] 순환 호출 탐지

- [ ] `lib/journey/sequence-generator.ts` - 시퀀스 생성
  - [ ] Mermaid 다이어그램 생성
  - [ ] 비개발자 텍스트 버전 생성
  - [ ] 성공/실패 케이스 분기

- [ ] `lib/journey/term-translator.ts` - 용어 변환
  - [ ] 기술 용어 → 비개발자 언어 매핑
  - [ ] 함수명 → 행동 설명 변환

#### API
- [ ] `app/api/logic-flow/journey/route.ts` - Journey API
  - [ ] POST 엔드포인트
  - [ ] 기능명으로 Entry Point 자동 탐지
  - [ ] 캐싱 적용

#### UI
- [ ] `components/visualization/JourneyView.tsx` - 기능 흐름 뷰
  - [ ] 기능 선택 드롭다운
  - [ ] 시퀀스 다이어그램 렌더링
  - [ ] 단계 목록 표시
  - [ ] 성공/실패 분기 표시

#### 테스트
- [ ] Unit: entry-point-detector.test.ts
- [ ] Unit: call-chain-tracer.test.ts
- [ ] Unit: sequence-generator.test.ts
- [ ] Integration: journey API 테스트
- [ ] E2E: 기능 흐름 뷰 테스트

---

### Phase 2: 영향도 분석 (P1)

#### 분석 엔진
- [ ] `lib/impact/reverse-dependency.ts` - 역방향 의존성
  - [ ] 호출자 BFS 탐색
  - [ ] 깊이 제한
  - [ ] 위험도 계산

- [ ] `lib/impact/feature-mapper.ts` - 기능 매핑
  - [ ] 파일 → 사용자 기능 매핑
  - [ ] 자동 추론 로직
  - [ ] 매핑 테이블

#### API
- [ ] `app/api/logic-flow/impact/route.ts` - Impact API
  - [ ] POST 엔드포인트
  - [ ] 직접/간접 영향 계산
  - [ ] 비개발자 요약 생성

#### UI
- [ ] `components/visualization/ImpactView.tsx` - 영향 분석 뷰
  - [ ] 대상 선택 (함수/파일)
  - [ ] 위험도 표시 (색상)
  - [ ] 영향받는 기능 목록
  - [ ] 트리 다이어그램

#### 테스트
- [ ] Unit: reverse-dependency.test.ts
- [ ] Unit: feature-mapper.test.ts
- [ ] Integration: impact API 테스트
- [ ] E2E: 영향 분석 뷰 테스트

---

### Phase 3: 데이터 흐름 + 역추적 (P2-P3)

#### 분석 엔진
- [ ] `lib/dataflow/variable-tracer.ts` - 변수 추적
  - [ ] 출발점 탐지
  - [ ] 변환 과정 추적
  - [ ] 사용처 탐지

- [ ] `lib/troubleshoot/checklist-generator.ts` - 체크리스트 생성
  - [ ] 여정 기반 체크포인트
  - [ ] 파일/라인 정보 포함

#### API
- [ ] `app/api/logic-flow/dataflow/route.ts` - DataFlow API
- [ ] `app/api/logic-flow/troubleshoot/route.ts` - Troubleshoot API

#### UI
- [ ] `components/visualization/DataFlowView.tsx` - 데이터 추적 뷰
- [ ] `components/visualization/TroubleshootView.tsx` - 문제 해결 뷰

#### 테스트
- [ ] Unit: variable-tracer.test.ts
- [ ] Unit: checklist-generator.test.ts
- [ ] Integration: dataflow/troubleshoot API 테스트
- [ ] E2E: 데이터/문제해결 뷰 테스트

---

### Phase 4: UI 통합

#### 컴포넌트
- [ ] `components/visualization/BehaviorVisualization.tsx` - 메인 컨테이너
  - [ ] 탭 전환 UI
  - [ ] 상태 관리
  - [ ] 로딩/에러 처리

- [ ] `components/visualization/ViewModeSelector.tsx` - 뷰 선택기
  - [ ] 4개 뷰 모드 탭
  - [ ] 아이콘 + 라벨

#### 통합
- [ ] 기존 visualization 페이지에 새 뷰 추가
- [ ] 개발자 뷰 / 비개발자 뷰 토글
- [ ] 반응형 디자인

#### 테스트
- [ ] E2E: 전체 흐름 테스트
- [ ] 비개발자 사용성 테스트 (수동)

---

## 12. 참고 자료

- [C4 Model](https://c4model.com/) - 4단계 추상화
- [CodeSee](https://www.codesee.io/learning-center/code-visualization) - 코드 시각화 유형
- [Terrastruct D2](https://terrastruct.com/) - 다이어그램 as 코드

---

## Appendix: 현재 시각화 vs 목표 시각화 비교

### Before (현재)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ UI Layer    │────▶│ Logic Layer │────▶│ API Layer   │
│ LoginPage   │     │ useAuth     │     │ /api/auth   │
└─────────────┘     └─────────────┘     └─────────────┘
```

→ "그래서 이게 뭔데요?"

### After (목표)

```
로그인 흐름:
  1️⃣ 로그인 버튼 클릭
  2️⃣ 이메일/비밀번호 확인
  3️⃣ 서버에 로그인 요청
  4️⃣ 성공하면 대시보드로 이동
```

→ "아, 이렇게 작동하는구나!"
