/**
 * 함수명 → 비개발자 친화적 라벨 변환
 * PRD-0007: 비개발자 친화적 다이어그램
 */

// 키워드 → 한글 기능명 매핑
const KEYWORD_MAP: Record<string, { label: string; icon: string }> = {
  // 인증 관련
  login: { label: '로그인', icon: '🔐' },
  logout: { label: '로그아웃', icon: '🚪' },
  auth: { label: '인증', icon: '✅' },
  signin: { label: '로그인', icon: '🔐' },
  signout: { label: '로그아웃', icon: '🚪' },
  signup: { label: '회원가입', icon: '📝' },
  register: { label: '회원가입', icon: '📝' },
  password: { label: '비밀번호', icon: '🔑' },

  // 사용자 관련
  user: { label: '회원', icon: '👤' },
  profile: { label: '프로필', icon: '👤' },
  account: { label: '계정', icon: '👤' },
  member: { label: '회원', icon: '👥' },

  // 화면 관련
  dashboard: { label: '대시보드', icon: '📊' },
  home: { label: '홈', icon: '🏠' },
  main: { label: '메인', icon: '🏠' },
  page: { label: '화면', icon: '📄' },
  modal: { label: '팝업', icon: '💬' },
  dialog: { label: '팝업', icon: '💬' },

  // 데이터 관련
  list: { label: '목록', icon: '📋' },
  detail: { label: '상세', icon: '🔍' },
  form: { label: '입력폼', icon: '📝' },
  table: { label: '표', icon: '📊' },
  card: { label: '카드', icon: '🃏' },

  // CRUD 관련
  create: { label: '생성', icon: '➕' },
  add: { label: '추가', icon: '➕' },
  new: { label: '새로만들기', icon: '✨' },
  edit: { label: '수정', icon: '✏️' },
  update: { label: '수정', icon: '✏️' },
  delete: { label: '삭제', icon: '🗑️' },
  remove: { label: '삭제', icon: '🗑️' },
  save: { label: '저장', icon: '💾' },
  submit: { label: '제출', icon: '📤' },

  // 검색/필터
  search: { label: '검색', icon: '🔍' },
  filter: { label: '필터', icon: '🔽' },
  sort: { label: '정렬', icon: '↕️' },

  // 네비게이션
  nav: { label: '메뉴', icon: '☰' },
  menu: { label: '메뉴', icon: '☰' },
  header: { label: '상단', icon: '⬆️' },
  footer: { label: '하단', icon: '⬇️' },
  sidebar: { label: '사이드바', icon: '◀️' },

  // 설정
  setting: { label: '설정', icon: '⚙️' },
  config: { label: '설정', icon: '⚙️' },
  option: { label: '옵션', icon: '🎛️' },
  preference: { label: '환경설정', icon: '⚙️' },

  // API/서버
  route: { label: '서버처리', icon: '🌐' },
  api: { label: 'API', icon: '🔌' },
  endpoint: { label: '엔드포인트', icon: '🔌' },
  handler: { label: '처리', icon: '⚡' },
  controller: { label: '제어', icon: '🎮' },

  // 서비스/로직
  service: { label: '처리', icon: '⚙️' },
  util: { label: '도구', icon: '🔧' },
  helper: { label: '도우미', icon: '🤝' },
  hook: { label: '훅', icon: '🪝' },
  store: { label: '저장소', icon: '📦' },

  // 알림/메시지
  notification: { label: '알림', icon: '🔔' },
  alert: { label: '경고', icon: '⚠️' },
  message: { label: '메시지', icon: '💬' },
  toast: { label: '알림', icon: '🔔' },

  // 파일/미디어
  file: { label: '파일', icon: '📁' },
  upload: { label: '업로드', icon: '📤' },
  download: { label: '다운로드', icon: '📥' },
  image: { label: '이미지', icon: '🖼️' },
  video: { label: '영상', icon: '🎬' },

  // 결제/주문
  payment: { label: '결제', icon: '💳' },
  order: { label: '주문', icon: '🛒' },
  cart: { label: '장바구니', icon: '🛒' },
  checkout: { label: '결제', icon: '💳' },

  // 기타
  button: { label: '버튼', icon: '🔘' },
  input: { label: '입력', icon: '⌨️' },
  loading: { label: '로딩', icon: '⏳' },
  error: { label: '오류', icon: '❌' },
  success: { label: '성공', icon: '✅' },
}

// 타입별 기본 아이콘
const TYPE_ICONS: Record<string, string> = {
  component: '🧩',
  hook: '🪝',
  handler: '⚡',
  function: '📄',
  method: '📌',
  arrow: '➜',
}

