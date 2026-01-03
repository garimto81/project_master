/**
 * AST Analyzer - ts-morph 기반 심층 코드 분석
 * PRD-0007: 코드 시각화 시스템 재설계
 *
 * 기능:
 * - 함수/클래스/타입 추출
 * - Export 패턴 기반 레이어 분류
 * - React 컴포넌트, Custom Hook 판별
 * - API Route Handler 탐지
 * - Supabase/DB 호출 탐지
 */

import { Project, SourceFile, Node, SyntaxKind, FunctionDeclaration, ArrowFunction, MethodDeclaration, ClassDeclaration } from 'ts-morph'

// ============================================================
// 타입 정의
// ============================================================

export type LayerType = 'ui' | 'logic' | 'api' | 'data' | 'lib' | 'unknown'

export interface FunctionInfo {
  id: string
  name: string
  file: string
  line: number
  type: 'function' | 'method' | 'arrow' | 'component' | 'hook'
  isExported: boolean
  isAsync: boolean
  parameters: ParameterInfo[]
  returnType: string | null
}

export interface ParameterInfo {
  name: string
  type: string | null
  isOptional: boolean
}

export interface ClassInfo {
  id: string
  name: string
  file: string
  line: number
  isExported: boolean
  extends: string | null
  implements: string[]
  methods: FunctionInfo[]
  properties: PropertyInfo[]
}

export interface PropertyInfo {
  name: string
  type: string | null
  isStatic: boolean
  visibility: 'public' | 'private' | 'protected'
}

export interface ExportInfo {
  name: string
  type: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'default'
  line: number
}

export interface ImportInfo {
  source: string
  imports: string[]
  isTypeOnly: boolean
  line: number
}

export interface FileAnalysis {
  path: string
  layer: LayerType
  functions: FunctionInfo[]
  classes: ClassInfo[]
  exports: ExportInfo[]
  imports: ImportInfo[]
  hasJsx: boolean
  hasSupabase: boolean
  isApiRoute: boolean
}

export interface AnalysisStats {
  totalFiles: number
  totalFunctions: number
  totalClasses: number
  analysisTimeMs: number
  byLayer: Record<LayerType, number>
}

export interface AstAnalysisResult {
  files: FileAnalysis[]
  stats: AnalysisStats
}

// ============================================================
// 핵심 분석 함수
// ============================================================

/**
 * 소스 코드 문자열을 분석합니다
 */
export function analyzeSourceCode(
  code: string,
  filePath: string
): FileAnalysis {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      jsx: 2, // React
      target: 99, // ESNext
      module: 99, // ESNext
      strict: true,
    },
  })

  const sourceFile = project.createSourceFile(filePath, code)
  return analyzeSourceFile(sourceFile, filePath)
}

/**
 * SourceFile을 분석합니다
 */
export function analyzeSourceFile(
  sourceFile: SourceFile,
  filePath: string
): FileAnalysis {
  const functions = extractFunctions(sourceFile, filePath)
  const classes = extractClasses(sourceFile, filePath)
  const exports = extractExports(sourceFile)
  const imports = extractImports(sourceFile)
  const hasJsx = checkHasJsx(sourceFile)
  const hasSupabase = checkHasSupabase(sourceFile)
  const isApiRoute = checkIsApiRoute(sourceFile, filePath)

  const layer = classifyLayer(sourceFile, filePath, {
    hasJsx,
    hasSupabase,
    isApiRoute,
    functions,
    exports,
  })

  return {
    path: filePath,
    layer,
    functions,
    classes,
    exports,
    imports,
    hasJsx,
    hasSupabase,
    isApiRoute,
  }
}

// ============================================================
// 함수 추출
// ============================================================

