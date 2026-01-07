/**
 * Ollama Local LLM Client
 * Local Ollama (Qwen3) 모델을 사용한 코드 분석
 *
 * Issues: #61, #62
 */

// Ollama API 설정
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3'
const TIMEOUT_MS = 30000

interface OllamaGenerateRequest {
  model: string
  prompt: string
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    num_predict?: number
  }
}

interface OllamaGenerateResponse {
  model: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
}

interface ModuleAnalysis {
  title: string
  description: string
  role: string
  inputs: string[]
  outputs: string[]
  relatedModules: string[]
}

// 캐시 (동일 코드 재분석 방지)
const analysisCache = new Map<string, ModuleAnalysis>()
const CACHE_TTL = 10 * 60 * 1000 // 10분

/**
 * Ollama API 호출
 */
async function callOllama(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 512,
        },
      } as OllamaGenerateRequest),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data: OllamaGenerateResponse = await response.json()
    return data.response.trim()
  } catch (error) {
    console.error('[Ollama] API call failed:', error)
    throw error
  }
}

/**
 * Ollama 서버 상태 확인
 */
export async function checkOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return { available: false, models: [] }
    }

    const data = await response.json()
    const models = (data.models || []).map((m: { name: string }) => m.name)

    return { available: true, models }
  } catch {
    return { available: false, models: [] }
  }
}

/**
 * 모듈 제목 생성 (Issue #61)
 * 코드를 분석하여 비개발자 친화적인 한글 제목 생성
 */
export async function generateModuleTitle(
  code: string,
  fileName: string,
  layer: string
): Promise<{ title: string; icon: string }> {
  const cacheKey = `title:${fileName}:${code.slice(0, 100)}`
  const cached = analysisCache.get(cacheKey)
  if (cached) {
    return { title: cached.title, icon: getLayerIcon(layer) }
  }

  const prompt = `다음 코드를 분석하고, 비개발자가 이해할 수 있는 한글 제목을 생성하세요.

파일명: ${fileName}
레이어: ${layer}
코드:
\`\`\`
${code.slice(0, 1500)}
\`\`\`

규칙:
1. 10자 이내의 간결한 한글 제목
2. 기능을 명확히 설명
3. 기술 용어 대신 일상 용어 사용
4. 예시: "GitHub 로그인 처리", "사용자 목록 조회", "결제 승인"

제목만 출력하세요 (설명 없이):`

  try {
    const response = await callOllama(prompt)
    // 첫 줄만 추출, 따옴표 제거
    const title = response.split('\n')[0].replace(/['"]/g, '').trim()

    // 캐시 저장
    analysisCache.set(cacheKey, {
      title,
      description: '',
      role: '',
      inputs: [],
      outputs: [],
      relatedModules: [],
    })

    return { title: title || fileName, icon: getLayerIcon(layer) }
  } catch {
    // Fallback: 파일명 기반 제목
    return { title: humanizeFileName(fileName), icon: getLayerIcon(layer) }
  }
}

/**
 * 모듈 설명 생성 (Issue #62)
 * 코드를 분석하여 상세한 설명 생성
 */
export async function generateModuleDescription(
  code: string,
  fileName: string,
  layer: string
): Promise<ModuleAnalysis> {
  const cacheKey = `desc:${fileName}:${code.slice(0, 100)}`
  const cached = analysisCache.get(cacheKey)
  if (cached && cached.description) {
    return cached
  }

  const prompt = `다음 코드를 분석하고, 비개발자가 이해할 수 있도록 설명하세요.

파일명: ${fileName}
레이어: ${layer}
코드:
\`\`\`
${code.slice(0, 2000)}
\`\`\`

다음 형식으로 JSON만 출력하세요:
{
  "title": "10자 이내 한글 제목",
  "role": "이 모듈이 하는 일 (1문장)",
  "inputs": ["필요한 데이터 1", "필요한 데이터 2"],
  "outputs": ["결과물 1", "결과물 2"],
  "relatedModules": ["연관 모듈명 1", "연관 모듈명 2"]
}

규칙:
1. 비개발자 친화적 용어 사용
2. 기술 용어는 괄호 안에 원본 표시
3. 입력/출력은 최대 3개`

  try {
    const response = await callOllama(prompt)

    // JSON 파싱 시도
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const analysis: ModuleAnalysis = {
        title: parsed.title || humanizeFileName(fileName),
        description: parsed.role || '',
        role: parsed.role || '',
        inputs: parsed.inputs || [],
        outputs: parsed.outputs || [],
        relatedModules: parsed.relatedModules || [],
      }

      // 캐시 저장
      analysisCache.set(cacheKey, analysis)
      return analysis
    }

    throw new Error('Invalid JSON response')
  } catch {
    // Fallback: 기본 설명
    return {
      title: humanizeFileName(fileName),
      description: getDefaultDescription(layer),
      role: getDefaultDescription(layer),
      inputs: [],
      outputs: [],
      relatedModules: [],
    }
  }
}

/**
 * 함수 호출 관계 분석 (Issue #60)
 * 코드를 분석하여 인과관계 추출
 */
export async function analyzeFunctionCausality(
  code: string,
  functionName: string
): Promise<{
  triggers: string[]      // 이 함수를 호출하는 이벤트/함수
  effects: string[]       // 이 함수가 발생시키는 효과
  dataFlow: string[]      // 데이터 흐름 설명
}> {
  const prompt = `다음 함수의 인과관계를 분석하세요.

함수명: ${functionName}
코드:
\`\`\`
${code.slice(0, 1500)}
\`\`\`

다음 형식으로 JSON만 출력하세요:
{
  "triggers": ["이 함수를 호출하는 트리거 (예: 버튼 클릭, 페이지 로드)"],
  "effects": ["이 함수가 발생시키는 효과 (예: 데이터 저장, 화면 갱신)"],
  "dataFlow": ["데이터 흐름 설명 (예: 사용자 입력 -> 서버 전송 -> 결과 표시)"]
}

규칙:
1. 비개발자 친화적 용어
2. 각 항목 최대 3개
3. 화살표(->)로 흐름 표시`

  try {
    const response = await callOllama(prompt)

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        triggers: parsed.triggers || [],
        effects: parsed.effects || [],
        dataFlow: parsed.dataFlow || [],
      }
    }

    throw new Error('Invalid JSON response')
  } catch {
    return {
      triggers: [],
      effects: [],
      dataFlow: [],
    }
  }
}

