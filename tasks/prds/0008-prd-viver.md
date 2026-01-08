# PRD: Viver - 바이브 코더를 위한 코드 이해/시각화 플랫폼

**Version**: 1.0
**Date**: 2026-01-08
**Status**: Draft

---

## Executive Summary

**프로젝트명**: Viver (비버)
**한 줄 요약**: "AI가 만든 코드를 이해하지 못해도, Viver가 보여줍니다"

### 핵심 가치 제안
Cursor, v0.app, Bolt.new 등 바이브 코딩 도구로 생성된 코드를 **시각화**하여 비개발자도 코드의 구조와 흐름을 이해할 수 있게 합니다.

### 포지셔닝
- **코드 생성 도구가 아님** - Cursor/v0/Bolt과 경쟁하지 않음
- **코드 이해 도구** - 바이브 코딩 생태계의 보완재

---

## 1. 배경 및 문제 정의

### 1.1 바이브 코딩 (Vibe Coding) 시장 현황

**정의**: Andrej Karpathy (OpenAI 공동창립자, 2025.02)
> "AI에게 느낌만 전달하고 코드 존재를 잊는 것"

**주요 도구:**
| 도구 | 특징 |
|------|------|
| Cursor | AI 중심 IDE, Agent 모드 |
| v0.app | Vercel의 에이전트형 앱 빌더 |
| Bolt.new | 브라우저 내 풀스택 개발 |

**시장 문제:**
- **91.6%**가 AI 생성 코드의 보안 취약점 경험 (Snyk 설문)
- AI 코드의 **품질 검증 어려움**
- 2025년 여름 이후 일반 사용자 **사용률 급감**

### 1.2 바이브 코더의 Pain Point

| 문제 | 설명 |
|------|------|
| **코드 이해 불가** | "AI가 만든 코드가 맞는지 확인할 수 없다" |
| **디버깅 어려움** | 문제 발생 시 원인 추적 불가 |
| **협업 장벽** | 팀원에게 코드 설명 불가능 |
| **보안 불안** | 취약점 존재 여부 확인 불가 |

### 1.3 시장 공백

| 영역 | Cursor | v0 | Bolt | **Viver** |
|------|--------|-----|------|-----------|
| 코드 생성 | O | O | O | X |
| **코드 이해/시각화** | X | X | X | **O** |
| 비개발자 친화 | △ | △ | △ | **O** |
| 기존 프로젝트 분석 | X | X | X | **O** |

---

## 2. 제품 정의

### 2.1 타겟 사용자

**Primary: 바이브 코더**
- 프로필: 25-45세, 비개발 배경, 창업자/PM/디자이너
- 행동: Cursor나 v0.app으로 MVP 제작, 코드 구조 이해 못함
- 목표: 코드 검증 능력 확보, 자신감 있는 배포

**Secondary: 코드 리뷰어/멘토**
- 프로필: 주니어 개발자의 AI 생성 코드를 리뷰해야 하는 시니어
- 목표: 빠른 구조 파악, 효율적 리뷰

### 2.2 MVP 스코프

**지원 범위:**
- 언어: TypeScript/JavaScript 전용
- 프레임워크: React/Next.js 최적화
- 파일 접근: 로컬 폴더 업로드 (File System Access API)

**제외 (v2 이후):**
- Python, Go, Rust 지원
- AI 기반 코드 설명 생성
- 실시간 협업

### 2.3 핵심 기능

**2가지 모드 병행 제공:**

| 모드 | 대상 | 방식 |
|------|------|------|
| **기본 모드** | 초보자 | 폴더 선택 → 원클릭 분석 → 결과 표시 |
| **고급 모드** | 파워유저 | ComfyUI 스타일 노드 연결로 커스텀 파이프라인 |

---

## 3. 사용자 플로우

### 3.1 기본 모드 (Simple Mode)

```
[폴더 선택] → [분석 버튼] → [결과 다이어그램]
                              │
                              ├── 레이어 뷰 (UI/Logic/API/Data)
                              ├── 흐름 뷰 (함수 호출 관계)
                              └── 인과관계 뷰 (트리거→효과)
```

### 3.2 고급 모드 (Workflow Mode)

```
[폴더 선택 노드] ── [파일 필터] ── [AST 분석] ──┬── [레이어 뷰]
                                                ├── [흐름 뷰]
                                                └── [위험 탐지]
```

