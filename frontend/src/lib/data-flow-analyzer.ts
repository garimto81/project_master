/**
 * Data Flow Analyzer - 데이터 흐름 분석 알고리즘
 * PRD-0007 v1.4: 바이브 코더를 위한 인과관계 시각화
 *
 * 핵심 기능:
 * - AST 역방향 탐색으로 데이터 출처 추적
 * - 순방향 탐색으로 데이터 사용처 추적
 * - 비개발자용 스토리 형식 변환
 */

import {
  Project,
  SourceFile,
  Node,
  SyntaxKind,
} from 'ts-morph'

import type {
  DataFlowResult,
  DataTarget,
  DataSource,
  DataTransformation,
  DataDestination,
  DataFlowStory,
  DataFlowStep,
  DataFlowVisualization,
} from './types/sequence'
import { getFriendlyLabel } from './function-labels'

// ============================================================
// 메인 분석 함수
// ============================================================

/**
 * 데이터 흐름 추적 실행
 * "이 데이터는 어디서 와?" 에 대한 답변 생성
 */
export function traceDataFlow(
  files: Array<{ path: string; content: string }>,
  targetIdentifier: string,
  targetFile: string,
  targetLine: number,
  direction: 'backward' | 'forward' | 'both' = 'both'
): DataFlowResult {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      jsx: 2,       // React
      target: 99,   // ESNext
      module: 99,   // ESNext
      strict: false,
      noEmit: true,
    },
  })

  // 파일 추가
  for (const file of files) {
    try {
      project.createSourceFile(file.path, file.content)
    } catch {
      // 이미 존재하면 무시
    }
  }

  const sourceFile = project.getSourceFile(targetFile)
  if (!sourceFile) {
    throw new Error(`File not found: ${targetFile}`)
  }

  // 1. 대상 변수 찾기
  const target = findTargetNode(sourceFile, targetIdentifier, targetLine)

  // 2. 역방향 탐색으로 출처 추적
  const sources = direction !== 'forward'
    ? traceBackward(project, sourceFile, target, targetIdentifier)
    : []

  // 3. 순방향 탐색으로 사용처 추적
  const destinations = direction !== 'backward'
    ? traceForward(project, sourceFile, target, targetIdentifier)
    : []

  // 4. 변환 단계 추출
  const transformations = extractTransformations(sources, destinations)

  // 5. 스토리 형식으로 변환
  const story = generateStory(targetIdentifier, sources, transformations, destinations)

  // 6. 시각화 데이터 생성
  const visualizationData = generateDataFlowVisualization(
    target,
    sources,
    transformations,
    destinations
  )

  return {
    target,
    sources,
    transformations,
    destinations,
    story,
    visualizationData,
  }
}

// ============================================================
// 대상 노드 찾기
// ============================================================

/**
 * AST에서 대상 변수 노드 찾기
 */
function findTargetNode(
  sourceFile: SourceFile,
  identifier: string,
  line: number
): DataTarget {
  let foundType: DataTarget['type'] = 'variable'

  sourceFile.forEachDescendant((node) => {
    if (node.getStartLineNumber() === line) {
      if (Node.isIdentifier(node) && node.getText() === identifier) {
        // 변수 유형 판별
        const parent = node.getParent()
        if (parent) {
          if (Node.isVariableDeclaration(parent)) {
            foundType = 'variable'
          } else if (parent.getKind() === SyntaxKind.Parameter) {
            foundType = 'parameter'
          } else if (Node.isPropertyAccessExpression(parent)) {
            foundType = 'property'
          } else if (isReactState(parent)) {
            foundType = 'state'
          } else if (isReactProps(parent)) {
            foundType = 'props'
          }
        }
      }
    }
  })

  return {
    id: `${sourceFile.getFilePath()}:${line}:${identifier}`,
    name: identifier,
    displayName: getFriendlyLabel(identifier),
    type: foundType,
    file: sourceFile.getFilePath(),
    line,
  }
}

/**
 * React state인지 확인
 */
function isReactState(node: Node): boolean {
  const text = node.getText()
  return text.includes('useState') || text.includes('useReducer')
}

/**
 * React props인지 확인
 */
function isReactProps(node: Node): boolean {
  const parent = node.getParent()
  if (!parent) return false
  return parent.getText().includes('props') || parent.getText().includes('Props')
}

// ============================================================
// 역방향 탐색 (출처 추적)
// ============================================================

/**
 * 데이터 출처 역방향 추적
 */
