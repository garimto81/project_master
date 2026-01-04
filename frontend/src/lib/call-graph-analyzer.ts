/**
 * Call Graph Analyzer - 함수 호출 관계 분석
 * PRD-0007: 코드 시각화 시스템 재설계
 *
 * 기능:
 * - 함수 호출 관계 추출
 * - API 호출 탐지 (fetch, axios)
 * - Supabase 호출 탐지
 * - 진입점 자동 탐지
 */

import {
  Project,
  SourceFile,
  Node,
  SyntaxKind,
  CallExpression,
} from 'ts-morph'

// ============================================================
// 타입 정의
// ============================================================

export interface CallEdge {
  fromId: string
  fromName: string
  toId: string
  toName: string
  file: string
  line: number
  isAsync: boolean
  isConditional: boolean
  callType: 'function' | 'method' | 'api' | 'db' | 'external'
}

export interface ApiCall {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'UNKNOWN'
  path: string
  file: string
  line: number
  calledFrom: string
  matchedRoute?: string
}

export interface DbCall {
  id: string
  type: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc' | 'auth' | 'unknown'
  table: string | null
  file: string
  line: number
  calledFrom: string
}

export interface FunctionNode {
  id: string
  name: string
  file: string
  line: number
  type: 'function' | 'method' | 'arrow' | 'component' | 'hook' | 'handler'
  isExported: boolean
  isAsync: boolean
  callCount: number
  calledByCount: number
}

export interface CallGraphResult {
  nodes: FunctionNode[]
  edges: CallEdge[]
  apiCalls: ApiCall[]
  dbCalls: DbCall[]
  entryPoints: {
    pages: string[]
    apiRoutes: string[]
    eventHandlers: string[]
  }
  hotspots: Array<{ functionId: string; callCount: number }>
  stats: {
    totalFunctions: number
    totalCalls: number
    totalApiCalls: number
    totalDbCalls: number
    analysisTimeMs: number
  }
}

// ============================================================
// 메인 분석 함수
// ============================================================

export function analyzeCallGraph(
  files: Array<{ path: string; content: string }>
): CallGraphResult {
  const startTime = Date.now()

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      jsx: 2,
      target: 99,
      module: 99,
      strict: false,
      skipLibCheck: true,
    },
  })

  // 파일 추가
  for (const file of files) {
    try {
      project.createSourceFile(file.path, file.content)
    } catch {
      console.warn(`Failed to parse: ${file.path}`)
    }
  }

  const nodes: FunctionNode[] = []
  const edges: CallEdge[] = []
  const apiCalls: ApiCall[] = []
  const dbCalls: DbCall[] = []
  const entryPoints = {
    pages: [] as string[],
    apiRoutes: [] as string[],
    eventHandlers: [] as string[],
  }

  // 함수 ID 맵
  const functionMap = new Map<string, FunctionNode>()

  // 1. 모든 함수 수집
  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath()
    extractFunctions(sourceFile, filePath, functionMap)
  }

  // 2. 호출 관계 분석
  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath()
    analyzeCallsInFile(sourceFile, filePath, functionMap, edges, apiCalls, dbCalls)
  }

  // 3. 진입점 탐지
  for (const [, node] of functionMap) {
    if (isPageComponent(node)) {
      entryPoints.pages.push(node.id)
    }
    if (isApiRouteHandler(node)) {
      entryPoints.apiRoutes.push(node.id)
    }
    if (isEventHandler(node)) {
      entryPoints.eventHandlers.push(node.id)
    }
  }

  // 4. 호출 카운트 계산
  const callCounts = new Map<string, number>()
  const calledByCounts = new Map<string, number>()

  for (const edge of edges) {
    callCounts.set(edge.fromId, (callCounts.get(edge.fromId) || 0) + 1)
    calledByCounts.set(edge.toId, (calledByCounts.get(edge.toId) || 0) + 1)
  }

  // 노드에 카운트 반영
  for (const [id, node] of functionMap) {
    node.callCount = callCounts.get(id) || 0
    node.calledByCount = calledByCounts.get(id) || 0
    nodes.push(node)
  }

  // 5. 핫스팟 계산 (가장 많이 호출되는 함수)
  const hotspots = nodes
    .filter((n) => n.calledByCount > 0)
    .sort((a, b) => b.calledByCount - a.calledByCount)
    .slice(0, 10)
    .map((n) => ({ functionId: n.id, callCount: n.calledByCount }))

  return {
    nodes,
    edges,
    apiCalls,
    dbCalls,
    entryPoints,
    hotspots,
    stats: {
      totalFunctions: nodes.length,
      totalCalls: edges.length,
      totalApiCalls: apiCalls.length,
      totalDbCalls: dbCalls.length,
      analysisTimeMs: Date.now() - startTime,
    },
  }
}

