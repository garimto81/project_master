/**
 * Logic Flow API - Module Detail (Level 2)
 * PRD v6.2 Section 1.2: 다층 시각화 시스템
 *
 * 특정 모듈의 함수/클래스 관계를 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGitHubTokenFromSession } from '@/lib/auth'

interface FunctionInfo {
  name: string
  type: 'function' | 'class' | 'component'
  calls: string[] // 호출하는 다른 함수들
  status: 'normal' | 'error'
  line_start: number
  line_end: number
}

interface ModuleResponse {
  level: 'module'
  repo: string
  module: string
  functions: FunctionInfo[]
  mermaid_code: string
  summary: {
    total_functions: number
    error_functions: number
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const repo = searchParams.get('repo')
  const moduleName = searchParams.get('module')

  if (!repo || !moduleName) {
    return NextResponse.json({ error: 'repo and module parameters required' }, { status: 400 })
  }

  // 인증 확인
  const { token } = await getGitHubTokenFromSession()

  if (!token) {
    return NextResponse.json({ error: 'GitHub 인증이 필요합니다. 로그인해주세요.' }, { status: 401 })
  }

  try {
    const [owner, repoName] = repo.split('/')

    // 모듈 디렉토리의 파일 목록 가져오기
    const modulePath = moduleName.includes('/') ? moduleName : `src/${moduleName}`
    const contentsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${modulePath}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    const functions: FunctionInfo[] = []

    if (contentsResponse.ok) {
      const contents = await contentsResponse.json()
      const files = Array.isArray(contents) ? contents : [contents]

      // 각 파일에서 함수 추출 (간단한 패턴 매칭)
      for (const file of files.slice(0, 10)) { // 최대 10개 파일
        if (!file.name.match(/\.(ts|tsx|js|jsx|py)$/)) continue

        // 파일 내용 가져오기
        const fileResponse = await fetch(file.download_url)
        if (!fileResponse.ok) continue

        const content = await fileResponse.text()
        const lines = content.split('\n')

        // 함수/클래스 패턴 찾기
        lines.forEach((line, index) => {
          // TypeScript/JavaScript 함수
          const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
          const arrowMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/)
          const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/)
          const componentMatch = line.match(/(?:export\s+)?(?:default\s+)?function\s+(\w+)\s*\(.*\)\s*{/)

          // Python 함수
          const pyFuncMatch = line.match(/^(?:async\s+)?def\s+(\w+)/)
          const pyClassMatch = line.match(/^class\s+(\w+)/)

          const match = funcMatch || arrowMatch || classMatch || componentMatch || pyFuncMatch || pyClassMatch
          if (match && !match[1].startsWith('_')) {
            const name = match[1]
            const type = classMatch || pyClassMatch ? 'class' :
                        (componentMatch && name[0] === name[0].toUpperCase()) ? 'component' : 'function'

            // 호출 관계 추출 (간단한 패턴)
            const calls: string[] = []
            const callPatterns = content.match(new RegExp(`${name}\\s*\\(`, 'g'))
            if (callPatterns && callPatterns.length > 1) {
              // 다른 함수 호출 찾기
              const otherCalls = content.match(/(?:await\s+)?(\w+)\s*\(/g) || []
              otherCalls.slice(0, 3).forEach(c => {
                const callName = c.replace(/await\s+/, '').replace(/\s*\($/, '')
                if (callName !== name && !calls.includes(callName) && callName.length > 2) {
                  calls.push(callName)
                }
              })
            }

            functions.push({
              name: `${file.name.replace(/\.[^.]+$/, '')}.${name}`,
              type,
              calls: calls.slice(0, 3),
              status: 'normal',
              line_start: index + 1,
              line_end: index + 10, // 근사값
            })
          }
        })
      }
    }

    // 중복 제거 및 정리
    const uniqueFunctions = functions.slice(0, 15)

    // Mermaid 다이어그램 생성 (Flowchart)
    const mermaidLines = ['flowchart LR']
    const addedNodes = new Set<string>()

    uniqueFunctions.forEach((func, i) => {
      const nodeId = `F${i}`
      const shortName = func.name.split('.').pop() || func.name
      const icon = func.type === 'class' ? '📦' : func.type === 'component' ? '🧩' : '⚙️'
      mermaidLines.push(`  ${nodeId}["${icon} ${shortName}"]`)
      addedNodes.add(func.name)
    })

    // 호출 관계 연결
    uniqueFunctions.forEach((func, i) => {
      func.calls.forEach(call => {
        const targetIndex = uniqueFunctions.findIndex(f => f.name.includes(call))
        if (targetIndex !== -1 && targetIndex !== i) {
          mermaidLines.push(`  F${i} --> F${targetIndex}`)
        }
      })
    })

    const response: ModuleResponse = {
      level: 'module',
      repo,
      module: moduleName,
      functions: uniqueFunctions,
      mermaid_code: mermaidLines.join('\n'),
      summary: {
        total_functions: uniqueFunctions.length,
        error_functions: uniqueFunctions.filter(f => f.status === 'error').length,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Module detail error:', error)
    return NextResponse.json({ error: '모듈 정보를 불러올 수 없습니다' }, { status: 500 })
  }
}
