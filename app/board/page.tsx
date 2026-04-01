/**
 * app/board/page.tsx — thin wrapper that adds the required Suspense boundary
 * for useSearchParams() used inside BoardPage.
 *
 * Next.js 13+ requires any component using useSearchParams() to be wrapped
 * in <Suspense> at the page boundary, otherwise it will throw during static
 * rendering or cause a full-page loading state.
 */

import { Suspense } from 'react'
import BoardPage from './_board'
import { Logo } from '@/components/ui/Logo'

export default function BoardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
          <Logo size={48} spin="loop" />
        </div>
      }
    >
      <BoardPage />
    </Suspense>
  )
}