// ============================================================
// 함수 추출
// ============================================================

function extractFunctions(
  sourceFile: SourceFile,
  filePath: string,
  functionMap: Map<string, FunctionNode>
): void {
  // 일반 함수
  sourceFile.getFunctions().forEach((func) => {
    const name = func.getName()
    if (!name) return

    const id = `${filePath}:${name}:${func.getStartLineNumber()}`
    const type = detectFunctionType(name, func)

    functionMap.set(id, {
      id,
      name,
      file: filePath,
      line: func.getStartLineNumber(),
      type,
      isExported: func.isExported(),
      isAsync: func.isAsync(),
      callCount: 0,
      calledByCount: 0,
    })
  })

  // 변수에 할당된 화살표 함수
  sourceFile.getVariableDeclarations().forEach((varDecl) => {
    const initializer = varDecl.getInitializer()
    if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
      const name = varDecl.getName()
      const line = varDecl.getStartLineNumber()
      const id = `${filePath}:${name}:${line}`
      const type = detectFunctionType(name, initializer)

      functionMap.set(id, {
        id,
        name,
        file: filePath,
        line,
        type,
        isExported: varDecl.isExported(),
        isAsync: initializer.isAsync?.() || false,
        callCount: 0,
        calledByCount: 0,
      })
    }
  })

  // 클래스 메서드
  sourceFile.getClasses().forEach((cls) => {
    cls.getMethods().forEach((method) => {
      const name = `${cls.getName()}.${method.getName()}`
      const line = method.getStartLineNumber()
      const id = `${filePath}:${name}:${line}`

      functionMap.set(id, {
        id,
        name,
        file: filePath,
        line,
        type: 'method',
        isExported: false,
        isAsync: method.isAsync(),
        callCount: 0,
        calledByCount: 0,
      })
    })
  })
}

function detectFunctionType(
  name: string,
  node: Node
): FunctionNode['type'] {
  // API Route Handler
  if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(name)) {
    return 'handler'
  }

  // Custom Hook
  if (name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase()) {
    return 'hook'
  }

  // React Component (PascalCase + possible JSX)
  if (name[0] === name[0].toUpperCase() && /^[A-Z]/.test(name)) {
    const hasJsx = node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                   node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0
    if (hasJsx) return 'component'
  }

  if (Node.isArrowFunction(node)) {
    return 'arrow'
  }

  return 'function'
}

// ============================================================
// 호출 분석
// ============================================================

