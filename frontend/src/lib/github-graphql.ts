/**
 * GitHub GraphQL API Client
 * 여러 데이터를 한 번의 API 호출로 가져와 성능 최적화
 */

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

/**
 * GitHub GraphQL API 호출
 */
export async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string
): Promise<T> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`GitHub GraphQL API error: ${response.status}`)
  }

  const result: GraphQLResponse<T> = await response.json()

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message)
  }

  if (!result.data) {
    throw new Error('No data returned from GitHub GraphQL API')
  }

  return result.data
}

/**
 * 레포 정보 + 이슈 + 디렉토리 트리를 한 번에 조회
 */
export const REPO_ANALYSIS_QUERY = `
query RepoAnalysis($owner: String!, $name: String!, $path: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    defaultBranchRef {
      name
      target {
        ... on Commit {
          oid
          tree {
            entries {
              name
              type
              path
              object {
                ... on Blob {
                  byteSize
                }
                ... on Tree {
                  entries {
                    name
                    type
                    path
                    object {
                      ... on Blob {
                        byteSize
                      }
                      ... on Tree {
                        entries {
                          name
                          type
                          path
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    issues(first: 30, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        number
        title
        labels(first: 5) {
          nodes {
            name
          }
        }
      }
    }
    primaryLanguage {
      name
    }
    stargazerCount
    openIssueCount: issues(states: OPEN) {
      totalCount
    }
  }
}
`

export interface RepoAnalysisData {
  repository: {
    name: string
    description: string | null
    defaultBranchRef: {
      name: string
      target: {
        oid: string
        tree: {
          entries: TreeEntry[]
        }
      }
    } | null
    issues: {
      nodes: Array<{
        number: number
        title: string
        labels: {
          nodes: Array<{ name: string }>
        }
      }>
    }
    primaryLanguage: { name: string } | null
    stargazerCount: number
    openIssueCount: { totalCount: number }
  }
}

interface TreeEntry {
  name: string
  type: 'blob' | 'tree'
  path: string
  object?: {
    byteSize?: number
    entries?: TreeEntry[]
  }
}

/**
 * 파일 내용을 배치로 조회
 */
export const FILE_CONTENTS_QUERY = `
query FileContents($owner: String!, $name: String!, $expressions: [String!]!) {
  repository(owner: $owner, name: $name) {
    files: object(expression: $expressions[0]) {
      ... on Blob {
        text
        byteSize
      }
    }
  }
}
`

/**
 * 다중 파일 내용 조회 쿼리 생성
 * GraphQL alias를 사용하여 여러 파일을 한 번에 조회
 */
export function createMultiFileQuery(filePaths: string[], branch: string): string {
  const fileFragments = filePaths.map((path, idx) => {
    const safePath = path.replace(/\//g, '_').replace(/\./g, '_').replace(/-/g, '_')
    return `
      file${idx}_${safePath}: object(expression: "${branch}:${path}") {
        ... on Blob {
          text
          byteSize
        }
      }
    `
  }).join('\n')

  return `
    query MultiFileContents($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        ${fileFragments}
      }
    }
  `
}

/**
 * 트리 엔트리를 평면 배열로 변환 (재귀)
 */
export function flattenTreeEntries(entries: TreeEntry[], basePath = ''): Array<{ path: string; type: string }> {
  const result: Array<{ path: string; type: string }> = []

  for (const entry of entries) {
    const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.type === 'blob') {
      result.push({ path: fullPath, type: 'blob' })
    } else if (entry.type === 'tree' && entry.object?.entries) {
      result.push(...flattenTreeEntries(entry.object.entries, fullPath))
    }
  }

  return result
}

/**
 * GraphQL 응답에서 파일 내용 추출
 */
export function extractFileContents(
  data: Record<string, { text?: string; byteSize?: number } | null>
): Map<string, string> {
  const contents = new Map<string, string>()

  for (const [key, value] of Object.entries(data)) {
    if (value?.text) {
      // key에서 원래 경로 복원 (file0_src_lib_api_ts -> src/lib/api.ts)
      const match = key.match(/^file(\d+)_(.+)$/)
      if (match) {
        contents.set(key, value.text)
      }
    }
  }

  return contents
}
