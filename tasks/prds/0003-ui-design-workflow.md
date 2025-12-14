# GitCommand Center: UI 디자인 및 워크플로우 가이드

**Version**: 1.1
**Date**: 2025-12-14
**Status**: Draft
**Related**: 0002-prd-gitcommand-center-v2.md

---

## 문서 작성 지침

> **Mermaid 다이어그램 규칙**: 모든 워크플로우는 **세로 방향(TB: Top to Bottom)**으로 작성합니다.
>
> ```
> ✅ 권장: flowchart TB (세로)
> ❌ 금지: flowchart LR (가로)
> ```
>
> **예외**: UI 레이아웃 표현 시 `direction LR`은 허용 (가로 배치 컴포넌트 표현용)

---

## 1. 문서 개요

이 문서는 GitCommand Center의 **사용자 인터페이스(UI) 설계**와 **사용자 워크플로우**를 시각적으로 설명합니다.
비개발자도 시스템의 구조와 사용 방법을 이해할 수 있도록 Mermaid 다이어그램으로 표현했습니다.

---

## 2. 전체 화면 구조

### 2.1 메인 대시보드 레이아웃

```mermaid
flowchart TB
    subgraph SCREEN["GitCommand Center 메인 화면"]
        subgraph HEADER["상단 헤더 (60px)"]
            direction LR
            LOGO[로고]
            REPO_SELECT[저장소 선택 드롭다운]
            BRANCH[브랜치 표시]
            USER[사용자 프로필]
        end

        subgraph MAIN["메인 영역 (flex)"]
            subgraph LEFT["왼쪽 패널 (30%)"]
                DIAGRAM_PANEL[코드 다이어그램<br/>의존성 그래프<br/>에러 히트맵]
            end

            subgraph CENTER["중앙 패널 (40%)"]
                KANBAN_PANEL[칸반 보드<br/>이슈 카드 관리<br/>드래그앤드롭]
            end

            subgraph RIGHT["오른쪽 패널 (30%)"]
                DETAIL_PANEL[상세 정보<br/>파일 미리보기<br/>AI 분석 결과]
            end
        end

        subgraph FOOTER["하단 터미널 (200px, 조절 가능)"]
            TERMINAL_PANEL[AI 명령 터미널<br/>입력/출력/승인]
        end
    end

    HEADER --- MAIN
    MAIN --- FOOTER

    style HEADER fill:#1e293b,color:#fff
    style FOOTER fill:#0f172a,color:#0f0
    style LEFT fill:#dbeafe
    style CENTER fill:#fef3c7
    style RIGHT fill:#dcfce7
```

### 2.2 반응형 레이아웃

```mermaid
flowchart TB
    subgraph DESKTOP["데스크톱 (1920px+)"]
        D1[3열 레이아웃]
        D2[터미널 고정]
    end

    subgraph LAPTOP["노트북 (1280px)"]
        L1[2열 + 탭 전환]
        L2[터미널 접기 가능]
    end

    subgraph TABLET["태블릿 (768px)"]
        T1[1열 + 하단 탭]
        T2[터미널 전체화면]
    end

    DESKTOP --> LAPTOP --> TABLET
```

---

## 3. 화면별 상세 설계

### 3.1 로그인 화면

```mermaid
flowchart TB
    subgraph LOGIN["로그인 화면"]
        subgraph CONTENT["중앙 카드"]
            LOGO_BIG[GitCommand Center<br/>로고 + 슬로건]
            DIVIDER1[───────────]
            GITHUB_BTN[🔗 GitHub로 로그인<br/>OAuth 버튼]
            DIVIDER2[───────────]
            FEATURES[주요 기능 소개<br/>3가지 아이콘]
        end
    end

    LOGO_BIG --> GITHUB_BTN
    GITHUB_BTN --> FEATURES

    style GITHUB_BTN fill:#24292e,color:#fff
```

### 3.2 저장소 선택 화면

```mermaid
flowchart TB
    subgraph REPO_SELECT_SCREEN["저장소 선택"]
        subgraph SEARCH["검색 영역"]
            SEARCH_INPUT[🔍 저장소 검색...]
            FILTER[필터: 모두 / 소유 / 협업]
        end

        subgraph LIST["저장소 목록"]
            REPO1[📁 my-project<br/>⭐ 123 | 🍴 45 | 🟢 활성]
            REPO2[📁 another-repo<br/>⭐ 67 | 🍴 12 | 🟡 비활성]
            REPO3[📁 team-project<br/>⭐ 890 | 🍴 234 | 🟢 활성]
        end

        subgraph ACTIONS["하단 액션"]
            CLONE_NEW[+ 새 저장소 Clone]
            REFRESH[🔄 새로고침]
        end
    end

    SEARCH --> LIST --> ACTIONS

    style REPO1 fill:#dcfce7
    style REPO3 fill:#dcfce7
    style REPO2 fill:#fef3c7
```

