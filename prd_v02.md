제안드린 **'프랑켄슈타인 전략(Best-of-Breed Open Source Aggregation)'**을 기반으로 업데이트된 PRD입니다.
바닥부터 개발하는 것이 아니라, 검증된 오픈소스 기술(Aider, LangGraph, OpenHands)을 조립하여 개발 속도와 안정성을 동시에 확보하는 고효율 아키텍처로 재설계되었습니다.
PRD (v2.0): GitCommand Center (Open-Source Composite Edition)
1. 개요 (Overview)
GitCommand Center는 현존하는 최고의 오픈소스 AI 기술을 모듈식으로 통합한 **'AI-Native 개발자 대시보드'**입니다.
Aider의 강력한 코딩 능력, LangGraph의 정교한 워크플로우 제어, OpenHands의 UI 아키텍처를 결합하여, GitHub 이슈 관리부터 코드 수정, 시각적 디버깅까지 단일 인터페이스에서 처리합니다.
2. 전략적 변경 사항 (Strategic Shift)
기존의 '자체 개발' 방식에서 '오픈소스 통합(Integration)' 방식으로 변경합니다.
| 구분 | 기존(v1.0) | 변경안(v2.0) - 프랑켄슈타인 전략 |
|---|---|---|
| Coding Engine | LLM API 직접 호출 | Aider (Library Mode) 활용 (Git/Context 관리 위임) |
| Workflow | 자체 로직 구현 | LangGraph (상태 기반 에이전트 오케스트레이션) |
| Terminal UI | Xterm.js 단순 구현 | OpenHands UI 아키텍처 벤치마킹 (샌드박스 연동) |
| Visualization | AST 파싱 직접 구현 | Tree-sitter (Aider 내부 모듈 재사용) + React Flow |
3. 상세 기능 요구사항 (Features & Implementation)
3.1. Aider 기반 코딩 엔진 (The Brain)
 * 기능: 자연어 명령을 받아 실제 파일을 수정하고 Git 커밋을 수행.
 * 구현 전략:
   * Python의 aider-chat 라이브러리를 백엔드(FastAPI)에 임베딩.
   * Repository Map: Aider가 생성하는 '압축된 코드 지도' 데이터를 추출하여 프롬프트 컨텍스트 최적화 비용 절감.
   * Auto-Commit: Aider의 기능을 활용해 "Refactor login logic" 입력 시, 코드 수정 후 적절한 커밋 메시지 생성 및 로컬 Git 반영.
3.2. LangGraph 워크플로우 제어 (The Nervous System)
 * 기능: 사용자의 모호한 명령을 구체적인 작업(이슈 생성 -> 코드 수정 -> 테스트)으로 분할 및 제어.
 * 구현 전략:
   * State Machine: User Input → Planner Agent → Coding Agent(Aider) → Reviewer Agent → Human Approval 흐름을 LangGraph로 정의.
   * Human-in-the-loop: 코드를 push하기 전, LangGraph가 흐름을 일시 정지(Interrupt)하고 사용자의 승인(CLI에서 y/n)을 대기.
3.3. 하이브리드 인터페이스 (The Body)
 * 기능: 웹 기반 터미널과 칸반 보드의 동기화.
 * 구현 전략:
   * UI Framework: Next.js 15 + Shadcn UI.
   * Terminal: OpenHands의 TerminalComponent 구조를 참조하여, 웹 소켓을 통해 백엔드(Aider 프로세스)와 실시간 입출력 연동.
   * Kanban Sync: GitHub API 웹훅을 수신하여 이슈 상태가 변경되면, React Query로 칸반 보드 즉시 갱신.
3.4. Tree-sitter 기반 시각화 (The Eyes)
 * 기능: 코드 의존성 및 에러 시각화.
 * 구현 전략:
   * Data Source: Aider가 내부적으로 사용하는 tree-sitter 파싱 데이터를 JSON 형태로 추출.
   * Rendering: 추출된 노드(파일/함수)와 엣지(호출 관계)를 React Flow로 렌더링.
   * Error Overlay: pytest 또는 linter의 로그(stderr)를 파싱하여, 에러가 발생한 파일 경로와 매칭되는 노드를 Red Border로 스타일링.
4. 시스템 아키텍처 (Revised Tech Stack)
이 스택은 Python 생태계(AI/Backend)와 JS 생태계(Frontend)의 장점을 결합합니다.
4.1. Backend (Python/FastAPI)
 * Core: FastAPI (비동기 처리 용이).
 * AI Lib: langgraph, langchain, aider-chat.
 * System Interface: subprocess (터미널 명령어 실행), gitpython.
4.2. Frontend (TypeScript/Next.js)
 * Core: Next.js 15 (App Router).
 * State: Zustand (터미널 로그, 칸반 상태 관리).
 * Vis: React Flow (다이어그램), Xterm.js (터미널).
4.3. Infrastructure
 * Container: Docker (OpenHands처럼 샌드박스 환경에서 코드를 실행하여 호스트 머신 보호).
 * DB: PostgreSQL (Supabase) - 이슈 메타데이터 및 에이전트 대화 로그 저장.
5. 단계별 개발 로드맵 (Roadmap)
프랑켄슈타인 전략의 핵심은 **"작동하는 최소 단위(MVP)"**를 빠르게 만드는 것입니다.
Phase 1: Core Integration (2주)
 * FastAPI 서버에 Aider를 라이브러리로 통합.
 * 웹 터미널(Xterm.js)에서 입력한 텍스트를 Aider에게 전달하고, 응답을 터미널에 출력하는 "Web CLI" 구축.
 * GitHub 리포지토리 clone 및 기본 commit/push 동작 확인.
Phase 2: Workflow & Kanban (2주)
 * LangGraph 도입: 단순 채팅이 아닌 Plan -> Code -> Verify 루프 구현.
 * GitHub Issues API 연동: 칸반 보드 UI 개발 및 양방향 동기화(이슈 이동 시 라벨 변경 등).
Phase 3: Visualization & Polish (2주)
 * Aider의 repo_map 데이터를 시각화 모듈로 변환.
 * 에러 로그 파싱 로직 추가 및 다이어그램에 Red Light 기능 구현.
 * 최종 UI 다듬기 (Dark Mode, Responsive).
다음 단계 제안 (Next Step)
이제 "무엇(What)"을 만들지와 "어떻게(How - 오픈소스)" 만들지가 명확해졌습니다. 개발에 착수하기 위한 설계도가 필요합니다.
 * [시스템 아키텍처 다이어그램]: Aider, LangGraph, React, DB가 어떻게 데이터를 주고받는지 Mermaid 흐름도로 그려드릴까요? (구현 시 로직 참조용)
 * [백엔드 API 명세 초안]: 프론트엔드와 백엔드가 통신할 핵심 API (예: /api/agent/command, /api/repo/sync) 정의서를 작성해 드릴까요?
 * [핵심 코드 스니펫]: Python에서 Aider를 라이브러리로 불러와서 웹소켓으로 쏘는 가장 어려운 부분의 샘플 코드를 작성해 드릴까요?
가장 필요하신 작업을 말씀해 주십시오.
