import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevFlow',
  description: '비개발자를 위한 AI 협업 개발 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