### 3.3 헤더 컴포넌트

```mermaid
flowchart TB
    subgraph HEADER_DETAIL["헤더 상세"]
        LOGO_SMALL[🚀 GCC]

        subgraph REPO_INFO["저장소 정보"]
            REPO_NAME[my-project ▼]
            BRANCH_NAME[main]
            SYNC_STATUS[🟢 동기화됨]
        end

        subgraph NAV["네비게이션"]
            NAV_DASHBOARD[대시보드]
            NAV_ISSUES[이슈]
            NAV_SETTINGS[설정]
        end

        subgraph USER_AREA["사용자"]
            NOTIFICATIONS[🔔 3]
            AVATAR[👤 사용자명 ▼]
        end
    end

    LOGO_SMALL --> REPO_INFO --> NAV --> USER_AREA
```

---

## 4. 핵심 컴포넌트 설계

### 4.1 프로젝트 선택 화면 (GitHub 스타일)

> **디자인 원칙**: GitHub 메인 홈과 동일한 UI로 학습 비용 제로

```mermaid
flowchart TB
    subgraph PROJECT_LIST["프로젝트 목록 (GitHub 홈 스타일)"]
        subgraph SEARCH_AREA["검색 영역"]
            SEARCH_INPUT["🔍 저장소 검색..."]
            FILTER_BTN["필터 ▼"]
        end

        subgraph REPO_LIST["내 저장소"]
            REPO1["📁 garimto81/my-project<br/>⭐ 123 | 🍴 45 | Updated 2h ago"]
            REPO2["📁 garimto81/api-server<br/>⭐ 67 | 🍴 12 | Updated 1d ago"]
            REPO3["📁 team/shared-lib<br/>⭐ 890 | 🍴 234 | Updated 3d ago"]
        end

        subgraph REPO_ACTION["액션"]
            SELECT_BTN["선택하기 →"]
        end
    end

    SEARCH_AREA --> REPO_LIST
    REPO_LIST --> REPO_ACTION

    style REPO1 fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
```

### 4.2 이슈 현황 보드 (2단계 구조)

> **디자인 원칙**: 복잡한 5단계 칸반 대신 **"열림/닫힘"** 2단계로 단순화

```mermaid
flowchart TB
    subgraph ISSUE_BOARD["이슈 현황 보드"]
        subgraph HEADER["프로젝트: my-project"]
            BACK_BTN["← 목록으로"]
            PROJECT_NAME["garimto81/my-project"]
            SYNC_STATUS["🟢 동기화됨"]
        end

        subgraph OPEN_ISSUES["🔴 열린 이슈 (5개) ▼"]
            OPEN1["#12 JWT 만료 버그<br/>🏷️ bug | 🤖 AI 해결 가능"]
            OPEN2["#15 성능 개선 필요<br/>🏷️ enhancement"]
            OPEN3["#18 로그인 UI 개선<br/>🏷️ feature"]
        end

        subgraph CLOSED_ISSUES["🟢 닫힌 이슈 (23개) ▼"]
            CLOSED1["#11 API 응답 지연 ✓<br/>🏷️ bug | 해결됨"]
            CLOSED2["#10 초기 설정 ✓<br/>🏷️ setup | 해결됨"]
        end
    end

    HEADER --> OPEN_ISSUES
    OPEN_ISSUES --> CLOSED_ISSUES

    style OPEN_ISSUES fill:#fee2e2,stroke:#ef4444
    style CLOSED_ISSUES fill:#dcfce7,stroke:#22c55e
    style OPEN1 fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
```

### 4.3 이슈 카드 상세

```mermaid
flowchart TB
    subgraph ISSUE_CARD["이슈 카드"]
        subgraph CARD_HEADER["상단"]
            ISSUE_NUM["#12"]
            STATUS["🔴 열림"]
        end

        subgraph CARD_BODY["본문"]
            TITLE["JWT 만료 버그"]
            DESC["로그인 후 1시간 뒤 자동 로그아웃"]
            LABELS["🏷️ bug | 🏷️ auth | 🏷️ priority-high"]
        end

        subgraph CARD_ACTIONS["액션"]
            RESOLVE_BTN["🤖 AI로 해결"]
            CLOSE_BTN["✓ 닫기"]
            VIEW_BTN["상세 보기 →"]
        end
    end

    CARD_HEADER --> CARD_BODY --> CARD_ACTIONS

    style RESOLVE_BTN fill:#3b82f6,color:#fff
    style CLOSE_BTN fill:#22c55e,color:#fff
```

### 4.4 이슈 상세 화면 (좌우 분할)

