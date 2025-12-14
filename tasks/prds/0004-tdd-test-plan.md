# GitCommand Center: TDD 테스트 계획서

**Version**: 1.2
**Date**: 2025-12-14
**Status**: Draft
**Related**: 0002-prd-gitcommand-center-v2.md, 0003-ui-design-workflow.md

---

## 문서 작성 지침

> **Mermaid 다이어그램 규칙**: 모든 워크플로우는 **세로 방향(TB: Top to Bottom)**으로 작성합니다.
>
> ```
> ✅ 권장: flowchart TB (세로)
> ❌ 금지: flowchart LR (가로)
> ```

---

## 1. 테스트 전략 개요

### 1.1 TDD 원칙

```mermaid
flowchart TB
    subgraph TDD_CYCLE["TDD 사이클"]
        RED["🔴 RED<br/>실패하는 테스트 작성"]
        GREEN["🟢 GREEN<br/>테스트 통과하는 최소 코드"]
        REFACTOR["♻️ REFACTOR<br/>코드 개선"]

        RED --> GREEN
        GREEN --> REFACTOR
        REFACTOR --> RED
    end
```

### 1.2 테스트 범위

```mermaid
flowchart TB
    subgraph TEST_SCOPE["테스트 범위"]
        subgraph UNIT["단위 테스트"]
            U1[인증 서비스]
            U2[이슈 관리]
            U3[AI 에이전트]
            U4[코드 분석기]
        end

        subgraph INTEGRATION["통합 테스트"]
            I1[GitHub API 연동]
            I2[AI 모델 통신]
            I3[실시간 스트리밍]
        end

        subgraph E2E["E2E 테스트 (Playwright)"]
            E1[로그인 플로우]
            E2[이슈 해결 플로우]
            E3[실시간 진행 표시]
        end
    end

    UNIT --> INTEGRATION --> E2E
```

---

## 2. 핵심 기능별 테스트 목록

### 2.1 인증 (Authentication)

```mermaid
flowchart TB
    subgraph AUTH_TESTS["🔐 인증 테스트"]
        subgraph AUTH_UNIT["단위 테스트"]
            AU1["test_github_oauth_url_generation<br/>OAuth URL 생성 검증"]
            AU2["test_github_callback_token_exchange<br/>토큰 교환 검증"]
            AU3["test_jwt_token_creation<br/>JWT 생성 검증"]
            AU4["test_jwt_token_validation<br/>JWT 검증"]
            AU5["test_jwt_token_expiry<br/>JWT 만료 검증"]
            AU6["test_user_session_creation<br/>세션 생성 검증"]
        end

        subgraph AUTH_E2E["E2E 테스트"]
            AE1["test_login_flow_success<br/>로그인 성공 플로우"]
            AE2["test_login_flow_cancel<br/>로그인 취소"]
            AE3["test_logout_flow<br/>로그아웃 플로우"]
            AE4["test_session_expired_redirect<br/>세션 만료 시 리다이렉트"]
        end
    end

    AUTH_UNIT --> AUTH_E2E
```

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| AUTH-U01 | `test_github_oauth_url_generation` | 단위 | P0 |
| AUTH-U02 | `test_github_callback_token_exchange` | 단위 | P0 |
| AUTH-U03 | `test_jwt_token_creation` | 단위 | P0 |
| AUTH-U04 | `test_jwt_token_validation` | 단위 | P0 |
| AUTH-U05 | `test_jwt_token_expiry` | 단위 | P1 |
| AUTH-U06 | `test_user_session_creation` | 단위 | P1 |
| AUTH-E01 | `test_login_flow_success` | E2E | P0 |
| AUTH-E02 | `test_login_flow_cancel` | E2E | P1 |
| AUTH-E03 | `test_logout_flow` | E2E | P1 |
| AUTH-E04 | `test_session_expired_redirect` | E2E | P1 |

---

### 2.2 프로젝트 관리 (Repository)

