'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { LayoutDashboard, Star, BarChart3, Users, Zap, Target } from 'lucide-react'

const FEATURES = [
  {
    Icon: LayoutDashboard,
    title: 'Visual Flow',
    desc:  'Move tasks across a board that fits how you actually think — not how a PM template says you should.',
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
    title: 'Share Projects',
    desc:  "Bring in a collaborator without handing over the whole workspace. Control who sees what.",
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

export default function LoginPage() {
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
    <div
      className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Left panel — branding & features */}
      <div className="relative flex flex-col justify-between lg:w-[55%] px-8 pt-10 pb-8 lg:px-14 lg:pt-14 lg:pb-14">

        <div
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: '500px', height: '500px',
            background: 'radial-gradient(circle at top left, rgba(232,162,71,0.09) 0%, transparent 60%)',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 mb-10 lg:mb-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', boxShadow: '0 0 24px rgba(232,162,71,0.12)' }}
          >
            <Logo size={20} spin="once" />
          </div>
          <span
            className="font-cinzel font-700 text-lg tracking-[0.2em] uppercase"
            style={{
              background: 'linear-gradient(135deg, var(--logo-from) 0%, var(--logo-mid) 60%, var(--logo-to) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Chakra
          </span>
        </div>

        {/* Headline */}
        <div className="relative mt-10 lg:mt-0">
          <p
            className="font-mono text-xs uppercase tracking-widest mb-4"
            style={{ color: 'var(--text3)', letterSpacing: '0.14em' }}
          >
            Personal Work Telemetry
          </p>
          <h1
            className="font-syne font-800 leading-tight mb-5"
            style={{ color: 'var(--text)', fontSize: 'clamp(2rem, 4vw, 3rem)' }}
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
            className="font-syne text-base leading-relaxed max-w-md mb-10 lg:mb-14"
            style={{ color: 'var(--text3)' }}
          >
            Whether you are shipping code, studying for exams, or just trying to stay on
            top of life — Chakra gives you the clarity to see where your effort actually goes.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
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

        <p
          className="relative hidden lg:block font-mono text-xs mt-10"
          style={{ color: 'var(--text3)', opacity: 0.5, letterSpacing: '0.08em' }}
        >
          Built for people who value their time.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="relative flex items-center justify-center lg:flex-1 px-8 py-10 lg:py-0">

        <div
          className="absolute bottom-0 right-0 pointer-events-none"
          style={{
            width: '400px', height: '400px',
            background: 'radial-gradient(circle at bottom right, rgba(45,212,191,0.06) 0%, transparent 60%)',
          }}
        />

        {/* Vertical separator desktop */}
        <div
          className="hidden lg:block absolute left-0 top-12 bottom-12 w-px"
          style={{ background: 'var(--border)' }}
        />

        <div className="relative w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-syne font-800 text-xl mb-1" style={{ color: 'var(--text)' }}>
              Welcome back.
            </h2>
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              Sign in to your workspace.
            </p>
          </div>

          <div
            className="rounded-2xl p-7"
            style={{
              background: 'var(--bg2)',
              border:     '1px solid var(--border2)',
              boxShadow:  '0 8px 40px rgba(0,0,0,0.25)',
            }}
          >
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
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

              <div className="space-y-1">
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
                className="w-full py-3.5 rounded-xl font-syne font-700 text-sm tracking-widest uppercase transition-all duration-150 mt-2"
                style={{
                  background:    loading ? 'var(--bg4)' : 'var(--amber)',
                  color:         loading ? 'var(--text3)' : '#0a0a0a',
                  letterSpacing: '0.12em',
                  cursor:        loading ? 'not-allowed' : 'pointer',
                  boxShadow:     loading ? 'none' : '0 0 20px rgba(232,162,71,0.25)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>

            {error && (
              <p className="mt-4 font-mono text-xs text-center" style={{ color: 'var(--col-high)' }}>
                {error}
              </p>
            )}
          </div>

          <p
            className="mt-5 text-center font-mono text-xs"
            style={{ color: 'var(--text3)', opacity: 0.5 }}
          >
            Your data stays yours.
          </p>
        </div>
      </div>
    </div>
  )
}