> **이슈 클릭 시**: 좌측 이슈 정보 + 우측 코드 다이어그램

```mermaid
flowchart TB
    subgraph ISSUE_DETAIL_SCREEN["이슈 상세 화면"]
        subgraph LEFT_PANEL["왼쪽: 이슈 정보 (40%)"]
            subgraph ISSUE_INFO["이슈 #12"]
                I_TITLE["JWT 만료 버그"]
                I_STATUS["🔴 열림 | 생성: 2일 전"]
                I_DESC["설명:<br/>로그인 후 1시간이 지나면<br/>자동으로 로그아웃됩니다"]
                I_LABELS["🏷️ bug | 🏷️ auth"]
            end

            subgraph ISSUE_ACTIONS["액션"]
                BTN_AI["🤖 AI로 해결하기"]
                BTN_CLOSE["✓ 이슈 닫기"]
                BTN_REOPEN["↩️ 다시 열기"]
            end

            subgraph COMMENTS["💬 댓글 (3)"]
                COMMENT1["@user1: 재현 확인됨"]
                COMMENT2["@bot: 분석 완료"]
            end
        end

        subgraph RIGHT_PANEL["오른쪽: 코드 다이어그램 (60%)"]
            subgraph DIAGRAM["영향 받는 코드"]
                NODE_AUTH["🔴 auth.ts<br/>에러 발생"]
                NODE_JWT["🔴 jwt_helper.ts<br/>수정 필요"]
                NODE_USER["🟢 user.ts<br/>정상"]
                NODE_DB["🟢 db.ts<br/>정상"]
            end
        end
    end

    NODE_AUTH --> NODE_JWT
    NODE_AUTH --> NODE_USER
    NODE_USER --> NODE_DB

    style BTN_AI fill:#3b82f6,color:#fff
    style NODE_AUTH fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style NODE_JWT fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style NODE_USER fill:#dcfce7,stroke:#22c55e
    style NODE_DB fill:#dcfce7,stroke:#22c55e
```

### 4.5 CLI 실시간 진행 표시 (AI 이슈 해결)

> **핵심**: "AI로 해결하기" 클릭 시 실시간으로 진행 과정을 확인

```mermaid
flowchart TB
    subgraph CLI_PROGRESS["🔴 LIVE - AI 이슈 해결 중"]
        subgraph PROGRESS_HEADER["상태"]
            ISSUE_TAG["이슈 #12 해결 중"]
            ELAPSED["⏱️ 경과: 00:45"]
        end

        subgraph PHASES["진행 단계"]
            PHASE1["✅ Phase 1: 분석 완료<br/>영향 파일 3개 확인"]
            PHASE2["✅ Phase 2: 계획 수립<br/>수정 계획 3단계"]
            PHASE3["🔄 Phase 3: 코드 수정 중<br/>━━━━━━━━░░░░ 60%"]
            PHASE4["⏳ Phase 4: 테스트 대기"]
            PHASE5["⏳ Phase 5: PR 생성 대기"]
        end

        subgraph LOG_OUTPUT["실시간 로그"]
            LOG1["> auth.ts:45 수정 중..."]
            LOG2["> JWT 만료 시간 변경"]
            LOG3["> 3600 → 7200"]
        end

        subgraph ACTIONS["액션"]
            PAUSE_BTN["⏸️ 일시정지"]
            CANCEL_BTN["❌ 취소"]
        end
    end

    PROGRESS_HEADER --> PHASES
    PHASES --> LOG_OUTPUT
    LOG_OUTPUT --> ACTIONS

    style PHASE1 fill:#dcfce7
    style PHASE2 fill:#dcfce7
    style PHASE3 fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style PHASE4 fill:#e5e7eb
    style PHASE5 fill:#e5e7eb
    style CLI_PROGRESS fill:#0f172a,color:#fff
```

### 4.6 CLI 진행 완료 및 승인

```mermaid
flowchart TB
    subgraph APPROVAL_SCREEN["🔔 AI 작업 완료 - 승인 요청"]
        subgraph RESULT_SUMMARY["결과 요약"]
            RESULT_TITLE["이슈 #12 해결 완료"]
            RESULT_TIME["⏱️ 소요 시간: 2분 15초"]
        end

        subgraph CHANGES["변경 사항"]
            CHANGE1["📄 auth.ts (+15줄, -3줄)"]
            CHANGE2["📄 jwt_helper.ts (+8줄, -2줄)"]
            CHANGE3["📄 auth.test.ts (+45줄, 신규)"]
        end

        subgraph DIFF_PREVIEW["코드 변경 미리보기"]
            DIFF_OLD["- const expiry = 3600"]
            DIFF_NEW["+ const expiry = 7200"]
        end

        subgraph APPROVAL_ACTIONS["승인"]
            BTN_APPROVE["✅ 승인 (PR 생성)"]
            BTN_EDIT["✏️ 수정 요청"]
            BTN_REJECT["❌ 거부 (롤백)"]
        end
    end

    RESULT_SUMMARY --> CHANGES
    CHANGES --> DIFF_PREVIEW
    DIFF_PREVIEW --> APPROVAL_ACTIONS

    style BTN_APPROVE fill:#22c55e,color:#fff
    style BTN_REJECT fill:#ef4444,color:#fff
    style DIFF_OLD fill:#fee2e2
    style DIFF_NEW fill:#dcfce7
```