function extractFunctions(sourceFile: SourceFile, filePath: string): FunctionInfo[] {
  const functions: FunctionInfo[] = []

  // 일반 함수 선언
  sourceFile.getFunctions().forEach((func) => {
    const info = extractFunctionInfo(func, filePath, 'function')
    if (info) functions.push(info)
  })

  // 변수에 할당된 화살표 함수
  sourceFile.getVariableDeclarations().forEach((varDecl) => {
    const initializer = varDecl.getInitializer()
    if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
      const name = varDecl.getName()
      const line = varDecl.getStartLineNumber()
      const isExported = varDecl.isExported()
      const isAsync = initializer.isAsync?.() || false

      const funcType = detectFunctionType(name, initializer)

      functions.push({
        id: `${filePath}:${name}:${line}`,
        name,
        file: filePath,
        line,
        type: funcType,
        isExported,
        isAsync,
        parameters: extractParameters(initializer),
        returnType: getReturnType(initializer),
      })
    }
  })

  return functions
}

function extractFunctionInfo(
  func: FunctionDeclaration,
  filePath: string,
  defaultType: 'function' | 'method' | 'arrow' | 'component' | 'hook'
): FunctionInfo | null {
  const name = func.getName()
  if (!name) return null

  const line = func.getStartLineNumber()
  const funcType = detectFunctionType(name, func)

  return {
    id: `${filePath}:${name}:${line}`,
    name,
    file: filePath,
    line,
    type: funcType !== 'function' ? funcType : defaultType,
    isExported: func.isExported(),
    isAsync: func.isAsync(),
    parameters: extractParameters(func),
    returnType: getReturnType(func),
  }
}

function detectFunctionType(
  name: string,
  node: Node
): 'function' | 'method' | 'arrow' | 'component' | 'hook' {
  // Custom Hook 판별 (use* prefix)
  if (name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase()) {
    return 'hook'
  }

  // React 컴포넌트 판별 (PascalCase + JSX 반환)
  if (name[0] === name[0].toUpperCase() && containsJsxReturn(node)) {
    return 'component'
  }

  // 화살표 함수
  if (Node.isArrowFunction(node)) {
    return 'arrow'
  }

  return 'function'
}

function containsJsxReturn(node: Node): boolean {
  // JSX 요소가 있는지 확인
  const jsxElements = node.getDescendantsOfKind(SyntaxKind.JsxElement)
  const jsxSelfClosing = node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
  const jsxFragment = node.getDescendantsOfKind(SyntaxKind.JsxFragment)

  return jsxElements.length > 0 || jsxSelfClosing.length > 0 || jsxFragment.length > 0
}

function extractParameters(node: FunctionDeclaration | ArrowFunction | MethodDeclaration | Node): ParameterInfo[] {
  if (!('getParameters' in node)) return []

  return (node as FunctionDeclaration).getParameters().map((param) => ({
    name: param.getName(),
    type: param.getType()?.getText() || null,
    isOptional: param.isOptional(),
  }))
}

function getReturnType(node: Node): string | null {
  if ('getReturnType' in node) {
    const returnType = (node as FunctionDeclaration).getReturnType()
    if (returnType) {
      const typeText = returnType.getText()
      // 너무 긴 타입은 간소화
      if (typeText.length > 100) {
        return typeText.substring(0, 97) + '...'
      }
      return typeText
    }
  }
  return null
}

// ============================================================
// 클래스 추출
// ============================================================

function extractClasses(sourceFile: SourceFile, filePath: string): ClassInfo[] {
  return sourceFile.getClasses().map((cls) => {
    const name = cls.getName() || 'AnonymousClass'
    const line = cls.getStartLineNumber()

    return {
      id: `${filePath}:${name}:${line}`,
      name,
      file: filePath,
      line,
      isExported: cls.isExported(),
      extends: cls.getExtends()?.getText() || null,
      implements: cls.getImplements().map((impl) => impl.getText()),
      methods: extractMethods(cls, filePath),
      properties: extractProperties(cls),
    }
  })
}

