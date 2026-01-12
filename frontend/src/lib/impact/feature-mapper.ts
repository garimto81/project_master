/**
 * Feature Mapper - 파일 → 사용자 기능 매핑
 * PRD-0008 Phase 2: 영향도 분석
 *
 * 목적: 기술적인 파일명/함수명을 비개발자가 이해할 수 있는 기능명으로 변환
 *
 * 예시:
 * - LoginPage.tsx → "로그인"
 * - useAuth.ts → ["로그인", "회원가입", "프로필"]
 * - api/auth/route.ts → "인증"
 */

// ============================================================
// 기능 패턴 정의
// ============================================================

/**
 * 파일/함수명 패턴 → 사용자 기능 매핑
 * key: 사용자가 이해할 수 있는 기능명
 * value: 매칭 패턴 (RegExp[])
 */
export const FEATURE_PATTERNS: Record<string, RegExp[]> = {
  '로그인': [
    /login/i,
    /signin/i,
    /sign-in/i,
    /signIn/i,
  ],
  '회원가입': [
    /signup/i,
    /sign-up/i,
    /signUp/i,
    /register/i,
    /registration/i,
  ],
  '로그아웃': [
    /logout/i,
    /signout/i,
    /sign-out/i,
    /signOut/i,
  ],
  '프로필': [
    /profile/i,
    /user-info/i,
    /userInfo/i,
    /account/i,
  ],
  '인증': [
    /auth/i,
    /authentication/i,
    /authorize/i,
    /token/i,
    /session/i,
  ],
  '대시보드': [
    /dashboard/i,
    /home/i,
    /main/i,
    /overview/i,
  ],
  '설정': [
    /setting/i,
    /config/i,
    /preference/i,
  ],
  '코드 시각화': [
    /mermaid/i,
    /diagram/i,
    /visualization/i,
    /flowchart/i,
    /graph/i,
    /logic-flow/i,
    /call-graph/i,
  ],
  '이슈 관리': [
    /issue/i,
    /ticket/i,
    /bug/i,
    /task/i,
  ],
  '레포지토리': [
    /repo/i,
    /repository/i,
    /project/i,
  ],
  '검색': [
    /search/i,
    /find/i,
    /query/i,
  ],
  '알림': [
    /notification/i,
    /alert/i,
    /toast/i,
  ],
  '파일 관리': [
    /file/i,
    /upload/i,
    /download/i,
    /attachment/i,
  ],
  '댓글': [
    /comment/i,
    /reply/i,
    /discussion/i,
  ],
}

/**
 * 특수 파일 패턴: 여러 기능에 영향을 주는 파일
 * 예: useAuth.ts는 로그인, 회원가입, 프로필 모두에 영향
 */
const MULTI_FEATURE_FILES: Record<string, string[]> = {
  'useAuth': ['로그인', '회원가입', '프로필'],
  'auth.ts': ['로그인', '회원가입', '프로필', '인증'],
  'supabase': ['로그인', '회원가입', '인증'],
  'session': ['로그인', '인증'],
  'authProvider': ['로그인', '회원가입', '프로필'],
}

// ============================================================
// 메인 함수
// ============================================================

/**
 * 파일 목록을 사용자 기능 목록으로 변환
 * @param files - 파일 경로 배열
 * @returns 고유한 사용자 기능 배열
 */
export function mapToUserFeatures(files: string[]): string[] {
  if (!files || files.length === 0) {
    return []
  }

  const featuresSet = new Set<string>()

  for (const file of files) {
    const features = mapFileToFeatures(file)
    for (const feature of features) {
      featuresSet.add(feature)
    }
  }

  return Array.from(featuresSet)
}

/**
 * 단일 파일을 사용자 기능으로 매핑
 * @param filePath - 파일 경로
 * @returns 관련 기능 배열
 */
export function mapFileToFeatures(filePath: string): string[] {
  const features: string[] = []
  const fileName = extractFileName(filePath)
  const normalizedPath = filePath.toLowerCase()

  // 1. 특수 파일 체크 (여러 기능에 영향)
  for (const [pattern, mappedFeatures] of Object.entries(MULTI_FEATURE_FILES)) {
    if (normalizedPath.includes(pattern.toLowerCase())) {
      features.push(...mappedFeatures)
    }
  }

  // 2. 일반 패턴 매칭
  for (const [featureName, patterns] of Object.entries(FEATURE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fileName) || pattern.test(filePath)) {
        if (!features.includes(featureName)) {
          features.push(featureName)
        }
        break // 같은 기능에 대해 중복 추가 방지
      }
    }
  }

  return features
}

/**
 * 함수명을 사용자 기능으로 매핑
 * @param functionName - 함수명
 * @returns 관련 기능 배열
 */
export function mapFunctionToFeatures(functionName: string): string[] {
  const features: string[] = []

  // 특수 함수 체크
  for (const [pattern, mappedFeatures] of Object.entries(MULTI_FEATURE_FILES)) {
    if (functionName.toLowerCase().includes(pattern.toLowerCase())) {
      features.push(...mappedFeatures)
    }
  }

  // 일반 패턴 매칭
  for (const [featureName, patterns] of Object.entries(FEATURE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(functionName)) {
        if (!features.includes(featureName)) {
          features.push(featureName)
        }
        break
      }
    }
  }

  return features
}

/**
 * 영향받는 파일 목록에서 사용자 친화적인 요약 생성
 * @param files - 영향받는 파일 목록
 * @returns 사용자 친화적인 요약 문자열
 */
export function generateFeatureSummary(files: string[]): string {
  const features = mapToUserFeatures(files)

  if (features.length === 0) {
    return '영향받는 주요 기능이 없습니다.'
  }

  if (features.length === 1) {
    return `영향받는 기능: ${features[0]}`
  }

  if (features.length <= 3) {
    return `영향받는 기능: ${features.join(', ')}`
  }

  return `영향받는 기능: ${features.slice(0, 3).join(', ')} 외 ${features.length - 3}개`
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 파일 경로에서 파일명 추출
 */
function extractFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

/**
 * 기능 우선순위 정렬 (중요한 기능 먼저)
 */
export function sortFeaturesByPriority(features: string[]): string[] {
  const priorityOrder = [
    '로그인',
    '회원가입',
    '인증',
    '대시보드',
    '프로필',
    '설정',
    '코드 시각화',
    '이슈 관리',
    '레포지토리',
    '검색',
    '알림',
    '파일 관리',
    '댓글',
  ]

  return features.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a)
    const bIndex = priorityOrder.indexOf(b)

    // 우선순위에 없는 항목은 맨 뒤로
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1

    return aIndex - bIndex
  })
}
