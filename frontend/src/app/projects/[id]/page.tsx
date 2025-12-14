'use client'

import { useState } from 'react'

interface Issue {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  labels: string[]
}

const mockIssues: Issue[] = [
  { id: 1, number: 1, title: 'Fix authentication bug', state: 'open', labels: ['bug'] },
  { id: 2, number: 2, title: 'Add dark mode', state: 'open', labels: ['enhancement'] },
  { id: 3, number: 3, title: 'Update README', state: 'closed', labels: ['docs'] },
]

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [issues] = useState<Issue[]>(mockIssues)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [progress, setProgress] = useState(0)

  const openIssues = issues.filter(i => i.state === 'open')
  const closedIssues = issues.filter(i => i.state === 'closed')

  const handleAIResolve = async () => {
    setIsResolving(true)
    setProgress(0)

    // Simulate AI resolution progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 500))
      setProgress(i)
    }

    setIsResolving(false)
  }

  return (
    <main className="project-page" data-testid="project-page">
      <header data-testid="project-header">
        <h1>Project #{params.id}</h1>
        <a href="/" data-testid="back-btn">← 돌아가기</a>
      </header>

      <div className="layout" style={{ display: 'flex', gap: '20px' }}>
        {/* Issue Board */}
        <section className="issue-board" data-testid="issue-board" style={{ flex: 1 }}>
          <h2>이슈 보드</h2>

          <details open data-testid="open-issues-accordion">
            <summary>열린 이슈 ({openIssues.length})</summary>
            <ul data-testid="open-issues-list">
              {openIssues.map(issue => (
                <li
                  key={issue.id}
                  data-testid={`issue-${issue.number}`}
                  onClick={() => setSelectedIssue(issue)}
                  style={{ cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '4px 0' }}
                >
                  #{issue.number} {issue.title}
                  {issue.labels.map(l => <span key={l} className="label">[{l}]</span>)}
                </li>
              ))}
            </ul>
          </details>

          <details data-testid="closed-issues-accordion">
            <summary>닫힌 이슈 ({closedIssues.length})</summary>
            <ul data-testid="closed-issues-list">
              {closedIssues.map(issue => (
                <li
                  key={issue.id}
                  data-testid={`issue-${issue.number}`}
                  onClick={() => setSelectedIssue(issue)}
                  style={{ cursor: 'pointer', padding: '8px', border: '1px solid #ccc', margin: '4px 0' }}
                >
                  #{issue.number} {issue.title} ✓
                </li>
              ))}
            </ul>
          </details>
        </section>

        {/* Issue Detail / Diagram */}
        <section className="detail-panel" data-testid="detail-panel" style={{ flex: 2 }}>
          {selectedIssue ? (
            <div data-testid="issue-detail">
              <h2>이슈 #{selectedIssue.number}</h2>
              <h3>{selectedIssue.title}</h3>
              <p>상태: {selectedIssue.state}</p>

              <button
                data-testid="ai-resolve-btn"
                onClick={handleAIResolve}
                disabled={isResolving}
              >
                {isResolving ? 'AI 해결 중...' : 'AI로 해결'}
              </button>

              {isResolving && (
                <div data-testid="progress-display">
                  <div data-testid="live-indicator" style={{ color: 'red' }}>
                    🔴 LIVE
                  </div>
                  <progress
                    data-testid="progress-bar"
                    value={progress}
                    max={100}
                  />
                  <span data-testid="progress-text">{progress}%</span>
                </div>
              )}

              {!isResolving && progress === 100 && (
                <div data-testid="approval-modal">
                  <h4>변경 사항 승인</h4>
                  <pre data-testid="diff-preview">
                    - old code
                    + new code
                  </pre>
                  <button data-testid="approve-btn">승인</button>
                  <button data-testid="reject-btn">거부</button>
                </div>
              )}

              {/* Code Diagram */}
              <div data-testid="code-diagram" style={{ marginTop: '20px', border: '1px solid #ddd', height: '300px' }}>
                <p>코드 다이어그램 (React Flow)</p>
                <div data-testid="diagram-node" className="node">src/auth.py</div>
              </div>
            </div>
          ) : (
            <p>이슈를 선택하세요</p>
          )}
        </section>
      </div>
    </main>
  )
}
