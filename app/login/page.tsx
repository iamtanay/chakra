'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { LayoutDashboard, Star, BarChart3, Zap, Users, Target } from 'lucide-react'

const FEATURES = [
  {
    Icon: LayoutDashboard,
    title: 'Visual Flow',
    desc:  'Move tasks across a board that fits how you actually think — not how a template says you should.',
    color: 'var(--amber)',
    dim:   'var(--amber-dim)',
  },
  {
    Icon: Star,
    title: 'Today Mode',
    desc:  'Cut through the noise. See only what matters right now — due today, flagged, in motion.',
    color: 'var(--teal)',
    dim:   'var(--teal-dim)',
  },
  {
    Icon: BarChart3,
    title: 'Your Telemetry',
    desc:  'Understand where your time actually goes. Not estimates — real data from real work.',
    color: 'var(--violet)',
    dim:   'var(--violet-dim)',
  },
  {
    Icon: Zap,
    title: 'Drift Insight',
    desc:  'Know which types of work always take longer than expected. Get sharper at planning.',
    color: 'var(--rose)',
    dim:   'var(--rose-dim)',
  },
  {
    Icon: Users,
    title: 'Share Spaces',
    desc:  'Bring in a collaborator without handing over the whole workspace. Control who sees what.',
    color: 'var(--amber)',
    dim:   'var(--amber-dim)',
  },
  {
    Icon: Target,
    title: 'Habit Streaks',
    desc:  'Recurring tasks that build momentum. Show up consistently — the data proves it.',
    color: 'var(--teal)',
    dim:   'var(--teal-dim)',
  },
]

const MOBILE_PILLS = [
  { label: 'Visual boards',   color: 'var(--amber)'  },
  { label: 'Time telemetry',  color: 'var(--teal)'   },
  { label: 'Habit streaks',   color: 'var(--violet)' },
  { label: 'Drift insight',   color: 'var(--rose)'   },
]