### 4.7 코드 다이어그램 (의존성 그래프)

```mermaid
flowchart TB
    subgraph DIAGRAM_PANEL["코드 다이어그램 패널"]
        subgraph TOOLBAR["툴바"]
            ZOOM_IN[🔍+]
            ZOOM_OUT[🔍-]
            FIT[⬜ 맞춤]
            FILTER_TYPE[필터: 파일/함수]
            HIGHLIGHT[🔴 에러만]
        end

        subgraph GRAPH["그래프 영역"]
            subgraph NODES["노드들"]
                NODE_AUTH[auth.ts<br/>🔴 에러 2개]
                NODE_USER[user.ts<br/>🟢 정상]
                NODE_DB[db.ts<br/>🟢 정상]
                NODE_API[api.ts<br/>🟡 경고 1개]
            end
        end

        subgraph LEGEND["범례"]
            LEG1[🟢 정상]
            LEG2[🟡 경고]
            LEG3[🔴 에러]
        end
    end

    NODE_API --> NODE_AUTH
    NODE_API --> NODE_USER
    NODE_AUTH --> NODE_DB
    NODE_USER --> NODE_DB

    style NODE_AUTH fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style NODE_API fill:#fef3c7,stroke:#f59e0b
    style NODE_USER fill:#dcfce7,stroke:#22c55e
    style NODE_DB fill:#dcfce7,stroke:#22c55e
```

### 4.4 웹 터미널

```mermaid
flowchart TB
    subgraph TERMINAL["웹 터미널"]
        subgraph TERM_HEADER["터미널 헤더"]
            TERM_TITLE[AI 터미널]
            MODEL_SELECT[모델: Claude Opus 4.5 ▼]
            CLEAR_BTN[🗑️ 지우기]
            EXPAND_BTN[⬆️ 확장]
        end

        subgraph TERM_OUTPUT["출력 영역 (스크롤)"]
            OUT1[> @claude JWT 만료 버그 수정해줘]
            OUT2[🤖 코드 분석 중...]
            OUT3[📋 수정 계획:<br/>1. auth.ts 수정<br/>2. 테스트 추가]
            OUT4[⏳ 승인 대기 중...]
        end

        subgraph TERM_INPUT["입력 영역"]
            INPUT_FIELD[명령어 입력... (@model 태그 지원)]
            SEND_BTN[전송 ➤]
        end
    end

    TERM_HEADER --> TERM_OUTPUT --> TERM_INPUT

    style OUT4 fill:#fef3c7,stroke:#f59e0b
```

### 4.5 승인 모달

```mermaid
flowchart TB
    subgraph APPROVAL_MODAL["승인 모달"]
        subgraph MODAL_HEADER["헤더"]
            MODAL_ICON[🔔]
            MODAL_TITLE[AI 작업 승인 요청]
            MODAL_PHASE[Phase 2: 코드 리뷰]
        end

        subgraph MODAL_CONTENT["내용"]
            subgraph SUMMARY["요약"]
                SUMMARY_TEXT[auth.ts 파일에서<br/>JWT 만료 로직을 수정했습니다]
            end

            subgraph DIFF["변경 사항 (Diff)"]
                DIFF_OLD[- const expiry = 3600]
                DIFF_NEW[+ const expiry = 7200]
            end

            subgraph FILES["변경 파일"]
                FILE1[📄 src/auth.ts (+15, -3)]
                FILE2[📄 tests/auth.test.ts (+45)]
            end
        end

        subgraph MODAL_ACTIONS["액션 버튼"]
            BTN_APPROVE[✅ 승인]
            BTN_EDIT[✏️ 수정 요청]
            BTN_REJECT[❌ 거부]
        end
    end

    MODAL_HEADER --> MODAL_CONTENT --> MODAL_ACTIONS

    style DIFF_OLD fill:#fee2e2,color:#991b1b
    style DIFF_NEW fill:#dcfce7,color:#166534
    style BTN_APPROVE fill:#22c55e,color:#fff
    style BTN_REJECT fill:#ef4444,color:#fff
```

---