// 레이어별 기본 라벨
const LAYER_DEFAULTS: Record<string, { label: string; icon: string }> = {
  ui: { label: '화면', icon: '🖥️' },
  logic: { label: '처리', icon: '⚙️' },
  api: { label: '서버', icon: '🌐' },
  data: { label: '데이터', icon: '💾' },
  lib: { label: '도구', icon: '🔧' },
}

export interface FunctionLabel {
  icon: string
  displayName: string      // 기능명 (한글)
  technicalName: string    // 기술명 (원본)
  description: string      // 상세 설명
}

/**
 * 함수명을 비개발자 친화적 라벨로 변환
 */
export function getFunctionLabel(
  name: string,
  type: string = 'function',
  layer: string = 'unknown'
): FunctionLabel {
  const technicalName = name

  // 이름을 소문자로 변환하고 단어 분리
  const lowerName = name.toLowerCase()
  const words = splitCamelCase(name).map(w => w.toLowerCase())

  // 매칭된 키워드 찾기
  let matchedKeyword: { label: string; icon: string } | null = null
  let matchedKey = ''

  for (const word of words) {
    if (KEYWORD_MAP[word]) {
      matchedKeyword = KEYWORD_MAP[word]
      matchedKey = word
      break
    }
  }

  // 전체 이름에서도 키워드 검색
  if (!matchedKeyword) {
    for (const [key, value] of Object.entries(KEYWORD_MAP)) {
      if (lowerName.includes(key)) {
        matchedKeyword = value
        matchedKey = key
        break
      }
    }
  }

  // 기본값 설정
  const defaultLabel = LAYER_DEFAULTS[layer] || { label: '기능', icon: '📄' }
  const typeIcon = TYPE_ICONS[type] || '📄'

  // 결과 생성
  let icon = matchedKeyword?.icon || defaultLabel.icon
  let displayName = ''
  let description = ''

  if (matchedKeyword) {
    // 키워드 매칭됨: 조합해서 라벨 생성
    const otherWords = words.filter(w => w !== matchedKey)
    const prefix = getPrefix(otherWords)

    displayName = prefix ? `${prefix} ${matchedKeyword.label}` : matchedKeyword.label
    description = generateDescription(displayName, type, layer)
  } else {
    // 매칭 안됨: 레이어 기반 기본 라벨
    displayName = `${defaultLabel.label} 모듈`
    icon = typeIcon
    description = `${LAYER_DEFAULTS[layer]?.label || '기타'} 영역의 기능입니다.`
  }

  return {
    icon,
    displayName,
    technicalName,
    description,
  }
}

/**
 * CamelCase를 단어로 분리
 */
function splitCamelCase(str: string): string[] {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
}

/**
 * 추가 단어에서 접두사 추출
 */
function getPrefix(words: string[]): string {
  const prefixMap: Record<string, string> = {
    user: '회원',
    admin: '관리자',
    guest: '손님',
    auth: '인증',
    github: 'GitHub',
    google: 'Google',
    issue: '이슈',
    repo: '저장소',
    repository: '저장소',
    project: '프로젝트',
    ai: 'AI',
    code: '코드',
    flow: '흐름',
    diagram: '다이어그램',
    interactive: '인터랙티브',
    redirect: '리다이렉트',
  }

  for (const word of words) {
    if (prefixMap[word]) {
      return prefixMap[word]
    }
  }

  return ''
}

/**
 * 상세 설명 생성
 */
function generateDescription(
  displayName: string,
  type: string,
  layer: string
): string {
  const layerDesc: Record<string, string> = {
    ui: '사용자에게 보여지는',
    logic: '데이터를 처리하는',
    api: '서버와 통신하는',
    data: '데이터를 저장/관리하는',
    lib: '공통으로 사용되는',
  }

  const typeDesc: Record<string, string> = {
    component: '화면 컴포넌트',
    hook: '재사용 로직',
    handler: '이벤트 처리',
    function: '기능',
    method: '메서드',
    arrow: '함수',
  }

  const layerText = layerDesc[layer] || ''
  const typeText = typeDesc[type] || '기능'

  return `${layerText} ${displayName} ${typeText}입니다.`
}

/**
 * 함수명에서 한글 라벨만 반환 (간단 버전)
 */
export function getFriendlyLabel(name: string): string {
  const label = getFunctionLabel(name)
  return label.displayName
}

/**
 * 함수명에서 아이콘만 반환
 */
export function getFunctionIcon(name: string): string {
  const label = getFunctionLabel(name)
  return label.icon
}
