import { Suspense } from 'react'
import WorkPage from './_views'
import { Logo } from '@/components/ui/Logo'

export default function WorkPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
          <Logo size={48} spin="loop" />
        </div>
      }
    >
      <WorkPage />
    </Suspense>
  )
}
