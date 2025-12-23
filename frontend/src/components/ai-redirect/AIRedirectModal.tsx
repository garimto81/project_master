'use client'

/**
 * AI 리다이렉트 모달
 * 비개발자를 위한 AI 웹사이트 연동 UI
 *
 * 3단계 흐름:
 * 1. 프롬프트 미리보기 + 복사 + AI 열기
 * 2. AI 응답 붙여넣기
 * 3. 코드 추출 결과 확인
 */

import { useState, useCallback } from 'react'
import {
  IssueInfo,
  generatePrompt,
  extractFirstCodeBlock,
  copyToClipboard,
  openAIService,
  getAIServiceName,
  getAIServiceUrl,
} from '@/lib/ai-services'

interface AIRedirectModalProps {
  isOpen: boolean
  onClose: () => void
  issue: IssueInfo
  selectedModel: string
  onResult: (result: { code: string; output: string }) => void
}

type Step = 'prompt' | 'paste' | 'result'

export default function AIRedirectModal({
  isOpen,
  onClose,
  issue,
  selectedModel,
  onResult,
}: AIRedirectModalProps) {
  const [step, setStep] = useState<Step>('prompt')
  const [copied, setCopied] = useState(false)
  const [opened, setOpened] = useState(false)
  const [pastedResponse, setPastedResponse] = useState('')
  const [extractedResult, setExtractedResult] = useState<{ code: string; output: string } | null>(null)

  const prompt = generatePrompt(issue)
  const serviceName = getAIServiceName(selectedModel)
  const serviceUrl = getAIServiceUrl(selectedModel)

  const handleCopyPrompt = useCallback(async () => {
    const success = await copyToClipboard(prompt)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [prompt])

  const handleOpenAI = useCallback(() => {
    openAIService(selectedModel)
    setOpened(true)
  }, [selectedModel])

  const handleGoToPaste = useCallback(() => {
    setStep('paste')
  }, [])

  const handleExtractCode = useCallback(() => {
    if (!pastedResponse.trim()) return

    const result = extractFirstCodeBlock(pastedResponse)
    setExtractedResult(result)
    setStep('result')
  }, [pastedResponse])

  const handleConfirm = useCallback(() => {
    if (extractedResult) {
      onResult(extractedResult)
      handleReset()
      onClose()
    }
  }, [extractedResult, onResult, onClose])

  const handleReset = useCallback(() => {
    setStep('prompt')
    setCopied(false)
    setOpened(false)
    setPastedResponse('')
    setExtractedResult(null)
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onClose()
  }, [handleReset, onClose])

  if (!isOpen) return null

  return (
    <div
      data-testid="ai-redirect-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '640px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {serviceName}로 이슈 해결
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            &times;
          </button>
        </div>

        {/* 단계 표시 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['prompt', 'paste', 'result'] as Step[]).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: step === s || (['prompt', 'paste', 'result'].indexOf(step) > i) ? '#3b82f6' : '#e5e7eb',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>

        {/* Step 1: 프롬프트 */}
        {step === 'prompt' && (
          <div>
            <p style={{ color: '#666', marginBottom: '12px' }}>
              1. 아래 프롬프트를 복사하세요
            </p>

            <div
              data-testid="prompt-preview"
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '200px',
                overflow: 'auto',
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {prompt}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                data-testid="copy-prompt-btn"
                onClick={handleCopyPrompt}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: copied ? '#22c55e' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {copied ? '복사됨!' : '클립보드에 복사'}
              </button>
            </div>

            <p style={{ color: '#666', marginBottom: '12px' }}>
              2. {serviceName} 웹사이트를 열고 프롬프트를 붙여넣으세요
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                data-testid={`open-${selectedModel}-btn`}
                onClick={handleOpenAI}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: opened ? '#16a34a' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {opened ? `${serviceName} 열림` : `${serviceName} 열기`}
              </button>
            </div>

            {serviceUrl && (
              <p style={{ color: '#999', fontSize: '12px', marginBottom: '20px' }}>
                {serviceUrl}
              </p>
            )}

            <p style={{ color: '#666', marginBottom: '12px' }}>
              3. AI 응답을 받으면 &quot;다음&quot;을 클릭하세요
            </p>

            <button
              onClick={handleGoToPaste}
              disabled={!opened}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: opened ? '#3b82f6' : '#e5e7eb',
                color: opened ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                cursor: opened ? 'pointer' : 'not-allowed',
                fontWeight: 500,
              }}
            >
              다음: 응답 붙여넣기
            </button>
          </div>
        )}

        {/* Step 2: 붙여넣기 */}
        {step === 'paste' && (
          <div>
            <p style={{ color: '#666', marginBottom: '12px' }}>
              {serviceName}에서 받은 응답을 아래에 붙여넣으세요
            </p>

            <textarea
              data-testid="response-textarea"
              value={pastedResponse}
              onChange={(e) => setPastedResponse(e.target.value)}
              placeholder="AI 응답을 여기에 붙여넣기 (Ctrl+V)"
              style={{
                width: '100%',
                height: '250px',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStep('prompt')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                이전
              </button>
              <button
                data-testid="extract-code-btn"
                onClick={handleExtractCode}
                disabled={!pastedResponse.trim()}
                style={{
                  flex: 2,
                  padding: '12px',
                  backgroundColor: pastedResponse.trim() ? '#3b82f6' : '#e5e7eb',
                  color: pastedResponse.trim() ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: pastedResponse.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                }}
              >
                코드 추출
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 결과 확인 */}
        {step === 'result' && extractedResult && (
          <div>
            <p style={{ color: '#666', marginBottom: '12px' }}>
              추출된 코드를 확인하세요
            </p>

            {extractedResult.code ? (
              <div
                data-testid="extracted-code-preview"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {extractedResult.code}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                }}
              >
                코드 블록을 찾을 수 없습니다. 응답에 ```로 감싸진 코드가 있는지 확인해주세요.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStep('paste')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                이전
              </button>
              <button
                onClick={handleConfirm}
                disabled={!extractedResult.code}
                style={{
                  flex: 2,
                  padding: '12px',
                  backgroundColor: extractedResult.code ? '#22c55e' : '#e5e7eb',
                  color: extractedResult.code ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: extractedResult.code ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                }}
              >
                이 코드로 적용
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
