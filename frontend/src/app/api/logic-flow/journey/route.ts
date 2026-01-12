/**
 * Journey Analysis API - 사용자 여정 시퀀스 분석
 * PRD-0008: 행동 중심 코드 시각화
 *
 * "이 기능이 어떻게 작동하는가?" 에 대한 답변 생성
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'
import { treeCache, GitHubTreeItem } from '@/lib/analysis-cache'
import { analyzeCallGraph } from '@/lib/call-graph-analyzer'
import {
  generateSequenceFlow,
  generateMermaidSequence,
} from '@/lib/sequence-analyzer'

// ============================================================
// 타입 정의
// ============================================================

interface JourneyRequest {
  repo: string
  feature: string          // "로그인", "회원가입", "코드 시각화" 등
  entryPoint?: string      // 시작점 (자동 탐지 가능)
  maxDepth?: number
}

interface JourneyStep {
  order: number
  action: string           // 비개발자 언어
  technical: string        // 기술 용어
  type: 'user' | 'logic' | 'api' | 'data'
  file?: string
  line?: number
}

interface JourneyOutcome {
  type: 'success' | 'error' | 'redirect'
  label: string
  displayLabel: string
  condition?: string
}

interface JourneyFlow {
  id: string
  name: string
  displayName: string
  description: string
  trigger: {
    type: string
    element?: string
    displayLabel: string
    file?: string
    line?: number
  }
  steps: JourneyStep[]
  outcomes: JourneyOutcome[]
  mermaid?: string
}

interface FeatureOption {
  id: string
  label: string
  description: string
  handlers: string[]       // 관련 핸들러 함수명
}

// ============================================================
// 기능-핸들러 매핑
// ============================================================

const FEATURE_MAPPINGS: Record<string, FeatureOption> = {
  login: {
    id: 'login',
    label: '로그인',
    description: '사용자 인증 흐름',
    handlers: ['handleLogin', 'signIn', 'login', 'handleLoginClick', 'onLogin'],
  },
  signup: {
    id: 'signup',
    label: '회원가입',
    description: '새 계정 생성',
    handlers: ['handleSignup', 'signUp', 'register', 'handleSignupSubmit', 'onSignup'],
  },
  logout: {
    id: 'logout',
    label: '로그아웃',
    description: '세션 종료',
    handlers: ['handleLogout', 'signOut', 'logout', 'onLogout'],
  },
  visualization: {
    id: 'visualization',
    label: '코드 시각화',
    description: '다이어그램 생성',
    handlers: ['loadAnalyze', 'handleAnalyze', 'analyzeCode', 'visualize'],
  },
  repoSelect: {
    id: 'repoSelect',
    label: '레포 선택',
    description: '레포지토리 선택',
    handlers: ['handleRepoSelect', 'selectRepo', 'onRepoClick'],
  },
  issueCreate: {
    id: 'issueCreate',
    label: '이슈 생성',
    description: 'GitHub 이슈 생성',
    handlers: ['handleCreateIssue', 'createIssue', 'submitIssue'],
  },
  search: {
    id: 'search',
    label: '검색',
    description: '검색 기능',
    handlers: ['handleSearch', 'search', 'onSearch', 'doSearch'],
  },
}

// 비개발자 언어 변환
const TERM_TRANSLATIONS: Record<string, string> = {
  // 이벤트
  onClick: '클릭 시',
  onSubmit: '제출 시',
  onChange: '변경 시',
  onLoad: '로드 시',

  // 동작
  fetch: '서버에 요청',
  'async/await': '처리 중...',
  setState: '화면 업데이트',
  useEffect: '자동 실행',
  'try-catch': '오류 확인',
  return: '결과 반환',
  import: '가져오기',
  export: '내보내기',

  // 데이터
  localStorage: '브라우저 저장',
  sessionStorage: '세션 저장',
  supabase: '데이터베이스',
  token: '인증 토큰',
  session: '세션',

  // 라우팅
  'router.push': '페이지 이동',
  redirect: '리다이렉트',
  navigate: '이동',
}

// ============================================================
// GET: 사용 가능한 기능 목록 반환
// ============================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await getGitHubTokenFromSession()
  if (!authResult.token) {
    return NextResponse.json(
      { success: false, error: authResult.error || '인증이 필요합니다.' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const repo = searchParams.get('repo')

  if (!repo) {
    // 기본 기능 목록 반환
    return NextResponse.json({
      success: true,
      features: Object.values(FEATURE_MAPPINGS),
    })
  }

  // 레포 분석 후 발견된 기능 목록 반환
  try {
    const cacheKey = `tree:${repo}:main`
    const treeData = treeCache.get(cacheKey)

    if (!treeData) {
      return NextResponse.json({
        success: true,
        features: Object.values(FEATURE_MAPPINGS),
        message: '레포 분석 전 기본 기능 목록입니다.',
      })
    }

    // TODO: 레포에서 발견된 핸들러 기반으로 기능 목록 필터링
    return NextResponse.json({
      success: true,
      features: Object.values(FEATURE_MAPPINGS),
    })
  } catch (error) {
    console.error('Get features error:', error)
    return NextResponse.json({
      success: true,
      features: Object.values(FEATURE_MAPPINGS),
    })
  }
}

// ============================================================
// POST: 사용자 여정 분석
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // 1. 인증 확인
    const authResult = await getGitHubTokenFromSession()
    if (!authResult.token) {
      return NextResponse.json(
        { success: false, error: authResult.error || '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 요청 파싱
    const body: JourneyRequest = await request.json()
    const { repo, feature, maxDepth = 10 } = body

    if (!repo || !feature) {
      return NextResponse.json(
        { success: false, error: 'repo와 feature가 필요합니다.' },
        { status: 400 }
      )
    }

    // 3. 기능 매핑 확인
    const featureMapping = FEATURE_MAPPINGS[feature] ||
      Object.values(FEATURE_MAPPINGS).find(f =>
        f.label === feature ||
        f.handlers.some(h => h.toLowerCase().includes(feature.toLowerCase()))
      )

    if (!featureMapping) {
      return NextResponse.json({
        success: true,
        journey: createFallbackJourney(feature),
        message: `'${feature}' 기능에 대한 정확한 매핑이 없어 일반 분석을 수행합니다.`,
      })
    }

    // 4. 파일 목록 가져오기
    const cacheKey = `tree:${repo}:main`
    let treeData = treeCache.get(cacheKey)

    if (!treeData) {
      const treeResponse = await fetch(
        `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${authResult.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!treeResponse.ok) {
        return NextResponse.json({
          success: true,
          journey: createFallbackJourney(feature),
          message: 'GitHub API 오류, 예시 데이터로 표시합니다.',
        })
      }

      const responseData = await treeResponse.json()
      treeData = { tree: responseData.tree || [], truncated: responseData.truncated }
      treeCache.set(cacheKey, treeData)
    }

    // 5. 관련 파일 필터링
    const codeFiles = treeData.tree.filter((item: GitHubTreeItem) =>
      item.type === 'blob' &&
      /\.(ts|tsx|js|jsx)$/.test(item.path) &&
      !item.path.includes('node_modules') &&
      !item.path.includes('.d.ts') &&
      !item.path.includes('.test.') &&
      !item.path.includes('.spec.')
    )

    // 핸들러 관련 파일 우선
    const handlerPatterns = featureMapping.handlers.map(h => h.toLowerCase())
    const relevantFiles = codeFiles.filter((file: GitHubTreeItem) =>
      handlerPatterns.some(pattern =>
        file.path.toLowerCase().includes(pattern) ||
        file.path.toLowerCase().includes(feature.toLowerCase())
      )
    )

    const filesToAnalyze = relevantFiles.length > 0
      ? relevantFiles.slice(0, 20)
      : codeFiles.slice(0, 30)

    // 6. 파일 내용 가져오기
    const fileContents: Array<{ path: string; content: string }> = []

    const fetchPromises = filesToAnalyze.map(async (file: GitHubTreeItem) => {
      try {
        const contentResponse = await fetch(
          `https://api.github.com/repos/${repo}/contents/${file.path}?ref=main`,
          {
            headers: {
              Authorization: `Bearer ${authResult.token}`,
              Accept: 'application/vnd.github.v3.raw',
            },
          }
        )

        if (contentResponse.ok) {
          const content = await contentResponse.text()
          return { path: file.path, content }
        }
      } catch {
        // 파일 읽기 실패 시 건너뜀
      }
      return null
    })

    const results = await Promise.all(fetchPromises)
    for (const result of results) {
      if (result) {
        fileContents.push(result)
      }
    }

    if (fileContents.length === 0) {
      return NextResponse.json({
        success: true,
        journey: createFallbackJourney(feature),
        message: '분석할 파일을 찾지 못했습니다.',
      })
    }

    // 7. 호출 그래프 분석
    const callGraph = analyzeCallGraph(fileContents)

    // 8. 핸들러 찾기
    let handlerNode = null
    for (const handlerName of featureMapping.handlers) {
      handlerNode = callGraph.nodes.find(n =>
        n.name === handlerName ||
        n.name.toLowerCase().includes(handlerName.toLowerCase())
      )
      if (handlerNode) break
    }

    if (!handlerNode) {
      return NextResponse.json({
        success: true,
        journey: createFallbackJourney(feature),
        message: `'${feature}' 관련 핸들러를 찾지 못했습니다.`,
      })
    }

    // 9. 시퀀스 흐름 생성
    const sequenceFlow = generateSequenceFlow(callGraph, handlerNode.id, maxDepth)

    // 10. JourneyFlow로 변환
    const journey = convertToJourneyFlow(sequenceFlow, featureMapping)

    const analysisTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      journey,
      analysisTimeMs,
    })
  } catch (error) {
    console.error('Journey analysis error:', error)
    return NextResponse.json({
      success: true,
      journey: createFallbackJourney('unknown'),
      error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
    })
  }
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * SequenceFlow를 JourneyFlow로 변환
 */