```mermaid
flowchart TB
    subgraph REPO_TESTS["📁 프로젝트 관리 테스트"]
        subgraph REPO_UNIT["단위 테스트"]
            RU1["test_fetch_user_repositories<br/>저장소 목록 조회"]
            RU2["test_repository_search_filter<br/>저장소 검색/필터"]
            RU3["test_repository_sync_status<br/>동기화 상태 확인"]
            RU4["test_repository_metadata_parse<br/>메타데이터 파싱"]
        end

        subgraph REPO_INTEG["통합 테스트"]
            RI1["test_github_api_repository_list<br/>GitHub API 연동"]
            RI2["test_repository_webhook_setup<br/>웹훅 설정"]
        end

        subgraph REPO_E2E["E2E 테스트"]
            RE1["test_project_list_display<br/>프로젝트 목록 표시"]
            RE2["test_project_search<br/>검색 기능"]
            RE3["test_project_selection<br/>프로젝트 선택"]
        end
    end

    REPO_UNIT --> REPO_INTEG --> REPO_E2E
```

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| REPO-U01 | `test_fetch_user_repositories` | 단위 | P0 |
| REPO-U02 | `test_repository_search_filter` | 단위 | P0 |
| REPO-U03 | `test_repository_sync_status` | 단위 | P1 |
| REPO-U04 | `test_repository_metadata_parse` | 단위 | P1 |
| REPO-I01 | `test_github_api_repository_list` | 통합 | P0 |
| REPO-I02 | `test_repository_webhook_setup` | 통합 | P1 |
| REPO-E01 | `test_project_list_display` | E2E | P0 |
| REPO-E02 | `test_project_search` | E2E | P0 |
| REPO-E03 | `test_project_selection` | E2E | P0 |

---

### 2.3 이슈 관리 (Issue Management)

```mermaid
flowchart TB
    subgraph ISSUE_TESTS["📋 이슈 관리 테스트"]
        subgraph ISSUE_UNIT["단위 테스트"]
            IU1["test_fetch_open_issues<br/>열린 이슈 조회"]
            IU2["test_fetch_closed_issues<br/>닫힌 이슈 조회"]
            IU3["test_issue_close<br/>이슈 닫기"]
            IU4["test_issue_reopen<br/>이슈 다시 열기"]
            IU5["test_issue_label_parse<br/>라벨 파싱"]
            IU6["test_issue_priority_sort<br/>우선순위 정렬"]
        end

        subgraph ISSUE_INTEG["통합 테스트"]
            II1["test_github_issue_api<br/>GitHub Issue API"]
            II2["test_issue_state_sync<br/>상태 동기화"]
        end

        subgraph ISSUE_E2E["E2E 테스트"]
            IE1["test_open_issues_accordion<br/>열린 이슈 아코디언"]
            IE2["test_closed_issues_accordion<br/>닫힌 이슈 아코디언"]
            IE3["test_issue_click_detail_view<br/>이슈 클릭 → 상세 화면"]
            IE4["test_issue_close_button<br/>이슈 닫기 버튼"]
            IE5["test_issue_reopen_button<br/>이슈 다시 열기 버튼"]
        end
    end

    ISSUE_UNIT --> ISSUE_INTEG --> ISSUE_E2E
```

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| ISSUE-U01 | `test_fetch_open_issues` | 단위 | P0 |
| ISSUE-U02 | `test_fetch_closed_issues` | 단위 | P0 |
| ISSUE-U03 | `test_issue_close` | 단위 | P0 |
| ISSUE-U04 | `test_issue_reopen` | 단위 | P0 |
| ISSUE-U05 | `test_issue_label_parse` | 단위 | P1 |
| ISSUE-U06 | `test_issue_priority_sort` | 단위 | P1 |
| ISSUE-I01 | `test_github_issue_api` | 통합 | P0 |
| ISSUE-I02 | `test_issue_state_sync` | 통합 | P1 |
| ISSUE-E01 | `test_open_issues_accordion` | E2E | P0 |
| ISSUE-E02 | `test_closed_issues_accordion` | E2E | P0 |
| ISSUE-E03 | `test_issue_click_detail_view` | E2E | P0 |
| ISSUE-E04 | `test_issue_close_button` | E2E | P0 |
| ISSUE-E05 | `test_issue_reopen_button` | E2E | P0 |

---

### 2.4 AI 이슈 해결 (AI Issue Resolution)