function traceBackward(
  project: Project,
  sourceFile: SourceFile,
  target: DataTarget,
  identifier: string
): DataSource[] {
  const sources: DataSource[] = []
  const visited = new Set<string>()

  // 현재 파일에서 할당 찾기
  sourceFile.forEachDescendant((node) => {
    // 변수 선언
    if (Node.isVariableDeclaration(node)) {
      const name = node.getName()
      if (name === identifier) {
        const initializer = node.getInitializer()
        if (initializer) {
          const source = classifySource(initializer, sourceFile)
          if (source && !visited.has(source.id)) {
            visited.add(source.id)
            sources.push(source)
          }
        }
      }
    }

    // 할당문
    if (Node.isBinaryExpression(node)) {
      const left = node.getLeft()
      if (Node.isIdentifier(left) && left.getText() === identifier) {
        const right = node.getRight()
        const source = classifySource(right, sourceFile)
        if (source && !visited.has(source.id)) {
          visited.add(source.id)
          sources.push(source)
        }
      }
    }

    // 파라미터
    if (node.getKind() === SyntaxKind.Parameter) {
      const paramNode = node as unknown as { getName: () => string }
      if (typeof paramNode.getName === 'function' && paramNode.getName() === identifier) {
        sources.push({
          id: `param:${node.getStartLineNumber()}`,
          type: 'user-input',
          name: identifier,
          displayName: `${getFriendlyLabel(identifier)} 매개변수`,
          file: sourceFile.getFilePath(),
          line: node.getStartLineNumber(),
          description: '함수 호출 시 전달받은 값',
        })
      }
    }
  })

  return sources
}

/**
 * 소스 유형 분류
 */
function classifySource(node: Node, sourceFile: SourceFile): DataSource | null {
  const text = node.getText()
  const line = node.getStartLineNumber()
  const id = `source:${sourceFile.getFilePath()}:${line}`

  // 사용자 입력 (폼, 이벤트)
  if (text.includes('e.target.value') || text.includes('event.target')) {
    return {
      id,
      type: 'user-input',
      name: 'userInput',
      displayName: '사용자 입력',
      file: sourceFile.getFilePath(),
      line,
      description: '폼에서 입력받은 값',
    }
  }

  // API 응답
  if (text.includes('fetch') || text.includes('axios') || text.includes('.json()')) {
    return {
      id,
      type: 'api-response',
      name: 'apiResponse',
      displayName: 'API 응답',
      file: sourceFile.getFilePath(),
      line,
      description: '서버에서 받아온 데이터',
    }
  }

  // 데이터베이스 (Supabase)
  if (text.includes('supabase') || text.includes('.from(') || text.includes('.select(')) {
    return {
      id,
      type: 'database',
      name: 'dbData',
      displayName: '데이터베이스',
      file: sourceFile.getFilePath(),
      line,
      description: '데이터베이스에서 조회한 데이터',
    }
  }

  // 로컬 스토리지
  if (text.includes('localStorage') || text.includes('sessionStorage')) {
    return {
      id,
      type: 'local-storage',
      name: 'storedData',
      displayName: '저장된 데이터',
      file: sourceFile.getFilePath(),
      line,
      description: '브라우저에 저장된 데이터',
    }
  }

  // URL 파라미터
  if (text.includes('useParams') || text.includes('searchParams') || text.includes('query')) {
    return {
      id,
      type: 'url-param',
      name: 'urlParam',
      displayName: 'URL 파라미터',
      file: sourceFile.getFilePath(),
      line,
      description: 'URL에서 추출한 값',
    }
  }

  // 상수
  if (Node.isStringLiteral(node) || Node.isNumericLiteral(node)) {
    return {
      id,
      type: 'constant',
      name: 'constant',
      displayName: '고정값',
      file: sourceFile.getFilePath(),
      line,
      description: '코드에 정의된 고정값',
    }
  }

  // 계산된 값
  if (Node.isCallExpression(node) || Node.isBinaryExpression(node)) {
    return {
      id,
      type: 'computed',
      name: 'computed',
      displayName: '계산된 값',
      file: sourceFile.getFilePath(),
      line,
      description: '다른 값들로부터 계산된 값',
    }
  }

  return null
}

// ============================================================
// 순방향 탐색 (사용처 추적)
// ============================================================

/**
 * 데이터 사용처 순방향 추적
 */
function traceForward(
  project: Project,
  sourceFile: SourceFile,
  target: DataTarget,
  identifier: string
): DataDestination[] {
  const destinations: DataDestination[] = []
  const visited = new Set<string>()

  sourceFile.forEachDescendant((node) => {
    if (!Node.isIdentifier(node)) return
    if (node.getText() !== identifier) return
    if (node.getStartLineNumber() === target.line) return // 자기 자신 제외

    const destination = classifyDestination(node, sourceFile)
    if (destination && !visited.has(destination.id)) {
      visited.add(destination.id)
      destinations.push(destination)
    }
  })

  return destinations
}

