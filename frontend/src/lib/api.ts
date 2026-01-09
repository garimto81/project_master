/**
 * GitCommand Center API Client
 * 타입은 @/lib/types에서 통합 관리
 */

import type {
  AIModel,
  AIResolveRequest,
  AIResolveResponse,
  Repository,
  RepositoryDetail,
  CLIStatus,
} from './types'

// 타입 re-export (하위 호환성)
export type { AIModel, AIResolveRequest, AIResolveResponse, Repository, RepositoryDetail, CLIStatus }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API 헬스 체크
 * @deprecated FastAPI 레거시 - 새 기능은 Next.js API Routes 사용
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error('API health check failed');
  return response.json();
}

/**
 * CLI 설치 상태 확인
 * @deprecated FastAPI 레거시 - 새 기능은 Next.js API Routes 사용
 */
export async function getCLIStatus(): Promise<CLIStatus> {
  const response = await fetch(`${API_BASE_URL}/api/cli/status`);
  if (!response.ok) throw new Error('Failed to get CLI status');
  return response.json();
}

/**
 * 사용 가능한 AI 모델 목록 조회 (Next.js API Route 사용)
 */
export async function getAvailableModels(): Promise<AIModel[]> {
  const response = await fetch('/api/models');
  if (!response.ok) throw new Error('Failed to get models');
  const data = await response.json();
  return data.models;
}

/**
 * AI로 이슈 해결
 * @deprecated FastAPI 레거시 - 새 기능은 /api/ai/resolve Route 사용
 */
export async function resolveIssueWithAI(request: AIResolveRequest): Promise<AIResolveResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'AI resolution failed');
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * AI로 이슈 해결 (폴백 지원)
 * @deprecated FastAPI 레거시 - 새 기능은 /api/ai/resolve Route 사용
 */
export async function resolveIssueWithFallback(request: AIResolveRequest): Promise<AIResolveResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ai/resolve-with-fallback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'AI resolution with fallback failed');
  }

  return response.json();
}

/**
 * 레포지토리 목록 조회 (Next.js API Route 사용)
 */
export async function getRepositories(): Promise<{ repositories: Repository[] }> {
  const response = await fetch('/api/repositories');
  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }
  return response.json();
}

/**
 * 레포지토리 상세 정보 조회 (Next.js API Route 사용)
 */
export async function getRepositoryDetail(fullName: string): Promise<RepositoryDetail> {
  const [owner, repo] = fullName.split('/');
  const response = await fetch(`/api/repositories/${owner}/${repo}`);
  if (!response.ok) {
    throw new Error('Failed to fetch repository detail');
  }
  return response.json();
}
