/**
 * GitCommand Center API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

export interface CLIStatus {
  claude: boolean;
  codex: boolean;
  gemini: boolean;
  qwen: boolean;
}

export interface AIResolveRequest {
  model: string;
  issue_id: number;
  issue_title: string;
  prompt?: string;
}

export interface AIResolveResponse {
  success: boolean;
  model_used: string;
  code: string;
  output: string;
  message: string;
}

/**
 * API 헬스 체크
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error('API health check failed');
  return response.json();
}

/**
 * CLI 설치 상태 확인
 */
export async function getCLIStatus(): Promise<CLIStatus> {
  const response = await fetch(`${API_BASE_URL}/api/cli/status`);
  if (!response.ok) throw new Error('Failed to get CLI status');
  return response.json();
}

/**
 * 사용 가능한 AI 모델 목록 조회
 */
export async function getAvailableModels(): Promise<AIModel[]> {
  const response = await fetch(`${API_BASE_URL}/api/models`);
  if (!response.ok) throw new Error('Failed to get models');
  const data = await response.json();
  return data.models;
}

/**
 * AI로 이슈 해결
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