/**
 * 목적지 유형 분류
 */
function classifyDestination(node: Node, sourceFile: SourceFile): DataDestination | null {
  const parent = node.getParent()
  if (!parent) return null

  const text = parent.getText()
  const line = node.getStartLineNumber()
  const id = `dest:${sourceFile.getFilePath()}:${line}`

  // UI 표시
  if (text.includes('return') || text.includes('render') || parent.getKind() === SyntaxKind.JsxExpression) {
    return {
      id,
      type: 'ui-display',
      name: 'display',
      displayName: '화면 표시',
      file: sourceFile.getFilePath(),
      line,
      description: '사용자에게 표시되는 값',
    }
  }

  // API 요청
  if (text.includes('fetch') || text.includes('axios') || text.includes('body:')) {
    return {
      id,
      type: 'api-request',
      name: 'apiRequest',
      displayName: 'API 전송',
      file: sourceFile.getFilePath(),
      line,
      description: '서버로 전송되는 데이터',
    }
  }

  // 데이터베이스 저장
  if (text.includes('supabase') || text.includes('.insert') || text.includes('.update')) {
    return {
      id,
      type: 'database',
      name: 'dbSave',
      displayName: '데이터베이스 저장',
      file: sourceFile.getFilePath(),
      line,
      description: '데이터베이스에 저장',
    }
  }

  // 로컬 스토리지
  if (text.includes('localStorage.setItem') || text.includes('sessionStorage.setItem')) {
    return {
      id,
      type: 'local-storage',
      name: 'localSave',
      displayName: '브라우저 저장',
      file: sourceFile.getFilePath(),
      line,
      description: '브라우저에 저장',
    }
  }

  // 상태 업데이트
  if (text.includes('set') && text.match(/set[A-Z]/)) {
    return {
      id,
      type: 'state',
      name: 'stateUpdate',
      displayName: '상태 업데이트',
      file: sourceFile.getFilePath(),
      line,
      description: '앱 상태 업데이트',
    }
  }

  // 로그
  if (text.includes('console.log') || text.includes('console.error')) {
    return {
      id,
      type: 'log',
      name: 'log',
      displayName: '로그 출력',
      file: sourceFile.getFilePath(),
      line,
      description: '디버깅용 로그',
    }
  }

  return null
}

// ============================================================
// 변환 단계 추출
// ============================================================

/**
 * 데이터 변환 단계 추출
 */
function extractTransformations(
  sources: DataSource[],
  destinations: DataDestination[]
): DataTransformation[] {
  const transformations: DataTransformation[] = []
  let order = 0

  // 소스에서 변환 패턴 찾기
  for (const source of sources) {
    if (source.type === 'computed') {
      transformations.push({
        id: `transform:${source.id}`,
        order: order++,
        type: 'transform',
        functionName: 'compute',
        displayLabel: '데이터 변환',
        file: source.file || '',
        line: source.line || 0,
      })
    }
  }

  return transformations
}

// ============================================================
// 스토리 생성
// ============================================================

/**
 * 비개발자용 데이터 흐름 스토리 생성
 */
function generateStory(
  identifier: string,
  sources: DataSource[],
  transformations: DataTransformation[],
  destinations: DataDestination[]
): DataFlowStory {
  const steps: DataFlowStep[] = []
  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
  let stepOrder = 0

  // 출처 단계
  for (const source of sources) {
    steps.push({
      order: stepOrder,
      icon: numberEmojis[stepOrder] || `${stepOrder + 1}.`,
      label: `시작: ${source.displayName}`,
      technicalDetail: `${source.type} from ${source.file}:${source.line}`,
    })
    stepOrder++
  }

  // 변환 단계
  for (const transform of transformations) {
    steps.push({
      order: stepOrder,
      icon: numberEmojis[stepOrder] || `${stepOrder + 1}.`,
      label: transform.displayLabel,
      technicalDetail: `${transform.functionName}() at ${transform.file}:${transform.line}`,
    })
    stepOrder++
  }

  // 목적지 단계
  for (const dest of destinations) {
    steps.push({
      order: stepOrder,
      icon: numberEmojis[stepOrder] || `${stepOrder + 1}.`,
      label: `결과: ${dest.displayName}`,
      technicalDetail: `${dest.type} at ${dest.file}:${dest.line}`,
    })
    stepOrder++
  }

  // 요약 생성
  const summary = generateStorySummary(identifier, sources, destinations)

  return {
    title: `📊 ${getFriendlyLabel(identifier)} 데이터 추적`,
    steps,
    summary,
  }
}