```mermaid
flowchart TB
    subgraph AI_TESTS["🤖 AI 이슈 해결 테스트"]
        subgraph AI_UNIT["단위 테스트"]
            AIU1["test_ai_analyze_issue<br/>이슈 분석"]
            AIU2["test_ai_generate_plan<br/>계획 생성"]
            AIU3["test_ai_code_modification<br/>코드 수정"]
            AIU4["test_ai_test_generation<br/>테스트 생성"]
            AIU5["test_ai_pr_creation<br/>PR 생성"]
        end

        subgraph AI_INTEG["통합 테스트"]
            AII1["test_aider_subprocess_execution<br/>Aider 실행"]
            AII2["test_ai_model_api_call<br/>AI 모델 API 호출"]
            AII3["test_langgraph_workflow<br/>LangGraph 워크플로우"]
        end

        subgraph AI_E2E["E2E 테스트"]
            AIE1["test_ai_resolve_button_click<br/>'AI로 해결' 버튼 클릭"]
            AIE2["test_ai_progress_display<br/>실시간 진행 표시"]
            AIE3["test_ai_approval_flow<br/>승인 플로우"]
            AIE4["test_ai_rollback<br/>롤백 기능"]
        end
    end

    AI_UNIT --> AI_INTEG --> AI_E2E
```

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| AI-U01 | `test_ai_analyze_issue` | 단위 | P0 |
| AI-U02 | `test_ai_generate_plan` | 단위 | P0 |
| AI-U03 | `test_ai_code_modification` | 단위 | P0 |
| AI-U04 | `test_ai_test_generation` | 단위 | P1 |
| AI-U05 | `test_ai_pr_creation` | 단위 | P0 |
| AI-I01 | `test_aider_subprocess_execution` | 통합 | P0 |
| AI-I02 | `test_ai_model_api_call` | 통합 | P0 |
| AI-I03 | `test_langgraph_workflow` | 통합 | P0 |
| AI-E01 | `test_ai_resolve_button_click` | E2E | P0 |
| AI-E02 | `test_ai_progress_display` | E2E | P0 |
| AI-E03 | `test_ai_approval_flow` | E2E | P0 |
| AI-E04 | `test_ai_rollback` | E2E | P1 |

---

### 2.5 AI CLI 연동 (AI CLI Integration)

> **구독 기반 AI CLI**: Claude Opus 4.5, GPT 5.2 Codex, Gemini 3.0, Qwen CLI

```mermaid
flowchart TB
    subgraph CLI_TESTS["🖥️ AI CLI 연동 테스트"]
        subgraph CLI_UNIT["단위 테스트"]
            CLIU1["test_claude_cli_available<br/>Claude CLI 설치 확인"]
            CLIU2["test_gpt_codex_cli_available<br/>GPT Codex CLI 설치 확인"]
            CLIU3["test_gemini_cli_available<br/>Gemini CLI 설치 확인"]
            CLIU4["test_qwen_cli_available<br/>Qwen CLI 설치 확인"]
            CLIU5["test_cli_command_parse<br/>CLI 명령어 파싱"]
            CLIU6["test_cli_output_parse<br/>CLI 출력 파싱"]
        end

        subgraph CLI_INTEG["통합 테스트"]
            CLII1["test_claude_cli_code_generation<br/>Claude CLI 코드 생성"]
            CLII2["test_gpt_codex_cli_code_generation<br/>GPT Codex CLI 코드 생성"]
            CLII3["test_gemini_cli_code_generation<br/>Gemini CLI 코드 생성"]
            CLII4["test_qwen_cli_code_generation<br/>Qwen CLI 코드 생성"]
            CLII5["test_cli_streaming_output<br/>CLI 스트리밍 출력"]
            CLII6["test_cli_error_handling<br/>CLI 에러 처리"]
            CLII7["test_cli_timeout_handling<br/>CLI 타임아웃 처리"]
        end

        subgraph CLI_E2E["E2E 테스트"]
            CLIE1["test_model_selection_dropdown<br/>모델 선택 드롭다운"]
            CLIE2["test_claude_issue_resolution<br/>Claude로 이슈 해결"]
            CLIE3["test_gpt_issue_resolution<br/>GPT로 이슈 해결"]
            CLIE4["test_gemini_issue_resolution<br/>Gemini로 이슈 해결"]
            CLIE5["test_model_fallback<br/>모델 폴백 (실패 시 대체)"]
        end
    end

    CLI_UNIT --> CLI_INTEG --> CLI_E2E
```

