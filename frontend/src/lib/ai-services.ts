/**
 * AI 서비스 유틸리티
 * 비개발자를 위한 AI 웹사이트 리다이렉트 방식 지원
 */

// AI 서비스 웹 URL
export const AI_WEB_URLS: Record<string, string> = {
  claude: 'https://claude.ai/new',
  'gpt-4o': 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/',
  qwen: 'https://tongyi.aliyun.com/qianwen/',
}

// AI 서비스 이름
export const AI_SERVICE_NAMES: Record<string, string> = {
  claude: 'Claude',
  'gpt-4o': 'ChatGPT',
  gemini: 'Gemini',
  qwen: 'Qwen',
}

// 이슈 정보 타입
export interface IssueInfo {
  number: number
  title: string
  body?: string
  labels?: string[]
  state?: string
}

/**
 * 이슈 해결을 위한 프롬프트 생성
 */
export function generatePrompt(issue: IssueInfo, additionalContext?: string): string {
  const labelsText = issue.labels && issue.labels.length > 0
    ? `- 라벨: ${issue.labels.join(', ')}\n`
    : ''

  const bodyText = issue.body
    ? `\n### 이슈 내용\n${issue.body}\n`
    : ''

  const contextText = additionalContext
    ? `\n### 추가 컨텍스트\n${additionalContext}`
    : ''

  return `## 이슈 해결 요청

### 이슈 정보
- 이슈 번호: #${issue.number}
- 제목: ${issue.title}
${labelsText}${bodyText}
### 요청 사항
위 이슈를 해결하는 코드를 작성해주세요.

### 응답 형식
수정이 필요한 코드를 마크다운 코드 블록(\`\`\`)으로 감싸서 제공해주세요.

예시:
\`\`\`typescript
// 수정된 코드
function example() {
  return 'fixed'
}
\`\`\`
${contextText}`
}

/**
 * AI 응답에서 코드 블록 추출
 */
export function extractCodeBlocks(response: string): Array<{ language: string; code: string }> {
  const blocks: Array<{ language: string; code: string }> = []
  const regex = /```(\w*)\n([\s\S]*?)```/g
  let match

  while ((match = regex.exec(response)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    })
  }

  return blocks
}

/**
 * AI 응답에서 첫 번째 코드 블록 추출
 */
export function extractFirstCodeBlock(response: string): { code: string; output: string } {
  const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/)
  const code = codeMatch ? codeMatch[1].trim() : ''

  return {
    code,
    output: response,
  }
}

/**
 * 클립보드에 텍스트 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('클립보드 복사 실패:', err)
    return false
  }
}

/**
 * AI 서비스 웹사이트 열기
 */
export function openAIService(modelId: string): boolean {
  const url = AI_WEB_URLS[modelId]
  if (!url) {
    console.error('알 수 없는 AI 모델:', modelId)
    return false
  }

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/**
 * AI 서비스 URL 가져오기
 */
export function getAIServiceUrl(modelId: string): string | null {
  return AI_WEB_URLS[modelId] || null
}

/**
 * AI 서비스 이름 가져오기
 */
export function getAIServiceName(modelId: string): string {
  return AI_SERVICE_NAMES[modelId] || modelId
}