## 5. 사용자 워크플로우

### 5.1 첫 사용자 온보딩 플로우

```mermaid
flowchart TB
    START([첫 방문]) --> LOGIN[로그인 화면]
    LOGIN --> GITHUB_AUTH{GitHub 인증}

    GITHUB_AUTH -->|성공| WELCOME[환영 화면<br/>간단한 투어]
    GITHUB_AUTH -->|실패| LOGIN

    WELCOME --> SELECT_REPO[저장소 선택]
    SELECT_REPO --> SYNC{동기화 중...}

    SYNC -->|완료| DASHBOARD[메인 대시보드]
    SYNC -->|실패| ERROR[에러 안내<br/>재시도 버튼]
    ERROR --> SELECT_REPO

    DASHBOARD --> TOOLTIP[기능 안내 툴팁<br/>단계별 가이드]
    TOOLTIP --> READY([사용 준비 완료])

    style START fill:#22c55e,color:#fff
    style READY fill:#22c55e,color:#fff
    style ERROR fill:#ef4444,color:#fff
```

### 5.2 AI 이슈 해결 플로우 (새 디자인)

> **핵심**: 이슈 선택 → "AI로 해결하기" 클릭 → 실시간 진행 확인 → 승인

```mermaid
flowchart TB
    START([프로젝트 선택]) --> ISSUE_LIST[이슈 목록 확인<br/>🔴 열린 이슈 보기]

    ISSUE_LIST --> SELECT_ISSUE[이슈 #12 클릭<br/>상세 화면 열림]

    SELECT_ISSUE --> DETAIL_VIEW[좌측: 이슈 정보<br/>우측: 코드 다이어그램]

    DETAIL_VIEW --> CLICK_AI["🤖 AI로 해결하기" 클릭]

    CLICK_AI --> REALTIME_START[🔴 LIVE 화면 시작]

    subgraph REALTIME["실시간 진행 표시"]
        REALTIME_START --> PHASE1[✅ 분석 완료]
        PHASE1 --> PHASE2[✅ 계획 수립]
        PHASE2 --> PHASE3[🔄 코드 수정 중...<br/>━━━━━━░░░ 60%]
        PHASE3 --> PHASE4[✅ 테스트 통과]
    end

    PHASE4 --> APPROVAL{{"🔔 승인 요청"}}

    APPROVAL -->|✅ 승인| PR_CREATE[PR #42 생성<br/>이슈 자동 닫힘]
    APPROVAL -->|✏️ 수정| PHASE3
    APPROVAL -->|❌ 거부| ROLLBACK[롤백]

    PR_CREATE --> ISSUE_CLOSED[이슈 #12<br/>열린 이슈 → 닫힌 이슈]

    ISSUE_CLOSED --> DONE([완료])

    style START fill:#3b82f6,color:#fff
    style DONE fill:#22c55e,color:#fff
    style REALTIME fill:#0f172a,color:#fff
    style APPROVAL fill:#fbbf24
    style ROLLBACK fill:#ef4444,color:#fff
```

### 5.3 이슈 관리 워크플로우 (2단계 구조)

> **디자인 원칙**: 복잡한 5단계 대신 **열린 이슈 / 닫힌 이슈** 2단계

```mermaid
flowchart TB
    subgraph SIMPLE_FLOW["이슈 라이프사이클 (단순화)"]
        CREATE[이슈 생성<br/>GitHub에서 또는 직접]

        CREATE --> OPEN[🔴 열린 이슈<br/>해결 필요]

        OPEN --> ACTION{해결 방법}

        ACTION -->|🤖 AI로 해결| AI_PROCESS[AI가 코드 수정<br/>실시간 진행 표시]
        ACTION -->|👤 수동 해결| MANUAL[직접 코드 수정<br/>PR 생성]
        ACTION -->|❌ 닫기| CLOSE_DIRECT[수동으로 닫기]

        AI_PROCESS --> PR[PR 생성 + 승인]
        MANUAL --> PR

        PR --> CLOSED[🟢 닫힌 이슈<br/>해결 완료]
        CLOSE_DIRECT --> CLOSED

        CLOSED --> REOPEN{다시 열기?}
        REOPEN -->|↩️ 재오픈| OPEN
    end

    style OPEN fill:#fee2e2,stroke:#ef4444
    style CLOSED fill:#dcfce7,stroke:#22c55e
    style AI_PROCESS fill:#dbeafe,stroke:#3b82f6
```

### 5.4 전체 사용자 여정 (End-to-End)