/** Matches the Sidebar exactly: <Logo size={26} />, gap-3, font-cinzel font-600 tracking-[0.22em] */
function Brand({ size = 26 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} spin="once" />
      <span
        className="font-cinzel font-600 tracking-[0.22em] uppercase"
        style={{
          fontSize: size <= 20 ? '0.875rem' : '1rem',
          background: 'linear-gradient(135deg, var(--logo-from) 0%, var(--logo-mid) 60%, var(--logo-to) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Chakra
      </span>
    </div>
  )
}

function LoginForm() {
  const router   = useRouter()
  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError('Invalid email or password.'); setLoading(false); return }
      router.push('/home')
    } catch {
      setError('Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <label
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
        >
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-150"
          style={{
            background: 'var(--bg3)',
            border:     '1px solid var(--border)',
            color:      'var(--text)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize:   '13px',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--amber)')}
          onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
        >
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-150"
          style={{
            background: 'var(--bg3)',
            border:     '1px solid var(--border)',
            color:      'var(--text)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize:   '13px',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--amber)')}
          onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-syne font-700 text-sm tracking-widest uppercase transition-all duration-150"
        style={{
          background:    loading ? 'var(--bg4)' : 'var(--amber)',
          color:         loading ? 'var(--text3)' : '#0a0a0a',
          letterSpacing: '0.12em',
          cursor:        loading ? 'not-allowed' : 'pointer',
          boxShadow:     loading ? 'none' : '0 0 24px rgba(232,162,71,0.3)',
        }}
      >
        {loading ? 'Signing in…' : 'Sign in →'}
      </button>

      {error && (
        <p className="font-mono text-xs text-center" style={{ color: 'var(--col-high)' }}>
          {error}
        </p>
      )}
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{ background: 'var(--bg)' }} className="relative">

      {/* Background grid — fixed so it covers both layouts */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.15,
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          zIndex: 0,
        }}
      />

      {/* ══════════════════════════════════════════════
          MOBILE  (< lg)
          Fixed full-viewport, perfectly centered,
          no scroll — premium PWA feel
          ══════════════════════════════════════════════ */}
      <div
        className="lg:hidden fixed inset-0 flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--bg)', zIndex: 10 }}
      >
        {/* Top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '340px', height: '280px',
            background: 'radial-gradient(ellipse at top, rgba(232,162,71,0.13) 0%, transparent 70%)',
          }}
        />
        {/* Bottom glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: '320px', height: '240px',
            background: 'radial-gradient(ellipse at bottom, rgba(45,212,191,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="mb-5">
          <Brand size={26} />
        </div>

        {/* Headline */}
        <div className="text-center mb-7">
          <h1
            className="font-syne font-800 leading-snug mb-2"
            style={{ color: 'var(--text)', fontSize: 'clamp(1.55rem, 6.5vw, 1.9rem)' }}
          >
            Own your time.<br />
            <span
              style={{
                background: 'linear-gradient(135deg, var(--amber) 0%, var(--teal) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Understand your work.
            </span>
          </h1>
          <p
            className="font-syne text-sm leading-relaxed"
            style={{ color: 'var(--text3)', maxWidth: '18rem', margin: '0 auto' }}
          >
            Clarity for where your effort actually goes.
          </p>
        </div>

        {/* Login card */}
        <div
          className="relative w-full max-w-sm rounded-2xl p-6 overflow-hidden"
          style={{
            background: 'var(--bg2)',
            border:     '1px solid var(--border2)',
            boxShadow:  '0 16px 56px rgba(0,0,0,0.32)',
          }}
        >
          {/* Card top shimmer line */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: '75%', height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(232,162,71,0.4), transparent)',
            }}
          />
          <div className="mb-5">
            <h2 className="font-syne font-800 text-base mb-0.5" style={{ color: 'var(--text)' }}>
              Welcome back.
            </h2>
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              Sign in to your workspace.
            </p>
          </div>
          <LoginForm />
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          {MOBILE_PILLS.map(({ label, color }) => (
            <span
              key={label}
              className="font-mono text-xs px-3 py-1 rounded-full"
              style={{
                color,
                background: `${color}13`,
                border:     `1px solid ${color}2e`,
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Footer */}
        <p
          className="mt-5 font-mono text-xs text-center"
          style={{ color: 'var(--text3)', opacity: 0.38 }}
        >
          Your data stays yours.
        </p>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP  (≥ lg)
          Left panel scrolls freely with branding.
          Right panel is sticky — login stays pinned
          and vertically centered as you scroll.
          ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ minHeight: '100dvh', position: 'relative', zIndex: 1 }}>

        {/* ── Left: scrollable branding ── */}
        <div
          className="flex flex-col"
          style={{ width: '55%', padding: '3.5rem 3.5rem 3.5rem 3.5rem', minHeight: '100vh', position: 'relative' }}
        >
          {/* Top-left ambient */}
          <div
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: '560px', height: '560px',
              background: 'radial-gradient(circle at top left, rgba(232,162,71,0.09) 0%, transparent 60%)',
            }}
          />

          {/* Logo */}
          <div className="relative mb-16">
            <Brand size={26} />
          </div>

          {/* Hero */}
          <div className="relative" style={{ maxWidth: '36rem' }}>
            <p
              className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: 'var(--text3)', letterSpacing: '0.14em' }}
            >
              Personal Work Telemetry
            </p>
            <h1
              className="font-syne font-800 leading-tight mb-5"
              style={{ color: 'var(--text)', fontSize: 'clamp(2rem, 3.2vw, 2.9rem)' }}
            >
              Own your time.<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--amber) 0%, var(--teal) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Understand your work.
              </span>
            </h1>
            <p
              className="font-syne text-base leading-relaxed mb-12"
              style={{ color: 'var(--text3)', maxWidth: '28rem' }}
            >
              Clarity for where your effort actually goes — no matter what you're working on.
            </p>

            {/* All 6 features, 2-col grid */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ Icon, title, desc, color, dim }) => (
                <div
                  key={title}
                  className="flex gap-3 p-4 rounded-xl"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: dim, border: `1px solid ${color}22` }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div>
                    <p className="font-syne text-sm font-700 mb-0.5" style={{ color: 'var(--text)' }}>{title}</p>
                    <p className="font-syne text-xs leading-relaxed" style={{ color: 'var(--text3)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer copy */}
          <p
            className="relative mt-14 font-mono text-xs"
            style={{ color: 'var(--text3)', opacity: 0.42, letterSpacing: '0.08em' }}
          >
            Built for people who value their time.
          </p>
        </div>

        {/* ── Right: sticky login ── */}
        <div style={{ flex: 1, position: 'relative', minHeight: '100vh' }}>

          {/* Vertical separator */}
          <div
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: '1px',
              background: 'var(--border)',
            }}
          />

          {/* Bottom-right ambient */}
          <div
            className="absolute bottom-0 right-0 pointer-events-none"
            style={{
              width: '420px', height: '420px',
              background: 'radial-gradient(circle at bottom right, rgba(45,212,191,0.06) 0%, transparent 60%)',
            }}
          />

          {/* The sticky wrapper — pins login in center of viewport */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: '100dvh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem',
            }}
          >
            <div style={{ width: '100%', maxWidth: '22rem' }}>
              <div className="mb-7">
                <h2 className="font-syne font-800 text-xl mb-1" style={{ color: 'var(--text)' }}>
                  Welcome back.
                </h2>
                <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                  Sign in to your workspace.
                </p>
              </div>

              <div
                className="rounded-2xl p-7 relative overflow-hidden"
                style={{
                  background: 'var(--bg2)',
                  border:     '1px solid var(--border2)',
                  boxShadow:  '0 8px 48px rgba(0,0,0,0.28)',
                }}
              >
                {/* Shimmer top edge */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{
                    width: '70%', height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(232,162,71,0.32), transparent)',
                  }}
                />
                <LoginForm />
              </div>

              <p
                className="mt-5 text-center font-mono text-xs"
                style={{ color: 'var(--text3)', opacity: 0.38 }}
              >
                Your data stays yours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}