function extractMethods(cls: ClassDeclaration, filePath: string): FunctionInfo[] {
  return cls.getMethods().map((method) => {
    const name = method.getName()
    const line = method.getStartLineNumber()

    return {
      id: `${filePath}:${cls.getName()}:${name}:${line}`,
      name,
      file: filePath,
      line,
      type: 'method',
      isExported: false, // 메서드는 직접 export되지 않음
      isAsync: method.isAsync(),
      parameters: extractParameters(method),
      returnType: getReturnType(method),
    }
  })
}

function extractProperties(cls: ClassDeclaration): PropertyInfo[] {
  return cls.getProperties().map((prop) => ({
    name: prop.getName(),
    type: prop.getType()?.getText() || null,
    isStatic: prop.isStatic(),
    visibility: prop.getScope() as 'public' | 'private' | 'protected',
  }))
}

// ============================================================
// Export/Import 추출
// ============================================================

function extractExports(sourceFile: SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = []

  // Named exports
  sourceFile.getExportDeclarations().forEach((exp) => {
    exp.getNamedExports().forEach((named) => {
      exports.push({
        name: named.getName(),
        type: 'variable',
        line: exp.getStartLineNumber(),
      })
    })
  })

  // Exported declarations
  sourceFile.getExportedDeclarations().forEach((declarations, name) => {
    declarations.forEach((decl) => {
      let type: ExportInfo['type'] = 'variable'

      if (Node.isFunctionDeclaration(decl)) type = 'function'
      else if (Node.isClassDeclaration(decl)) type = 'class'
      else if (Node.isInterfaceDeclaration(decl)) type = 'interface'
      else if (Node.isTypeAliasDeclaration(decl)) type = 'type'

      exports.push({
        name,
        type,
        line: decl.getStartLineNumber(),
      })
    })
  })

  // Default export
  const defaultExport = sourceFile.getDefaultExportSymbol()
  if (defaultExport) {
    exports.push({
      name: 'default',
      type: 'default',
      line: 1, // 정확한 라인은 복잡하므로 1로 설정
    })
  }

  return exports
}

function extractImports(sourceFile: SourceFile): ImportInfo[] {
  return sourceFile.getImportDeclarations().map((imp) => {
    const namedImports = imp.getNamedImports().map((n) => n.getName())
    const defaultImport = imp.getDefaultImport()?.getText()
    const namespaceImport = imp.getNamespaceImport()?.getText()

    const imports: string[] = [
      ...namedImports,
      ...(defaultImport ? [defaultImport] : []),
      ...(namespaceImport ? [`* as ${namespaceImport}`] : []),
    ]

    return {
      source: imp.getModuleSpecifierValue(),
      imports,
      isTypeOnly: imp.isTypeOnly(),
      line: imp.getStartLineNumber(),
    }
  })
}

// ============================================================
// 탐지 함수
// ============================================================

function checkHasJsx(sourceFile: SourceFile): boolean {
  const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement)
  const jsxSelfClosing = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
  const jsxFragment = sourceFile.getDescendantsOfKind(SyntaxKind.JsxFragment)

  return jsxElements.length > 0 || jsxSelfClosing.length > 0 || jsxFragment.length > 0
}