function convertToJourneyFlow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sequenceFlow: any,
  featureMapping: FeatureOption
): JourneyFlow {
  const steps: JourneyStep[] = sequenceFlow.messages?.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (msg: any, idx: number) => ({
      order: idx + 1,
      action: msg.displayLabel || translateTechnicalTerm(msg.label),
      technical: msg.label,
      type: classifyStepType(msg),
      file: msg.file,
      line: msg.line,
    })
  ) || []

  const mermaid = sequenceFlow.id
    ? generateMermaidSequence(sequenceFlow)
    : undefined

  return {
    id: `journey:${featureMapping.id}`,
    name: featureMapping.id,
    displayName: `${featureMapping.label} 흐름`,
    description: `사용자가 ${featureMapping.label}할 때 시스템이 처리하는 과정입니다.`,
    trigger: {
      type: sequenceFlow.trigger?.type || 'click',
      element: featureMapping.label,
      displayLabel: sequenceFlow.trigger?.displayLabel || `${featureMapping.label} 버튼 클릭`,
      file: sequenceFlow.trigger?.file,
      line: sequenceFlow.trigger?.line,
    },
    steps,
    outcomes: sequenceFlow.outcomes?.map((o: JourneyOutcome) => ({
      type: o.type,
      label: o.label,
      displayLabel: o.displayLabel,
      condition: o.condition,
    })) || [
      { type: 'success', label: 'success', displayLabel: '성공' },
      { type: 'error', label: 'error', displayLabel: '에러 발생' },
    ],
    mermaid,
  }
}