```mermaid
flowchart TB
    subgraph JOURNEY["전체 사용자 여정"]
        J1[🔐 GitHub 로그인]
        J2[📁 프로젝트 선택<br/>검색 + 필터]
        J3[📋 이슈 목록 확인<br/>열린 이슈 / 닫힌 이슈]
        J4[👆 이슈 클릭<br/>상세 + 다이어그램]
        J5[🤖 "AI로 해결" 클릭]
        J6[🔴 실시간 진행 확인<br/>분석 → 수정 → 테스트]
        J7[✅ 승인<br/>PR 생성]
        J8[🟢 이슈 닫힘<br/>완료]
    end

    J1 --> J2 --> J3 --> J4 --> J5 --> J6 --> J7 --> J8

    style J1 fill:#e5e7eb
    style J5 fill:#3b82f6,color:#fff
    style J6 fill:#0f172a,color:#fff
    style J8 fill:#22c55e,color:#fff
```

### 5.5 에러 추적 워크플로우

```mermaid
flowchart TB
    subgraph ERROR_FLOW["에러 발견 및 해결"]
        CI_FAIL[CI/CD 실패 알림] --> DIAGRAM_UPDATE[다이어그램 업데이트<br/>노드 빨간색으로 변경]

        DIAGRAM_UPDATE --> CLICK_NODE[사용자가 빨간 노드 클릭]

        CLICK_NODE --> ERROR_DETAIL[에러 상세 팝업<br/>- 에러 메시지<br/>- 발생 위치<br/>- AI 분석]

        ERROR_DETAIL --> ACTION{사용자 선택}

        ACTION -->|AI 수정 요청| TERMINAL[터미널로 이동<br/>명령어 자동 완성]
        ACTION -->|이슈 생성| NEW_ISSUE[GitHub 이슈 생성<br/>에러 정보 자동 포함]
        ACTION -->|무시| DISMISS[팝업 닫기]

        TERMINAL --> AI_FIX[AI 수정 플로우 시작]
        NEW_ISSUE --> KANBAN[칸반에 카드 추가]
    end

    style CI_FAIL fill:#fee2e2,stroke:#ef4444
    style DIAGRAM_UPDATE fill:#fee2e2
    style AI_FIX fill:#dcfce7
```

---

## 6. 상태별 UI 변화

### 6.1 터미널 상태 표시

```mermaid
flowchart TB
    subgraph STATES["터미널 상태"]
        IDLE[⚪ 대기 중<br/>입력 가능]
        LOADING[🔵 처리 중<br/>로딩 스피너]
        STREAMING[🟢 스트리밍<br/>실시간 출력]
        WAITING[🟡 승인 대기<br/>버튼 활성화]
        ERROR[🔴 에러 발생<br/>재시도 버튼]
        SUCCESS[✅ 완료<br/>결과 표시]
    end

    IDLE --> LOADING
    LOADING --> STREAMING
    STREAMING --> WAITING
    WAITING --> STREAMING
    WAITING --> SUCCESS
    LOADING --> ERROR
    ERROR --> IDLE
    SUCCESS --> IDLE

    style IDLE fill:#e5e7eb
    style LOADING fill:#dbeafe
    style STREAMING fill:#dcfce7
    style WAITING fill:#fef3c7
    style ERROR fill:#fee2e2
    style SUCCESS fill:#dcfce7
```

### 6.2 이슈 카드 상태 표시

```mermaid
flowchart TB
    subgraph CARD_STATES["카드 상태별 스타일"]
        subgraph NORMAL["기본 상태"]
            CARD_NORMAL[이슈 #1<br/>일반 작업<br/>흰색 배경]
        end

        subgraph AI_WORKING["AI 작업 중"]
            CARD_AI[이슈 #2<br/>🤖 AI 작업 중<br/>노란색 테두리<br/>펄스 애니메이션]
        end

        subgraph BLOCKED["차단됨"]
            CARD_BLOCKED[이슈 #3<br/>⛔ 차단됨<br/>빨간색 테두리]
        end

        subgraph HAS_PR["PR 있음"]
            CARD_PR[이슈 #4<br/>✅ PR #42<br/>파란색 배지]
        end
    end

    style CARD_NORMAL fill:#ffffff,stroke:#e5e7eb
    style CARD_AI fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style CARD_BLOCKED fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style CARD_PR fill:#dbeafe,stroke:#3b82f6
```

### 6.3 노드 상태 표시 (코드 다이어그램)