function checkHasSupabase(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText()

  // Supabase 관련 패턴
  const supabasePatterns = [
    /supabase\./i,
    /createClient/,
    /createBrowserClient/,
    /createServerClient/,
    /@supabase/,
    /\.from\s*\(/,
    /\.auth\./,
  ]

  return supabasePatterns.some((pattern) => pattern.test(text))
}

function checkIsApiRoute(sourceFile: SourceFile, filePath: string): boolean {
  // 경로 기반 판별
  const isApiPath = /\/api\//.test(filePath) && /route\.(ts|js)$/.test(filePath)

  if (!isApiPath) return false

  // HTTP 메서드 export 확인
  const exports = sourceFile.getExportedDeclarations()
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

  for (const method of httpMethods) {
    if (exports.has(method)) return true
  }

  return false
}

// ============================================================
// 레이어 분류 (PRD 핵심 로직)
// ============================================================

interface ClassifyContext {
  hasJsx: boolean
  hasSupabase: boolean
  isApiRoute: boolean
  functions: FunctionInfo[]
  exports: ExportInfo[]
}

function classifyLayer(
  sourceFile: SourceFile,
  filePath: string,
  context: ClassifyContext
): LayerType {
  // 1. API Route 우선
  if (context.isApiRoute) {
    return 'api'
  }

  // 2. Supabase/DB 호출이 있으면 data
  if (context.hasSupabase) {
    // 단, UI에서 직접 호출하는 경우도 있으므로 추가 확인
    if (!context.hasJsx) {
      return 'data'
    }
  }

  // 3. React 컴포넌트 (JSX 포함)
  if (context.hasJsx) {
    return 'ui'
  }

  // 4. Custom Hook (use* prefix로 export)
  const hasHook = context.functions.some((f) => f.type === 'hook' && f.isExported)
  if (hasHook) {
    return 'logic'
  }

  // 5. 경로 기반 휴리스틱 (폴백)
  const lowerPath = filePath.toLowerCase()

  if (lowerPath.includes('/components/') || lowerPath.includes('/pages/')) {
    return 'ui'
  }

  if (lowerPath.includes('/api/')) {
    return 'api'
  }

  if (lowerPath.includes('/hooks/') || lowerPath.includes('/services/') || lowerPath.includes('/stores/')) {
    return 'logic'
  }

  if (lowerPath.includes('/lib/') || lowerPath.includes('/utils/') || lowerPath.includes('/helpers/')) {
    return 'lib'
  }

  return 'unknown'
}

// ============================================================
// 배치 분석
// ============================================================

/**
 * 여러 파일을 배치로 분석합니다
 */
export function analyzeMultipleFiles(
  files: Array<{ path: string; content: string }>
): AstAnalysisResult {
  const startTime = Date.now()

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      jsx: 2,
      target: 99,
      module: 99,
      strict: false, // 배치 분석에서는 관대하게
      skipLibCheck: true,
    },
  })

  // 모든 파일 추가
  for (const file of files) {
    try {
      project.createSourceFile(file.path, file.content)
    } catch {
      // 파싱 실패한 파일은 건너뜀
      console.warn(`Failed to parse: ${file.path}`)
    }
  }

  // 분석 실행
  const analysisResults: FileAnalysis[] = []
  const byLayer: Record<LayerType, number> = {
    ui: 0,
    logic: 0,
    api: 0,
    data: 0,
    lib: 0,
    unknown: 0,
  }

  for (const sourceFile of project.getSourceFiles()) {
    try {
      const result = analyzeSourceFile(sourceFile, sourceFile.getFilePath())
      analysisResults.push(result)
      byLayer[result.layer]++
    } catch {
      console.warn(`Failed to analyze: ${sourceFile.getFilePath()}`)
    }
  }

  const endTime = Date.now()

  return {
    files: analysisResults,
    stats: {
      totalFiles: analysisResults.length,
      totalFunctions: analysisResults.reduce((sum, f) => sum + f.functions.length, 0),
      totalClasses: analysisResults.reduce((sum, f) => sum + f.classes.length, 0),
      analysisTimeMs: endTime - startTime,
      byLayer,
    },
  }
}

// ============================================================
// 유틸리티
// ============================================================

/**
 * React 컴포넌트인지 판별
 */
export function isReactComponent(func: FunctionInfo): boolean {
  return func.type === 'component'
}

/**
 * Custom Hook인지 판별
 */
export function isCustomHook(func: FunctionInfo): boolean {
  return func.type === 'hook'
}

/**
 * API Route Handler인지 판별
 */
export function isApiRouteHandler(exportInfo: ExportInfo): boolean {
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
  return httpMethods.includes(exportInfo.name.toUpperCase())
}