**노드 타입:**
- 입력: 폴더 선택, 파일 필터
- 처리: AST 분석, 의존성 분석, 호출 그래프, 레이어 분류
- 출력: 레이어 뷰, 흐름 뷰, 통계, 위험 탐지

---

## 4. 기술 아키텍처

### 4.1 전체 구조

```
┌─────────────────────────────────────────────┐
│              Browser (Client)                │
│  ┌─────────────────────────────────────────┐│
│  │ File System Access API                  ││
│  │ - showDirectoryPicker()                 ││
│  │ - 파일 읽기 (브라우저 내 처리)           ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
                    │ POST /api/analyze
                    ▼
┌─────────────────────────────────────────────┐
│          Vercel (Next.js 14)                │
│  ┌─────────────────────────────────────────┐│
│  │ Analysis Engine                         ││
│  │ - skott-analyzer.ts (AST 의존성)        ││
│  │ - ast-analyzer.ts (함수/클래스)         ││
│  │ - call-graph-analyzer.ts (호출 관계)    ││
│  │ - function-labels.ts (한글 라벨)        ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 4.2 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 14, React 18, TypeScript |
| 시각화 | React Flow, Mermaid |
| 상태 관리 | Zustand |
| 레이아웃 | ELK.js (자동 노드 배치) |
| 분석 엔진 | skott, ts-morph |

### 4.3 인증 전략

- **익명 사용**: 로그인 없이 즉시 사용 가능
- **세션 저장**: localStorage (분석 결과 임시 보관)
- **GitHub OAuth 제거**: 기존 DevFlow 인증 코드 삭제

---

## 5. 페이지 구조

| 경로 | 역할 | 핵심 컴포넌트 |
|------|------|--------------|
| `/` | 랜딩 + 모드 선택 | `ModeSelector`, `FolderUploader` |
| `/simple` | 기본 모드 결과 | `ReactFlowDiagram` |
| `/workflow` | 고급 모드 에디터 | `WorkflowCanvas` |
| `/result` | 분석 결과 (공유용) | `ResultViewer` |

---

## 6. API 설계

### POST /api/analyze

**Request:**
```typescript
interface AnalyzeRequest {
  files: Array<{
    path: string      // "src/components/Button.tsx"
    content: string   // 파일 내용
  }>
  options?: {
    depth?: 'shallow' | 'medium' | 'full'
    includeRisk?: boolean
  }
}
```

**Response:**
```typescript
interface AnalyzeResponse {
  stats: {
    totalFiles: number
    analyzedFiles: number
    circularCount: number
    analysisTimeMs: number
  }
  layers: Array<{
    name: 'ui' | 'logic' | 'api' | 'data' | 'lib'
    displayName: string
    modules: ModuleInfo[]
  }>
  connections: Array<{
    from: string
    to: string
    type: 'import' | 'call' | 'fetch'
  }>
  circularDependencies: string[][]
  riskPoints: RiskPoint[]
  reactFlowData: {
    nodes: Node[]
    edges: Edge[]
  }
}
```

---

## 7. 파일 변경 계획

### 7.1 제거할 파일 (GitHub 관련)

```
frontend/src/lib/auth.ts
frontend/src/lib/auth-utils.ts
frontend/src/app/auth/
frontend/src/app/api/repositories/
frontend/src/app/api/issues/
frontend/src/app/api/ai/
frontend/src/lib/github-*.ts
frontend/src/app/project/
```

### 7.2 새로 생성할 파일

```
# 페이지
frontend/src/app/page.tsx           # 랜딩 (전체 재작성)
frontend/src/app/simple/page.tsx    # 기본 모드
frontend/src/app/workflow/page.tsx  # 고급 모드

# 컴포넌트 - 업로드
frontend/src/components/upload/
├── FolderUploader.tsx
├── FileList.tsx
└── UploadProgress.tsx

# 컴포넌트 - 워크플로우
frontend/src/components/workflow/
├── WorkflowCanvas.tsx
├── NodePalette.tsx
├── PropertiesPanel.tsx
├── nodes/
│   ├── BaseWorkflowNode.tsx
│   ├── InputNodes/
│   ├── ProcessNodes/
│   └── OutputNodes/
└── edges/
    └── DataTypeEdge.tsx