```mermaid
flowchart TB
    subgraph NODE_STATES["노드 상태"]
        subgraph HEALTHY["정상"]
            NODE_OK[파일명.ts<br/>🟢<br/>녹색 테두리]
        end

        subgraph WARNING["경고"]
            NODE_WARN[파일명.ts<br/>🟡<br/>노란색 테두리<br/>경고 1개]
        end

        subgraph ERROR["에러"]
            NODE_ERR[파일명.ts<br/>🔴<br/>빨간색 테두리<br/>펄스 애니메이션]
        end

        subgraph SELECTED["선택됨"]
            NODE_SEL[파일명.ts<br/>🔵<br/>파란색 강조<br/>굵은 테두리]
        end

        subgraph UPDATING["업데이트 중"]
            NODE_UPD[파일명.ts<br/>⚪<br/>점멸 애니메이션]
        end
    end

    style NODE_OK fill:#dcfce7,stroke:#22c55e,stroke-width:2px
    style NODE_WARN fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style NODE_ERR fill:#fee2e2,stroke:#ef4444,stroke-width:3px
    style NODE_SEL fill:#dbeafe,stroke:#3b82f6,stroke-width:3px
    style NODE_UPD fill:#f3f4f6,stroke:#9ca3af,stroke-dasharray:5
```

---

## 7. 인터랙션 패턴

### 7.1 드래그 앤 드롭 (칸반)

```mermaid
sequenceDiagram
    participant U as 사용자
    participant K as 칸반 보드
    participant S as 서버
    participant G as GitHub

    U->>K: 카드 드래그 시작
    K->>K: 드래그 미리보기 표시
    U->>K: 다른 컬럼에 드롭
    K->>K: 낙관적 UI 업데이트
    K->>S: 상태 변경 요청
    S->>G: GitHub 라벨 업데이트
    G-->>S: 성공 응답
    S-->>K: 확인 응답
    K->>K: UI 확정

    Note over K: 실패 시 롤백 + 토스트 알림
```

### 7.2 노드 클릭 인터랙션

```mermaid
sequenceDiagram
    participant U as 사용자
    participant D as 다이어그램
    participant P as 상세 패널
    participant T as 터미널

    U->>D: 노드 클릭
    D->>D: 노드 하이라이트
    D->>P: 파일 정보 전달
    P->>P: 파일 내용 표시

    alt 에러 노드인 경우
        P->>P: 에러 상세 표시
        P->>P: "AI 수정" 버튼 표시
        U->>P: "AI 수정" 클릭
        P->>T: 명령어 자동 완성
        T->>T: 포커스 이동
    end
```

### 7.3 실시간 스트리밍

```mermaid
sequenceDiagram
    participant U as 사용자
    participant T as 터미널
    participant S as 서버 (SSE)
    participant A as AI 에이전트

    U->>T: 명령 입력
    T->>S: POST /agent/command
    S->>A: 에이전트 실행
    S-->>T: 세션 ID 반환
    T->>S: GET /agent/stream (SSE 연결)

    loop 스트리밍
        A->>S: 출력 생성
        S-->>T: SSE 이벤트
        T->>T: 텍스트 렌더링
    end

    A->>S: 승인 필요
    S-->>T: 승인 이벤트
    T->>T: 승인 모달 표시
    U->>T: 승인 클릭
    T->>S: POST /agent/approve
    S->>A: 승인 전달
    A->>S: 계속 실행
```

---

## 8. 알림 및 피드백 시스템

### 8.1 알림 유형

```mermaid
flowchart TB
    subgraph NOTIFICATIONS["알림 시스템"]
        subgraph TOAST["토스트 메시지 (일시적)"]
            TOAST_SUCCESS[✅ 성공<br/>녹색, 3초 후 사라짐]
            TOAST_ERROR[❌ 에러<br/>빨간색, 수동 닫기]
            TOAST_INFO[ℹ️ 정보<br/>파란색, 5초 후 사라짐]
        end

        subgraph MODAL["모달 (즉시 응답 필요)"]
            MODAL_APPROVE[🔔 승인 요청<br/>버튼 클릭 필수]
            MODAL_CONFIRM[⚠️ 확인<br/>예/아니오]
            MODAL_ERROR[🚨 심각한 에러<br/>상세 정보 + 액션]
        end

        subgraph BADGE["배지 (지속적)"]
            BADGE_COUNT[🔔 3<br/>읽지 않은 알림]
            BADGE_STATUS[🟢 동기화됨<br/>상태 표시]
        end
    end

    style TOAST_SUCCESS fill:#dcfce7
    style TOAST_ERROR fill:#fee2e2
    style TOAST_INFO fill:#dbeafe
    style MODAL_APPROVE fill:#fef3c7
```

### 8.2 로딩 상태 표시

```mermaid
flowchart TB
    subgraph LOADING_TYPES["로딩 표시 유형"]
        SPINNER[스피너<br/>짧은 작업]
        PROGRESS[진행 바<br/>예상 시간 있음]
        SKELETON[스켈레톤<br/>콘텐츠 로딩]
        PULSE[펄스<br/>백그라운드 작업]
    end

    SPINNER --> |"< 3초"| SHORT[짧은 API 호출]
    PROGRESS --> |"3-30초"| MEDIUM[파일 동기화]
    SKELETON --> |"초기 로딩"| INITIAL[페이지 로드]
    PULSE --> |"비동기"| ASYNC[AI 작업 중]
```