/**
 * 배치 분석 (여러 모듈 동시 분석)
 */
export async function batchAnalyzeModules(
  modules: Array<{ code: string; fileName: string; layer: string }>
): Promise<Map<string, ModuleAnalysis>> {
  const results = new Map<string, ModuleAnalysis>()

  // 병렬 처리 (최대 3개 동시)
  const BATCH_SIZE = 3
  for (let i = 0; i < modules.length; i += BATCH_SIZE) {
    const batch = modules.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(async (mod) => {
        const analysis = await generateModuleDescription(mod.code, mod.fileName, mod.layer)
        return { fileName: mod.fileName, analysis }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.fileName, result.value.analysis)
      }
    }
  }

  return results
}

// ============================================================
// 유틸리티 함수
// ============================================================

function getLayerIcon(layer: string): string {
  const icons: Record<string, string> = {
    ui: '🖥️',
    logic: '⚙️',
    api: '🌐',
    server: '🌐',
    data: '💾',
    lib: '🔧',
  }
  return icons[layer] || '📄'
}

function humanizeFileName(fileName: string): string {
  // CamelCase -> 공백 분리 -> 한글화
  const words = fileName
    .replace(/\.(tsx?|jsx?|py)$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase()
    .split(' ')

  const translations: Record<string, string> = {
    login: '로그인',
    logout: '로그아웃',
    auth: '인증',
    user: '사용자',
    dashboard: '대시보드',
    home: '홈',
    page: '페이지',
    component: '컴포넌트',
    form: '입력폼',
    list: '목록',
    detail: '상세',
    create: '생성',
    edit: '수정',
    delete: '삭제',
    search: '검색',
    filter: '필터',
    route: '라우트',
    handler: '처리기',
    service: '서비스',
    hook: '훅',
    util: '유틸',
    helper: '헬퍼',
  }

  const translated = words.map(w => translations[w] || w)
  return translated.join(' ')
}

function getDefaultDescription(layer: string): string {
  const descriptions: Record<string, string> = {
    ui: '사용자에게 보여지는 화면 컴포넌트입니다.',
    logic: '비즈니스 로직을 처리하는 모듈입니다.',
    api: '서버와 통신하는 API 모듈입니다.',
    server: '서버 요청을 처리하는 모듈입니다.',
    data: '데이터를 저장하고 관리하는 모듈입니다.',
    lib: '공통으로 사용되는 유틸리티 모듈입니다.',
  }
  return descriptions[layer] || '기능 모듈입니다.'
}

// 캐시 정리 (10분마다)
setInterval(() => {
  analysisCache.clear()
}, CACHE_TTL)

export { analysisCache }