#### CLI 명령어 형식

| AI 모델 | CLI 명령어 | 용도 |
|---------|-----------|------|
| **Claude Opus 4.5** | `claude code` | 코드 생성, 분석, 수정 |
| **GPT 5.2 Codex** | `codex` | 코드 생성, 자동완성 |
| **Gemini 3.0** | `gemini` | 코드 분석, 리뷰 |
| **Qwen CLI** | `qwen` | 로컬/클라우드 코드 생성 |

#### 테스트 케이스 상세

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| CLI-U01 | `test_claude_cli_available` | 단위 | P0 |
| CLI-U02 | `test_gpt_codex_cli_available` | 단위 | P0 |
| CLI-U03 | `test_gemini_cli_available` | 단위 | P0 |
| CLI-U04 | `test_qwen_cli_available` | 단위 | P1 |
| CLI-U05 | `test_cli_command_parse` | 단위 | P0 |
| CLI-U06 | `test_cli_output_parse` | 단위 | P0 |
| CLI-I01 | `test_claude_cli_code_generation` | 통합 | P0 |
| CLI-I02 | `test_gpt_codex_cli_code_generation` | 통합 | P0 |
| CLI-I03 | `test_gemini_cli_code_generation` | 통합 | P0 |
| CLI-I04 | `test_qwen_cli_code_generation` | 통합 | P1 |
| CLI-I05 | `test_cli_streaming_output` | 통합 | P0 |
| CLI-I06 | `test_cli_error_handling` | 통합 | P0 |
| CLI-I07 | `test_cli_timeout_handling` | 통합 | P1 |
| CLI-E01 | `test_model_selection_dropdown` | E2E | P0 |
| CLI-E02 | `test_claude_issue_resolution` | E2E | P0 |
| CLI-E03 | `test_gpt_issue_resolution` | E2E | P0 |
| CLI-E04 | `test_gemini_issue_resolution` | E2E | P0 |
| CLI-E05 | `test_model_fallback` | E2E | P1 |

#### CLI 실행 검증 흐름

```mermaid
flowchart TB
    subgraph CLI_VERIFY["CLI 실행 검증"]
        CHECK_INSTALL["CLI 설치 확인<br/>which claude / codex / gemini"]

        CHECK_INSTALL --> CHECK_AUTH["인증 상태 확인<br/>구독 활성화 여부"]

        CHECK_AUTH --> EXECUTE["CLI 명령 실행<br/>코드 생성 요청"]

        EXECUTE --> STREAM["스트리밍 출력 수신<br/>실시간 표시"]

        STREAM --> PARSE["출력 파싱<br/>코드 블록 추출"]

        PARSE --> APPLY["코드 적용<br/>파일 수정"]
    end

    style CHECK_INSTALL fill:#dbeafe
    style EXECUTE fill:#fef3c7
    style APPLY fill:#dcfce7
```

#### 모델별 테스트 시나리오

```mermaid
flowchart TB
    subgraph SCENARIO["모델별 테스트 시나리오"]
        subgraph CLAUDE_TEST["Claude Opus 4.5 테스트"]
            CT1["이슈 분석 요청"]
            CT2["코드 수정 생성"]
            CT3["테스트 코드 생성"]
        end

        subgraph GPT_TEST["GPT 5.2 Codex 테스트"]
            GT1["코드 자동완성"]
            GT2["함수 생성"]
            GT3["리팩토링 제안"]
        end

        subgraph GEMINI_TEST["Gemini 3.0 테스트"]
            GEM1["코드 리뷰"]
            GEM2["버그 분석"]
            GEM3["최적화 제안"]
        end

        subgraph QWEN_TEST["Qwen 테스트"]
            QT1["로컬 코드 생성"]
            QT2["오프라인 분석"]
        end
    end

    CT1 --> CT2 --> CT3
    GT1 --> GT2 --> GT3
    GEM1 --> GEM2 --> GEM3
    QT1 --> QT2

    style CLAUDE_TEST fill:#dbeafe
    style GPT_TEST fill:#dcfce7
    style GEMINI_TEST fill:#fef3c7
    style QWEN_TEST fill:#f3e8ff
```