function analyzeCallsInFile(
  sourceFile: SourceFile,
  filePath: string,
  functionMap: Map<string, FunctionNode>,
  edges: CallEdge[],
  apiCalls: ApiCall[],
  dbCalls: DbCall[]
): void {
  // 모든 함수/메서드 내부의 호출 분석
  const allCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const callExpr of allCalls) {
    // 호출이 어느 함수 안에 있는지 찾기
    const containingFunction = findContainingFunction(callExpr)
    if (!containingFunction) continue

    const fromId = containingFunction.id
    const line = callExpr.getStartLineNumber()

    // 호출 대상 분석
    const callInfo = analyzeCallExpression(callExpr)

    if (callInfo.type === 'api') {
      // API 호출
      apiCalls.push({
        id: `${filePath}:api:${line}`,
        method: callInfo.method as ApiCall['method'],
        path: callInfo.path || '/unknown',
        file: filePath,
        line,
        calledFrom: fromId,
        matchedRoute: callInfo.matchedRoute,
      })
    } else if (callInfo.type === 'db') {
      // DB 호출
      dbCalls.push({
        id: `${filePath}:db:${line}`,
        type: callInfo.dbType as DbCall['type'],
        table: callInfo.table || null,
        file: filePath,
        line,
        calledFrom: fromId,
      })
    } else if (callInfo.name) {
      // 일반 함수 호출 - 대상 함수 찾기
      const toNode = findTargetFunction(callInfo.name, functionMap, filePath)
      if (toNode) {
        edges.push({
          fromId,
          fromName: containingFunction.name,
          toId: toNode.id,
          toName: toNode.name,
          file: filePath,
          line,
          isAsync: callInfo.isAsync,
          isConditional: callInfo.isConditional,
          callType: 'function',
        })
      }
    }
  }

  function findContainingFunction(node: Node): FunctionNode | null {
    let current = node.getParent()
    while (current) {
      if (Node.isFunctionDeclaration(current)) {
        const name = current.getName()
        if (name) {
          const id = `${filePath}:${name}:${current.getStartLineNumber()}`
          return functionMap.get(id) || null
        }
      }
      if (Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
        // 변수 선언에서 이름 찾기
        const parent = current.getParent()
        if (Node.isVariableDeclaration(parent)) {
          const name = parent.getName()
          const id = `${filePath}:${name}:${parent.getStartLineNumber()}`
          return functionMap.get(id) || null
        }
      }
      if (Node.isMethodDeclaration(current)) {
        const cls = current.getParent()
        if (Node.isClassDeclaration(cls)) {
          const name = `${cls.getName()}.${current.getName()}`
          const id = `${filePath}:${name}:${current.getStartLineNumber()}`
          return functionMap.get(id) || null
        }
      }
      current = current.getParent()
    }
    return null
  }
}

interface CallInfo {
  name: string | null
  type: 'function' | 'api' | 'db' | 'external'
  isAsync: boolean
  isConditional: boolean
  // API 관련
  method?: string
  path?: string
  matchedRoute?: string
  // DB 관련
  dbType?: string
  table?: string
}

function analyzeCallExpression(callExpr: CallExpression): CallInfo {
  const expression = callExpr.getExpression()
  const text = expression.getText()

  // fetch() 호출 탐지
  if (text === 'fetch' || text.endsWith('.fetch')) {
    return analyzeFetchCall(callExpr)
  }

  // axios 호출 탐지
  if (text.startsWith('axios') || text.includes('axios.')) {
    return analyzeAxiosCall(callExpr)
  }

  // Supabase 호출 탐지
  if (text.includes('supabase') || text.includes('createClient')) {
    return analyzeSupabaseCall(callExpr)
  }

  // 일반 함수 호출
  const name = extractFunctionName(expression)
  const isAwait = callExpr.getParent()?.getKind() === SyntaxKind.AwaitExpression

  return {
    name,
    type: 'function',
    isAsync: isAwait,
    isConditional: isInConditional(callExpr),
  }
}