---

## 9. 다크 모드 지원

### 9.1 색상 팔레트 비교

```mermaid
flowchart TB
    subgraph LIGHT["라이트 모드"]
        L_BG[배경: #ffffff]
        L_TEXT[텍스트: #1f2937]
        L_BORDER[테두리: #e5e7eb]
        L_PRIMARY[강조: #3b82f6]
    end

    subgraph DARK["다크 모드"]
        D_BG[배경: #0f172a]
        D_TEXT[텍스트: #f1f5f9]
        D_BORDER[테두리: #334155]
        D_PRIMARY[강조: #60a5fa]
    end

    style L_BG fill:#ffffff,color:#000
    style L_TEXT fill:#1f2937,color:#fff
    style D_BG fill:#0f172a,color:#fff
    style D_TEXT fill:#f1f5f9,color:#000
```

---

## 10. 접근성 (Accessibility)

### 10.1 키보드 네비게이션

| 키 | 동작 |
|---|------|
| `Tab` | 다음 요소로 이동 |
| `Shift + Tab` | 이전 요소로 이동 |
| `Enter` | 선택/실행 |
| `Escape` | 모달 닫기 / 취소 |
| `Arrow Keys` | 칸반 카드 이동 |
| `Ctrl + /` | 터미널 포커스 |
| `Ctrl + K` | 명령 팔레트 열기 |

### 10.2 스크린 리더 지원

```mermaid
flowchart TB
    subgraph ARIA["ARIA 레이블"]
        LABEL1[aria-label<br/>버튼 설명]
        LABEL2[aria-live<br/>실시간 업데이트]
        LABEL3[aria-expanded<br/>확장 상태]
        LABEL4[role<br/>역할 정의]
    end
```

---

## 11. 성능 최적화 가이드라인

### 11.1 렌더링 최적화

```mermaid
flowchart TB
    subgraph PERFORMANCE["성능 최적화"]
        subgraph LAZY["지연 로딩"]
            LAZY1[코드 분할<br/>라우트별]
            LAZY2[이미지 지연 로딩]
            LAZY3[무한 스크롤]
        end

        subgraph CACHE["캐싱"]
            CACHE1[API 응답 캐시<br/>React Query]
            CACHE2[다이어그램 캐시]
            CACHE3[로컬 스토리지]
        end

        subgraph VIRTUAL["가상화"]
            VIRTUAL1[칸반 카드 가상화<br/>100개+ 대응]
            VIRTUAL2[터미널 버퍼 제한<br/>최대 10,000줄]
        end
    end
```

---

## 12. 에러 화면

### 12.1 에러 페이지 유형

```mermaid
flowchart TB
    subgraph ERROR_PAGES["에러 페이지"]
        subgraph E404["404 Not Found"]
            E404_ICON[🔍]
            E404_MSG[페이지를 찾을 수 없습니다]
            E404_BTN[홈으로 돌아가기]
        end

        subgraph E500["500 Server Error"]
            E500_ICON[⚠️]
            E500_MSG[서버 오류가 발생했습니다]
            E500_BTN[다시 시도 / 문의하기]
        end

        subgraph OFFLINE["오프라인"]
            OFF_ICON[📡]
            OFF_MSG[인터넷 연결을 확인해주세요]
            OFF_BTN[다시 연결]
        end

        subgraph AUTH_ERROR["인증 만료"]
            AUTH_ICON[🔒]
            AUTH_MSG[세션이 만료되었습니다]
            AUTH_BTN[다시 로그인]
        end
    end

    style E404 fill:#fef3c7
    style E500 fill:#fee2e2
    style OFFLINE fill:#e5e7eb
    style AUTH_ERROR fill:#dbeafe
```

---

## 13. References

### 관련 문서

| 문서 | 설명 |
|------|------|
| `0002-prd-gitcommand-center-v2.md` | 제품 요구사항 정의서 |
| `prd_v02.md` | 프랑켄슈타인 전략 원본 |

### 디자인 참조

| 참조 | 용도 |
|------|------|
| Tailwind CSS | 색상 팔레트, 간격 |
| Shadcn UI | 컴포넌트 스타일 |
| OpenHands UI | 터미널 레이아웃 참조 |
| Linear | 칸반 보드 UX 참조 |
| GitHub | 이슈 카드 디자인 참조 |

---

**Next Steps**:
1. Figma/Penpot으로 실제 UI 목업 제작
2. 컴포넌트 라이브러리 선정 (Shadcn UI 권장)
3. 프로토타입 개발 시작