# 라이브러리
frontend/src/lib/
├── file-system.ts       # File System Access API 래퍼
├── session.ts           # 로컬 세션 관리
└── workflow/
    ├── executor.ts      # 워크플로우 실행 엔진
    ├── cache.ts         # 결과 캐싱
    ├── connection-rules.ts
    ├── elk-layout.ts
    └── schema.ts

# 스토어
frontend/src/stores/
└── workflowStore.ts

# API
frontend/src/app/api/analyze/route.ts
```

### 7.3 재사용할 파일 (수정 없음)

```
frontend/src/lib/skott-analyzer.ts
frontend/src/lib/ast-analyzer.ts
frontend/src/lib/call-graph-analyzer.ts
frontend/src/lib/function-labels.ts
frontend/src/lib/colors.ts
frontend/src/components/MermaidDiagram.tsx
frontend/src/components/visualization/ReactFlowDiagram.tsx
frontend/src/components/visualization/AnalysisProgressBar.tsx
frontend/src/components/visualization/nodes/
```

---

## 8. 구현 단계

### Phase 1: 기반 정리 + 기본 모드 (Week 1-2)

1. GitHub 관련 코드 제거
2. 새 랜딩 페이지 (모드 선택 UI)
3. FolderUploader 컴포넌트 (File System Access API)
4. `/api/analyze` 로컬 파일 지원
5. 기본 모드 완성 - 원클릭 분석 → 결과 표시

### Phase 2: 워크플로우 인프라 (Week 3-4)

1. workflowStore.ts - Zustand 상태 관리
2. WorkflowCanvas.tsx - React Flow 기반 캔버스
3. BaseWorkflowNode.tsx - 기본 노드 템플릿
4. executor.ts - Topological Sort 실행 엔진
5. connection-rules.ts - 포트 연결 규칙

### Phase 3: 노드 구현 (Week 5-6)

1. 입력 노드: FolderSelectNode, FileFilterNode
2. 처리 노드: AstAnalysisNode, DependencyAnalysisNode, CallGraphNode, LayerClassifyNode
3. 출력 노드: LayerViewNode, FlowViewNode, StatsNode, RiskDetectionNode

### Phase 4: UI/UX 완성 (Week 7-8)

1. NodePalette (드래그 앤 드롭)
2. PropertiesPanel (노드 설정)
3. 프리셋 워크플로우
4. 워크플로우 저장/불러오기
5. ELK 자동 레이아웃
6. 기본/고급 모드 전환 UI

### Phase 5: 폴리싱 (Week 9-10)

1. 에러 처리 강화
2. 캐싱 최적화
3. E2E 테스트 (두 모드 모두)
4. 모바일 대응

---

## 9. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 분석 완료율 | 90%+ | 업로드 → 결과 표시 비율 |
| 분석 시간 | <30초 (100파일) | 서버 로그 |
| 사용자 만족도 | 4.0+ / 5.0 | NPS 설문 |
| 재방문율 | 40%+ | 7일 내 재방문 |
| 고급 모드 채택률 | 20%+ | 모드별 사용 비율 |

---

## 10. 기술적 고려사항

### 10.1 File System Access API 호환성

```typescript
if ('showDirectoryPicker' in window) {
  // Chrome, Edge 지원
} else {
  // 폴백: <input type="file" webkitdirectory>
}
```

### 10.2 파일 제외 패턴

```typescript
const EXCLUDE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build',
  '.next', 'coverage', '*.test.*', '*.spec.*'
]
```

### 10.3 파일 제한

- 파일당 최대 1MB
- 총 프로젝트 50MB
- 100개 이상 파일 시 샘플링

---

## 11. 리스크 및 완화 전략

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| File System Access API 미지원 브라우저 | 사용자 이탈 | webkitdirectory 폴백 |
| 대용량 프로젝트 분석 지연 | UX 저하 | 샘플링 + 프로그레스바 |
| 고급 모드 학습 곡선 | 사용자 이탈 | 프리셋 + 가이드 툴팁 |
| 비개발자 용어 장벽 | 이해도 저하 | 한글 라벨 + 아이콘 |

---

## 12. 향후 로드맵

### v1.1
- Python 프로젝트 지원
- AI 기반 코드 설명 (Gemini API)

### v1.2
- 실시간 협업 (Supabase Realtime)
- 워크플로우 공유 기능

### v2.0
- 보안 취약점 자동 탐지
- CI/CD 통합 (GitHub Actions)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-08 | 초안 작성 |