/**
 * 기술 용어를 비개발자 언어로 변환
 */
function translateTechnicalTerm(term: string): string {
  // 정확한 매칭
  if (TERM_TRANSLATIONS[term]) {
    return TERM_TRANSLATIONS[term]
  }

  // 부분 매칭
  for (const [key, value] of Object.entries(TERM_TRANSLATIONS)) {
    if (term.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  // 함수명 변환 (camelCase → 읽기 쉬운 형태)
  if (term.match(/^[a-z]+[A-Z]/)) {
    return term
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim()
  }

  return term
}

/**
 * 메시지의 단계 유형 분류
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function classifyStepType(msg: any): JourneyStep['type'] {
  if (msg.type === 'user' || msg.from === 'user') return 'user'
  if (msg.label?.includes('fetch') || msg.label?.includes('api') || msg.label?.includes('API')) return 'api'
  if (msg.label?.includes('supabase') || msg.label?.includes('db') || msg.label?.includes('save')) return 'data'
  return 'logic'
}

/**
 * 폴백 여정 생성
 */
function createFallbackJourney(feature: string): JourneyFlow {
  return {
    id: `journey:${feature}`,
    name: feature,
    displayName: `${feature} 흐름`,
    description: `${feature} 기능의 예상 흐름입니다.`,
    trigger: {
      type: 'click',
      element: feature,
      displayLabel: `${feature} 시작`,
    },
    steps: [
      { order: 1, action: '사용자 액션', technical: 'handleAction()', type: 'user' },
      { order: 2, action: '데이터 검증', technical: 'validate()', type: 'logic' },
      { order: 3, action: '서버 요청', technical: 'fetch()', type: 'api' },
      { order: 4, action: '결과 처리', technical: 'handleResult()', type: 'logic' },
    ],
    outcomes: [
      { type: 'success', label: 'success', displayLabel: '성공' },
      { type: 'error', label: 'error', displayLabel: '실패' },
    ],
  }
}