---

### 2.6 실시간 진행 표시 (Real-time Progress)

```mermaid
flowchart TB
    subgraph REALTIME_TESTS["🔴 실시간 진행 표시 테스트"]
        subgraph RT_UNIT["단위 테스트"]
            RTU1["test_sse_event_generation<br/>SSE 이벤트 생성"]
            RTU2["test_progress_phase_update<br/>단계 업데이트"]
            RTU3["test_progress_percentage_calc<br/>진행률 계산"]
            RTU4["test_log_message_format<br/>로그 메시지 포맷"]
        end

        subgraph RT_INTEG["통합 테스트"]
            RTI1["test_sse_connection<br/>SSE 연결"]
            RTI2["test_sse_streaming<br/>SSE 스트리밍"]
            RTI3["test_sse_reconnection<br/>SSE 재연결"]
        end

        subgraph RT_E2E["E2E 테스트"]
            RTE1["test_live_indicator_display<br/>🔴 LIVE 표시"]
            RTE2["test_progress_bar_animation<br/>진행 바 애니메이션"]
            RTE3["test_phase_checklist_update<br/>단계 체크리스트 업데이트"]
            RTE4["test_realtime_log_scroll<br/>실시간 로그 스크롤"]
            RTE5["test_pause_resume_buttons<br/>일시정지/재개 버튼"]
        end
    end

    RT_UNIT --> RT_INTEG --> RT_E2E
```

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| RT-U01 | `test_sse_event_generation` | 단위 | P0 |
| RT-U02 | `test_progress_phase_update` | 단위 | P0 |
| RT-U03 | `test_progress_percentage_calc` | 단위 | P1 |
| RT-U04 | `test_log_message_format` | 단위 | P1 |
| RT-I01 | `test_sse_connection` | 통합 | P0 |
| RT-I02 | `test_sse_streaming` | 통합 | P0 |
| RT-I03 | `test_sse_reconnection` | 통합 | P1 |
| RT-E01 | `test_live_indicator_display` | E2E | P0 |
| RT-E02 | `test_progress_bar_animation` | E2E | P0 |
| RT-E03 | `test_phase_checklist_update` | E2E | P0 |
| RT-E04 | `test_realtime_log_scroll` | E2E | P1 |
| RT-E05 | `test_pause_resume_buttons` | E2E | P1 |

---

### 2.7 코드 다이어그램 (Code Diagram)

```mermaid
flowchart TB
    subgraph DIAGRAM_TESTS["📊 코드 다이어그램 테스트"]
        subgraph DG_UNIT["단위 테스트"]
            DGU1["test_dependency_graph_build<br/>의존성 그래프 생성"]
            DGU2["test_node_status_color<br/>노드 상태 색상"]
            DGU3["test_error_node_highlight<br/>에러 노드 하이라이트"]
            DGU4["test_tree_sitter_parse<br/>Tree-sitter 파싱"]
        end

        subgraph DG_INTEG["통합 테스트"]
            DGI1["test_react_flow_render<br/>React Flow 렌더링"]
            DGI2["test_ci_log_parse<br/>CI 로그 파싱"]
        end

        subgraph DG_E2E["E2E 테스트"]
            DGE1["test_diagram_display<br/>다이어그램 표시"]
            DGE2["test_node_click_interaction<br/>노드 클릭 인터랙션"]
            DGE3["test_zoom_pan_controls<br/>줌/패닝 컨트롤"]
            DGE4["test_error_node_popup<br/>에러 노드 팝업"]
        end
    end

    DG_UNIT --> DG_INTEG --> DG_E2E
```

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| DG-U01 | `test_dependency_graph_build` | 단위 | P0 |
| DG-U02 | `test_node_status_color` | 단위 | P0 |
| DG-U03 | `test_error_node_highlight` | 단위 | P0 |
| DG-U04 | `test_tree_sitter_parse` | 단위 | P1 |
| DG-I01 | `test_react_flow_render` | 통합 | P0 |
| DG-I02 | `test_ci_log_parse` | 통합 | P1 |
| DG-E01 | `test_diagram_display` | E2E | P0 |
| DG-E02 | `test_node_click_interaction` | E2E | P0 |
| DG-E03 | `test_zoom_pan_controls` | E2E | P1 |
| DG-E04 | `test_error_node_popup` | E2E | P0 |

