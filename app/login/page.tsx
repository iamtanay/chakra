'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'

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
      router.push('/')
    } catch {
      setError('Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width:    '600px',
          height:   '600px',
          left:     '50%',
          top:      '50%',
          transform:'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(232,162,71,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-sm animate-slideUp">
        {/* Logo block */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background:  'var(--bg3)',
              border:      '1px solid var(--border2)',
              boxShadow:   '0 0 32px rgba(232,162,71,0.15)',
            }}
          >
            <Logo size={32} spin="once" />
          </div>
          {/* Cinzel font with same gradient as sidebar */}
          <h1
            className="font-cinzel font-700 text-2xl uppercase mb-1"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 60%, #FF4500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.22em',
            }}
          >
            Chakra
          </h1>
          <p
            className="font-mono text-xs tracking-widest"
            style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
          >
            PERSONAL WORK TELEMETRY
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background:  'var(--bg2)',
            border:      '1px solid var(--border2)',
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
                  background:   'var(--bg3)',
                  border:       '1px solid var(--border)',
                  color:        'var(--text)',
                  fontFamily:   'JetBrains Mono, monospace',
                  fontSize:     '13px',
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
                background:  loading ? 'var(--bg4)' : 'var(--amber)',
                color:       loading ? 'var(--text3)' : '#0a0a0a',
                letterSpacing: '0.12em',
                cursor:      loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          {error && (
            <p
              className="mt-4 font-mono text-xs text-center"
              style={{ color: 'var(--col-high)' }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