function analyzeFetchCall(callExpr: CallExpression): CallInfo {
  const args = callExpr.getArguments()
  let path = '/unknown'
  let method: string = 'GET'

  if (args[0]) {
    const urlArg = args[0].getText()
    // 문자열 리터럴에서 경로 추출
    const pathMatch = urlArg.match(/['"`]([^'"`]+)['"`]/)
    if (pathMatch) {
      path = pathMatch[1]
    }
  }

  if (args[1]) {
    const optionsText = args[1].getText()
    const methodMatch = optionsText.match(/method:\s*['"`](\w+)['"`]/)
    if (methodMatch) {
      method = methodMatch[1].toUpperCase()
    }
  }

  return {
    name: null,
    type: 'api',
    isAsync: true,
    isConditional: isInConditional(callExpr),
    method,
    path,
    matchedRoute: matchApiRoute(path),
  }
}

function analyzeAxiosCall(callExpr: CallExpression): CallInfo {
  const text = callExpr.getExpression().getText()
  let method = 'GET'

  if (text.includes('.get')) method = 'GET'
  else if (text.includes('.post')) method = 'POST'
  else if (text.includes('.put')) method = 'PUT'
  else if (text.includes('.delete')) method = 'DELETE'
  else if (text.includes('.patch')) method = 'PATCH'

  const args = callExpr.getArguments()
  let path = '/unknown'

  if (args[0]) {
    const urlArg = args[0].getText()
    const pathMatch = urlArg.match(/['"`]([^'"`]+)['"`]/)
    if (pathMatch) {
      path = pathMatch[1]
    }
  }

  return {
    name: null,
    type: 'api',
    isAsync: true,
    isConditional: isInConditional(callExpr),
    method,
    path,
    matchedRoute: matchApiRoute(path),
  }
}

function analyzeSupabaseCall(callExpr: CallExpression): CallInfo {
  const text = callExpr.getExpression().getText()
  let dbType: string = 'unknown'
  let table: string | null = null

  // .from('table').select() 패턴
  if (text.includes('.from')) {
    const fromMatch = text.match(/\.from\s*\(\s*['"`](\w+)['"`]\s*\)/)
    if (fromMatch) {
      table = fromMatch[1]
    }

    if (text.includes('.select')) dbType = 'select'
    else if (text.includes('.insert')) dbType = 'insert'
    else if (text.includes('.update')) dbType = 'update'
    else if (text.includes('.delete')) dbType = 'delete'
    else if (text.includes('.upsert')) dbType = 'upsert'
  }

  // .rpc() 패턴
  if (text.includes('.rpc')) {
    dbType = 'rpc'
    const rpcMatch = text.match(/\.rpc\s*\(\s*['"`](\w+)['"`]/)
    if (rpcMatch) {
      table = rpcMatch[1] // 실제로는 함수명
    }
  }

  // .auth 패턴
  if (text.includes('.auth.')) {
    dbType = 'auth'
  }

  return {
    name: null,
    type: 'db',
    isAsync: true,
    isConditional: isInConditional(callExpr),
    dbType,
    table: table ?? undefined,
  }
}

function extractFunctionName(expression: Node): string | null {
  const text = expression.getText()

  // 단순 함수 호출: functionName()
  if (Node.isIdentifier(expression)) {
    return text
  }

  // 메서드 호출: obj.method() - 마지막 부분만
  if (Node.isPropertyAccessExpression(expression)) {
    const parts = text.split('.')
    return parts[parts.length - 1]
  }

  return null
}

function matchApiRoute(path: string): string | undefined {
  // /api/로 시작하는 경로를 route.ts 파일로 매칭
  if (path.startsWith('/api/')) {
    const routePath = path.replace(/^\/api/, 'src/app/api')
    return `${routePath}/route.ts`
  }
  return undefined
}

function isInConditional(node: Node): boolean {
  let current = node.getParent()
  while (current) {
    if (
      Node.isIfStatement(current) ||
      Node.isConditionalExpression(current) ||
      Node.isSwitchStatement(current)
    ) {
      return true
    }
    current = current.getParent()
  }
  return false
}

function findTargetFunction(
  name: string,
  functionMap: Map<string, FunctionNode>,
  currentFile: string
): FunctionNode | null {
  // 같은 파일 내에서 먼저 찾기
  for (const [, node] of functionMap) {
    if (node.name === name && node.file === currentFile) {
      return node
    }
  }

  // 다른 파일에서 찾기 (export된 함수)
  for (const [, node] of functionMap) {
    if (node.name === name && node.isExported) {
      return node
    }
  }

  return null
}

// ============================================================
// 진입점 판별
// ============================================================

function isPageComponent(node: FunctionNode): boolean {
  return (
    node.type === 'component' &&
    (node.file.includes('/page.') ||
      node.file.includes('/pages/') ||
      node.name === 'default')
  )
}

function isApiRouteHandler(node: FunctionNode): boolean {
  return (
    node.type === 'handler' &&
    node.file.includes('/api/') &&
    node.file.includes('route.')
  )
}

function isEventHandler(node: FunctionNode): boolean {
  const handlerPatterns = [
    /^handle[A-Z]/,
    /^on[A-Z]/,
    /Click$/,
    /Submit$/,
    /Change$/,
  ]
  return handlerPatterns.some((pattern) => pattern.test(node.name))
}

// ============================================================
// Mermaid 생성
// ============================================================

export function generateCallGraphMermaid(result: CallGraphResult): string {
  const lines: string[] = ['flowchart LR']

  // 노드 추가 (상위 20개만)
  const topNodes = result.nodes
    .sort((a, b) => b.calledByCount - a.calledByCount)
    .slice(0, 20)

  const nodeIds = new Set(topNodes.map((n) => n.id))

  for (const node of topNodes) {
    const safeId = sanitizeId(node.id)
    let icon = ''

    if (node.type === 'component') icon = '🧩'
    else if (node.type === 'hook') icon = '🪝'
    else if (node.type === 'handler') icon = '⚡'

    lines.push(`  ${safeId}["${icon} ${node.name}"]`)

    // 스타일
    if (node.type === 'component') {
      lines.push(`  style ${safeId} fill:#dbeafe,stroke:#3b82f6`)
    } else if (node.type === 'hook') {
      lines.push(`  style ${safeId} fill:#dcfce7,stroke:#22c55e`)
    } else if (node.type === 'handler') {
      lines.push(`  style ${safeId} fill:#ffedd5,stroke:#f97316`)
    }
  }

  // 엣지 추가
  const addedEdges = new Set<string>()
  for (const edge of result.edges.slice(0, 50)) {
    if (!nodeIds.has(edge.fromId) || !nodeIds.has(edge.toId)) continue

    const edgeKey = `${edge.fromId}-${edge.toId}`
    if (addedEdges.has(edgeKey)) continue
    addedEdges.add(edgeKey)

    const fromId = sanitizeId(edge.fromId)
    const toId = sanitizeId(edge.toId)

    if (edge.isAsync) {
      lines.push(`  ${fromId} -.->|async| ${toId}`)
    } else {
      lines.push(`  ${fromId} --> ${toId}`)
    }
  }

  // API 호출 추가
  if (result.apiCalls.length > 0) {
    lines.push(`  API["🌐 API Calls"]`)
    lines.push(`  style API fill:#e0e7ff,stroke:#6366f1`)

    const apisAdded = new Set<string>()
    for (const api of result.apiCalls.slice(0, 5)) {
      if (nodeIds.has(api.calledFrom) && !apisAdded.has(api.path)) {
        const fromId = sanitizeId(api.calledFrom)
        lines.push(`  ${fromId} -.->|"${api.method} ${api.path}"| API`)
        apisAdded.add(api.path)
      }
    }
  }

  // DB 호출 추가
  if (result.dbCalls.length > 0) {
    lines.push(`  DB["🗄️ Supabase"]`)
    lines.push(`  style DB fill:#fef3c7,stroke:#f59e0b`)

    const dbsAdded = new Set<string>()
    for (const db of result.dbCalls.slice(0, 5)) {
      const key = `${db.calledFrom}-${db.type}-${db.table}`
      if (nodeIds.has(db.calledFrom) && !dbsAdded.has(key)) {
        const fromId = sanitizeId(db.calledFrom)
        const label = db.table ? `${db.type}(${db.table})` : db.type
        lines.push(`  ${fromId} -.->|"${label}"| DB`)
        dbsAdded.add(key)
      }
    }
  }

  return lines.join('\n')
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
}

// ============================================================
// Phase 2: 에러 전파 분석 (이슈 #43)
// ============================================================

export interface ErrorPropagation {
  functionId: string
  functionName: string
  file: string
  line: number
  hasErrorHandling: boolean
  hasTryCatch: boolean
  hasAsyncErrorHandling: boolean
  propagatesToCallers: boolean
  riskLevel: 'safe' | 'warning' | 'danger'
  riskReason?: string
}

export interface RiskPoint {
  path: string
  line?: number
  type: 'try-catch' | 'null-check' | 'error-boundary' | 'async-await' | 'type-assertion'
  severity: 'high' | 'medium' | 'low'
  description?: string
}

/**
 * 에러 전파 분석 - 각 함수의 에러 처리 상태를 분석
 */
export function analyzeErrorPropagation(
  callGraph: CallGraphResult,
  riskPoints: RiskPoint[]
): ErrorPropagation[] {
  const result: ErrorPropagation[] = []
  const riskMap = new Map<string, RiskPoint[]>()

  // 파일별 위험 지점 매핑
  for (const rp of riskPoints) {
    const existing = riskMap.get(rp.path) || []
    existing.push(rp)
    riskMap.set(rp.path, existing)
  }

  // 호출 관계 역 인덱스 구축 (누가 나를 호출하는지)
  const calledByMap = new Map<string, string[]>()
  for (const edge of callGraph.edges) {
    const existing = calledByMap.get(edge.toId) || []
    existing.push(edge.fromId)
    calledByMap.set(edge.toId, existing)
  }

  for (const node of callGraph.nodes) {
    const fileRisks = riskMap.get(node.file) || []
    const nodeRisks = fileRisks.filter(r => {
      if (!r.line) return true
      // 함수 범위 내에 있는 위험 지점만
      return r.line >= node.line && r.line <= node.line + 50
    })

    const hasTryCatch = nodeRisks.every(r => r.type !== 'try-catch')
    const hasAsyncErrorHandling = node.isAsync ? nodeRisks.every(r => r.type !== 'async-await') : true
    const hasErrorHandling = hasTryCatch && hasAsyncErrorHandling

    // 호출자에게 에러가 전파되는지 확인
    const callers = calledByMap.get(node.id) || []
    const propagatesToCallers = !hasErrorHandling && callers.length > 0

    // 위험 수준 결정
    let riskLevel: 'safe' | 'warning' | 'danger' = 'safe'
    let riskReason: string | undefined

    if (nodeRisks.some(r => r.severity === 'high')) {
      riskLevel = 'danger'
      riskReason = 'High severity risk detected'
    } else if (nodeRisks.some(r => r.severity === 'medium') || propagatesToCallers) {
      riskLevel = 'warning'
      riskReason = propagatesToCallers
        ? 'Errors may propagate to callers'
        : 'Medium severity risk detected'
    }

    result.push({
      functionId: node.id,
      functionName: node.name,
      file: node.file,
      line: node.line,
      hasErrorHandling,
      hasTryCatch,
      hasAsyncErrorHandling,
      propagatesToCallers,
      riskLevel,
      riskReason,
    })
  }

  return result
}

/**
 * 에러 전파 경로 추적 - 위험 지점에서 시작하여 호출자까지 역추적
 */
export function traceErrorPropagation(
  callGraph: CallGraphResult,
  riskPoints: RiskPoint[]
): string[][] {
  const paths: string[][] = []

  // 호출 관계 역 인덱스
  const calledByMap = new Map<string, string[]>()
  for (const edge of callGraph.edges) {
    const existing = calledByMap.get(edge.toId) || []
    existing.push(edge.fromId)
    calledByMap.set(edge.toId, existing)
  }

  // 위험 지점이 있는 함수 찾기
  for (const rp of riskPoints.filter(r => r.severity === 'high')) {
    const dangerFunctions = callGraph.nodes.filter(n => {
      return n.file === rp.path || n.file.includes(rp.path.replace('.ts', ''))
    })

    for (const func of dangerFunctions) {
      const path = [func.id]
      const visited = new Set<string>([func.id])

      // BFS로 호출자 추적 (최대 5단계)
      let current = [func.id]
      for (let depth = 0; depth < 5; depth++) {
        const nextLevel: string[] = []
        for (const id of current) {
          const callers = calledByMap.get(id) || []
          for (const caller of callers) {
            if (!visited.has(caller)) {
              visited.add(caller)
              nextLevel.push(caller)
              path.push(caller)
            }
          }
        }
        if (nextLevel.length === 0) break
        current = nextLevel
      }

      if (path.length > 1) {
        paths.push(path)
      }
    }
  }

  return paths.slice(0, 10) // 최대 10개 경로
}