---

### 2.8 승인 플로우 (Approval Flow)

```mermaid
flowchart TB
    subgraph APPROVAL_TESTS["✅ 승인 플로우 테스트"]
        subgraph AP_UNIT["단위 테스트"]
            APU1["test_approval_request_create<br/>승인 요청 생성"]
            APU2["test_approval_status_update<br/>승인 상태 업데이트"]
            APU3["test_diff_generation<br/>Diff 생성"]
            APU4["test_rollback_execution<br/>롤백 실행"]
        end

        subgraph AP_INTEG["통합 테스트"]
            API1["test_langgraph_hitl_interrupt<br/>HITL 인터럽트"]
            API2["test_git_branch_creation<br/>Git 브랜치 생성"]
            API3["test_pr_auto_creation<br/>PR 자동 생성"]
        end

        subgraph AP_E2E["E2E 테스트"]
            APE1["test_approval_modal_display<br/>승인 모달 표시"]
            APE2["test_diff_preview_display<br/>Diff 미리보기"]
            APE3["test_approve_button<br/>승인 버튼"]
            APE4["test_reject_button<br/>거부 버튼"]
            APE5["test_edit_request_button<br/>수정 요청 버튼"]
        end
    end

    AP_UNIT --> AP_INTEG --> AP_E2E
```

| 테스트 ID | 테스트명 | 유형 | 우선순위 |
|-----------|----------|------|----------|
| AP-U01 | `test_approval_request_create` | 단위 | P0 |
| AP-U02 | `test_approval_status_update` | 단위 | P0 |
| AP-U03 | `test_diff_generation` | 단위 | P0 |
| AP-U04 | `test_rollback_execution` | 단위 | P0 |
| AP-I01 | `test_langgraph_hitl_interrupt` | 통합 | P0 |
| AP-I02 | `test_git_branch_creation` | 통합 | P0 |
| AP-I03 | `test_pr_auto_creation` | 통합 | P0 |
| AP-E01 | `test_approval_modal_display` | E2E | P0 |
| AP-E02 | `test_diff_preview_display` | E2E | P0 |
| AP-E03 | `test_approve_button` | E2E | P0 |
| AP-E04 | `test_reject_button` | E2E | P0 |
| AP-E05 | `test_edit_request_button` | E2E | P1 |

---

## 3. 테스트 우선순위 요약

### 3.1 P0 (필수) 테스트 - MVP

```mermaid
flowchart TB
    subgraph P0_TESTS["🔴 P0 필수 테스트 (MVP)"]
        P0_AUTH["인증<br/>6개"]
        P0_REPO["프로젝트<br/>5개"]
        P0_ISSUE["이슈 관리<br/>9개"]
        P0_AI["AI 해결<br/>9개"]
        P0_CLI["AI CLI<br/>14개"]
        P0_RT["실시간 진행<br/>7개"]
        P0_DG["다이어그램<br/>6개"]
        P0_AP["승인 플로우<br/>10개"]
    end

    TOTAL["총 66개 P0 테스트"]

    P0_AUTH --> TOTAL
    P0_REPO --> TOTAL
    P0_ISSUE --> TOTAL
    P0_AI --> TOTAL
    P0_CLI --> TOTAL
    P0_RT --> TOTAL
    P0_DG --> TOTAL
    P0_AP --> TOTAL
```

### 3.2 테스트 유형별 분포

| 유형 | P0 | P1 | 합계 |
|------|-----|-----|------|
| 단위 테스트 | 29 | 11 | 40 |
| 통합 테스트 | 17 | 6 | 23 |
| E2E 테스트 | 20 | 9 | 29 |
| **합계** | **66** | **26** | **92** |

---

## 4. TDD 실행 순서

### 4.1 Phase 1: 인증 + 프로젝트 (주 1-2)