/**
 * 스토리 요약 생성
 */
function generateStorySummary(
  identifier: string,
  sources: DataSource[],
  destinations: DataDestination[]
): string {
  const sourceTypes = sources.map(s => s.displayName).join(', ')
  const destTypes = destinations.map(d => d.displayName).join(', ')

  if (sources.length === 0 && destinations.length === 0) {
    return `${identifier}는 이 파일 내에서만 사용됩니다.`
  }

  if (sources.length > 0 && destinations.length > 0) {
    return `${identifier}는 ${sourceTypes}에서 시작하여 ${destTypes}(으)로 전달됩니다.`
  }

  if (sources.length > 0) {
    return `${identifier}는 ${sourceTypes}에서 가져옵니다.`
  }

  return `${identifier}는 ${destTypes}에 사용됩니다.`
}

// ============================================================
// 시각화 데이터 생성
// ============================================================

/**
 * 데이터 흐름 시각화 데이터 생성
 */
function generateDataFlowVisualization(
  target: DataTarget,
  sources: DataSource[],
  transformations: DataTransformation[],
  destinations: DataDestination[]
): DataFlowVisualization {
  const nodes: DataFlowVisualization['nodes'] = []
  const edges: DataFlowVisualization['edges'] = []

  // 대상 노드
  nodes.push({
    id: target.id,
    label: target.name,
    displayLabel: target.displayName,
    type: 'target',
  })

  // 소스 노드
  for (const source of sources) {
    nodes.push({
      id: source.id,
      label: source.name,
      displayLabel: source.displayName,
      type: 'source',
    })
    edges.push({
      from: source.id,
      to: target.id,
      label: '입력',
    })
  }

  // 변환 노드
  for (const transform of transformations) {
    nodes.push({
      id: transform.id,
      label: transform.functionName,
      displayLabel: transform.displayLabel,
      type: 'transform',
    })
  }

  // 목적지 노드
  for (const dest of destinations) {
    nodes.push({
      id: dest.id,
      label: dest.name,
      displayLabel: dest.displayName,
      type: 'destination',
    })
    edges.push({
      from: target.id,
      to: dest.id,
      label: '출력',
    })
  }

  // Mermaid 코드 생성
  const mermaidCode = generateDataFlowMermaid(target, sources, transformations, destinations)

  return {
    nodes,
    edges,
    mermaidCode,
  }
}

/**
 * Mermaid 다이어그램 코드 생성
 */
function generateDataFlowMermaid(
  target: DataTarget,
  sources: DataSource[],
  transformations: DataTransformation[],
  destinations: DataDestination[]
): string {
  const lines: string[] = ['graph LR']

  // 스타일 정의
  lines.push('  classDef source fill:#4caf50,color:#fff')
  lines.push('  classDef target fill:#2196f3,color:#fff')
  lines.push('  classDef transform fill:#ff9800,color:#000')
  lines.push('  classDef dest fill:#9c27b0,color:#fff')

  // 대상 노드
  const targetLabel = target.displayName.replace(/"/g, "'")
  lines.push(`  target["${targetLabel}"]:::target`)

  // 소스 노드와 연결
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    const label = source.displayName.replace(/"/g, "'")
    lines.push(`  src${i}["${label}"]:::source`)
    lines.push(`  src${i} -->|입력| target`)
  }

  // 변환 노드
  for (let i = 0; i < transformations.length; i++) {
    const transform = transformations[i]
    const label = transform.displayLabel.replace(/"/g, "'")
    lines.push(`  trans${i}["${label}"]:::transform`)
  }

  // 목적지 노드와 연결
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i]
    const label = dest.displayName.replace(/"/g, "'")
    lines.push(`  dest${i}["${label}"]:::dest`)
    lines.push(`  target -->|출력| dest${i}`)
  }

  return lines.join('\n')
}

// ============================================================
// 편의 함수
// ============================================================

/**
 * 파일 내용으로부터 데이터 흐름 분석
 */
export function analyzeDataFlowFromFiles(
  files: Array<{ path: string; content: string }>,
  query: {
    identifier: string
    file: string
    line: number
    direction?: 'backward' | 'forward' | 'both'
  }
): DataFlowResult {
  return traceDataFlow(
    files,
    query.identifier,
    query.file,
    query.line,
    query.direction || 'both'
  )
}

/**
 * 단일 파일에서 데이터 흐름 분석
 */
export function analyzeDataFlowFromContent(
  content: string,
  filePath: string,
  identifier: string,
  line: number
): DataFlowResult {
  return traceDataFlow(
    [{ path: filePath, content }],
    identifier,
    filePath,
    line,
    'both'
  )
}
