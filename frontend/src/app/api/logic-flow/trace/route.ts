/**
 * Logic Flow API - Step-by-Step Trace
 * PRD v6.2 Section 1.2: 스텝바이스텝 실행 모드
 *
 * 함수 실행 흐름을 단계별로 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface Step {
  order: number
  node: string
  label: string
  type: 'start' | 'action' | 'decision' | 'process' | 'end' | 'error'
  data: Record<string, any> | null
  source_line?: number
}

interface TraceResponse {
  repo: string
  function: string
  steps: Step[]
  total_steps: number
  mermaid_code: string
  summary: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repo, function: funcName, path, input_example } = body

    if (!repo || !funcName) {
      return NextResponse.json({ error: 'repo and function parameters required' }, { status: 400 })
    }

    // 인증 확인 (선택적)
    const { token } = await getGitHubTokenFromSession()

    const [owner, repoName] = repo.split('/')

    // 파일 내용 가져오기 (path가 제공되고 인증된 경우)
    let codeContent = ''
    if (path && token) {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      )

      if (fileResponse.ok) {
        const fileData = await fileResponse.json()
        if (fileData.content) {
          codeContent = Buffer.from(fileData.content, 'base64').toString('utf-8')
        }
      }
    }

    // 코드 분석하여 실행 흐름 추출
    const steps = analyzeCodeFlow(funcName, codeContent, input_example)

    // Mermaid 다이어그램 생성
    const mermaidLines = ['flowchart TB']
    steps.forEach((step, i) => {
      const shape = step.type === 'decision' ? `{${step.label}}` :
                   step.type === 'start' || step.type === 'end' ? `([${step.label}])` :
                   step.type === 'error' ? `[/${step.label}/]` :
                   `[${step.label}]`

      const style = step.type === 'error' ? ':::error' :
                   step.type === 'start' ? ':::start' :
                   step.type === 'end' ? ':::end' : ''

      mermaidLines.push(`  ${step.node}${shape}${style}`)
    })

    // 연결선 추가
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].type === 'decision') {
        // 조건문 분기
        const nextYes = steps[i + 1]
        const nextNo = steps.find(s => s.type === 'error' || s.type === 'end')
        if (nextYes) mermaidLines.push(`  ${steps[i].node} -->|Yes| ${nextYes.node}`)
        if (nextNo && nextNo !== nextYes) mermaidLines.push(`  ${steps[i].node} -->|No| ${nextNo.node}`)
      } else if (steps[i].type !== 'error' && steps[i].type !== 'end') {
        mermaidLines.push(`  ${steps[i].node} --> ${steps[i + 1].node}`)
      }
    }

    mermaidLines.push('  classDef error fill:#dc2626,color:#fff')
    mermaidLines.push('  classDef start fill:#22c55e,color:#fff')
    mermaidLines.push('  classDef end fill:#3b82f6,color:#fff')

    const response: TraceResponse = {
      repo,
      function: funcName,
      steps,
      total_steps: steps.length,
      mermaid_code: mermaidLines.join('\n'),
      summary: `${funcName} 함수의 실행 흐름: ${steps.length}단계`,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Trace error:', error)
    return NextResponse.json({ error: 'Failed to generate trace' }, { status: 500 })
  }
}

/**
 * 코드에서 실행 흐름 분석 (간단한 휴리스틱)
 */
function analyzeCodeFlow(funcName: string, code: string, inputExample?: Record<string, any>): Step[] {
  const steps: Step[] = []
  let stepOrder = 1

  // 시작
  steps.push({
    order: stepOrder++,
    node: 'START',
    label: `${funcName} 시작`,
    type: 'start',
    data: inputExample || null,
  })

  // 코드가 없으면 에러 (실제 코드 필요)
  if (!code) {
    steps.push({
      order: stepOrder++,
      node: 'ERR',
      label: '코드를 분석할 수 없습니다',
      type: 'error',
      data: null,
    })
    return steps
  }

  // 코드 분석
  const lines = code.split('\n')
  let inFunction = false
  let braceCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 함수 시작 찾기
    if (line.includes(funcName) && (line.includes('function') || line.includes('=>') || line.includes('def '))) {
      inFunction = true
    }

    if (!inFunction) continue

    // 중괄호 카운트
    braceCount += (line.match(/{/g) || []).length
    braceCount -= (line.match(/}/g) || []).length

    // 조건문
    if (line.match(/^if\s*\(|^if\s+/)) {
      const condition = line.match(/if\s*\((.+?)\)|if\s+(.+?):/)?.[1] || '조건 확인'
      steps.push({
        order: stepOrder++,
        node: `D${stepOrder}`,
        label: simplifyCondition(condition),
        type: 'decision',
        data: null,
        source_line: i + 1,
      })
    }

    // 함수 호출
    const funcCall = line.match(/(?:await\s+)?(\w+)\s*\(/)?.[1]
    if (funcCall && funcCall !== funcName && !['if', 'while', 'for', 'switch', 'catch'].includes(funcCall)) {
      steps.push({
        order: stepOrder++,
        node: `A${stepOrder}`,
        label: simplifyFunctionCall(funcCall),
        type: 'action',
        data: null,
        source_line: i + 1,
      })
    }

    // return 문
    if (line.match(/^return\s/)) {
      const returnValue = line.replace('return', '').trim()
      steps.push({
        order: stepOrder++,
        node: 'END',
        label: returnValue ? `결과 반환: ${returnValue.slice(0, 20)}` : '완료',
        type: 'end',
        data: null,
        source_line: i + 1,
      })
      break
    }

    // throw/에러
    if (line.match(/throw\s|raise\s/)) {
      steps.push({
        order: stepOrder++,
        node: 'ERR',
        label: '에러 발생',
        type: 'error',
        data: null,
        source_line: i + 1,
      })
    }

    // 함수 끝
    if (braceCount === 0 && inFunction) {
      break
    }
  }

  // 종료 노드가 없으면 추가
  if (!steps.find(s => s.type === 'end')) {
    steps.push({
      order: stepOrder++,
      node: 'END',
      label: '완료',
      type: 'end',
      data: null,
    })
  }

  return steps.slice(0, 10) // 최대 10단계
}

/**
 * 조건문을 비개발자 언어로 변환
 */
function simplifyCondition(condition: string): string {
  const mappings: Record<string, string> = {
    '!': '아닌 경우',
    '===': '같으면',
    '!==': '다르면',
    '&&': '그리고',
    '||': '또는',
    'null': '없음',
    'undefined': '없음',
    'true': '참',
    'false': '거짓',
  }

  let result = condition.slice(0, 30)
  Object.entries(mappings).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
  })

  return result.length > 20 ? result.slice(0, 17) + '...' : result
}

/**
 * 함수 호출을 비개발자 언어로 변환
 */
function simplifyFunctionCall(funcName: string): string {
  const mappings: Record<string, string> = {
    'fetch': '서버 요청',
    'validate': '검증',
    'check': '확인',
    'get': '가져오기',
    'set': '설정',
    'save': '저장',
    'delete': '삭제',
    'update': '업데이트',
    'create': '생성',
    'send': '전송',
    'receive': '수신',
    'parse': '분석',
    'render': '표시',
    'handle': '처리',
    'process': '처리',
    'login': '로그인',
    'logout': '로그아웃',
    'auth': '인증',
  }

  const lowerName = funcName.toLowerCase()
  for (const [key, value] of Object.entries(mappings)) {
    if (lowerName.includes(key)) {
      return value
    }
  }

  // CamelCase를 공백으로 분리
  return funcName.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}