```mermaid
flowchart TB
    subgraph PHASE1["Phase 1: 기반"]
        P1_1["🔴 RED: auth 테스트 작성"]
        P1_2["🟢 GREEN: auth 구현"]
        P1_3["♻️ REFACTOR: auth 개선"]
        P1_4["🔴 RED: repo 테스트 작성"]
        P1_5["🟢 GREEN: repo 구현"]
        P1_6["♻️ REFACTOR: repo 개선"]

        P1_1 --> P1_2 --> P1_3 --> P1_4 --> P1_5 --> P1_6
    end
```

### 4.2 Phase 2: 이슈 관리 (주 3-4)

```mermaid
flowchart TB
    subgraph PHASE2["Phase 2: 이슈"]
        P2_1["🔴 RED: issue 테스트 작성"]
        P2_2["🟢 GREEN: issue 구현"]
        P2_3["♻️ REFACTOR: issue 개선"]
        P2_4["🔴 RED: 2단계 구조 테스트"]
        P2_5["🟢 GREEN: 열림/닫힘 구현"]

        P2_1 --> P2_2 --> P2_3 --> P2_4 --> P2_5
    end
```

### 4.3 Phase 3: AI 해결 + 실시간 (주 5-7)

```mermaid
flowchart TB
    subgraph PHASE3["Phase 3: AI + 실시간"]
        P3_1["🔴 RED: AI 분석 테스트"]
        P3_2["🟢 GREEN: Aider 통합"]
        P3_3["🔴 RED: SSE 테스트"]
        P3_4["🟢 GREEN: 실시간 스트리밍"]
        P3_5["🔴 RED: 진행 표시 테스트"]
        P3_6["🟢 GREEN: 🔴 LIVE UI"]

        P3_1 --> P3_2 --> P3_3 --> P3_4 --> P3_5 --> P3_6
    end
```

### 4.4 Phase 4: 다이어그램 + 승인 (주 8-9)

```mermaid
flowchart TB
    subgraph PHASE4["Phase 4: 시각화 + 승인"]
        P4_1["🔴 RED: 다이어그램 테스트"]
        P4_2["🟢 GREEN: React Flow 구현"]
        P4_3["🔴 RED: 승인 플로우 테스트"]
        P4_4["🟢 GREEN: HITL 구현"]

        P4_1 --> P4_2 --> P4_3 --> P4_4
    end
```

### 4.5 Phase 5: E2E 통합 (주 10)

```mermaid
flowchart TB
    subgraph PHASE5["Phase 5: E2E 통합"]
        P5_1["Playwright E2E 테스트 실행"]
        P5_2["전체 플로우 검증"]
        P5_3["버그 수정"]
        P5_4["최종 검증"]

        P5_1 --> P5_2 --> P5_3 --> P5_4
    end
```

---

## 5. 테스트 파일 구조

```
tests/
├── unit/
│   ├── test_auth.py
│   ├── test_repository.py
│   ├── test_issue.py
│   ├── test_ai_agent.py
│   ├── test_ai_cli.py          # 🆕 AI CLI 단위 테스트
│   ├── test_realtime.py
│   ├── test_diagram.py
│   └── test_approval.py
├── integration/
│   ├── test_github_api.py
│   ├── test_ai_model.py
│   ├── test_ai_cli_integration.py  # 🆕 AI CLI 통합 테스트
│   ├── test_sse_stream.py
│   └── test_langgraph.py
└── e2e/
    ├── test_login.spec.ts
    ├── test_project.spec.ts
    ├── test_issue.spec.ts
    ├── test_ai_resolve.spec.ts
    ├── test_ai_cli.spec.ts     # 🆕 AI CLI E2E 테스트
    ├── test_realtime.spec.ts
    ├── test_diagram.spec.ts
    └── test_approval.spec.ts
```

---

## 6. 성공 기준

| 지표 | 목표 |
|------|------|
| 단위 테스트 커버리지 | > 80% |
| 통합 테스트 커버리지 | > 70% |
| E2E 테스트 통과율 | 100% |
| P0 테스트 통과율 | 100% |

---

## 7. References

- `0002-prd-gitcommand-center-v2.md` - PRD 요구사항
- `0003-ui-design-workflow.md` - UI 설계
- Playwright 문서: https://playwright.dev/
- pytest 문서: https://docs.pytest.org/
