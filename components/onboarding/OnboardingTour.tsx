'use client'

/**
 * OnboardingTour — first-login walkthrough for Chakra.
 *
 * Behaviour:
 *   - Detects platform (web vs mobile) via window.innerWidth < 768.
 *   - Reads localStorage keys:
 *       "chakra-tour-web-done"    → skip on desktop if set
 *       "chakra-tour-mobile-done" → skip on mobile if set
 *   - Shows a spotlight overlay that dims the page and cuts out the
 *     target element, with a floating tooltip card.
 *   - Each step has a `selector` (CSS selector for the target element),
 *     a title, body copy, and an optional emoji.
 *   - If a target element isn't found (e.g. wrong page), the tooltip
 *     centres on screen instead of crashing.
 *   - Skippable at any time. Completes after the last step.
 *
 * Target attributes required on DOM elements:
 *   [data-tour="nav-home"]          Sidebar / BottomNav Home link
 *   [data-tour="nav-canvas"]        Sidebar / BottomNav Canvas link
 *   [data-tour="nav-today"]         Sidebar / BottomNav Today link
 *   [data-tour="nav-streams"]       Sidebar / BottomNav Streams link
 *   [data-tour="nav-spaces"]        Sidebar / BottomNav / More sheet Spaces link
 *   [data-tour="view-switcher"]     Board page view toggle (Kanban/List/Calendar)
 *   [data-tour="project-switcher"]  Sidebar project list
 *   [data-tour="daily-pulse"]       DailyPulse header bar
 *   [data-tour="karma-widget"]      KarmaWidget wherever it appears
 *   [data-tour="more-button"]       BottomNav "More" button (mobile only)
 *   [data-tour="notif-toggle"]      NotificationToggle (inside More sheet or Sidebar)
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Step {
  selector: string | null
  title: string
  body: string
  emoji: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Mobile only: target lives in the BottomNav bar (z-50). We lift the nav
   *  above the overlay so the item is visible in the spotlight. */
  isBottomNavItem?: boolean
  /** Target may not be in the DOM (e.g. inside a closed sheet). Falls back
   *  to centred tooltip rather than crashing. */
  mayBeMissing?: boolean
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

// ── Step definitions ──────────────────────────────────────────────────────────

const WEB_STEPS: Step[] = [
  {
    selector: null,
    title: 'Welcome to Chakra',
    body: 'This quick tour shows you where everything lives. Takes about 30 seconds — skip any time with the × button.',
    emoji: '⚡',
    placement: 'center',
  },
  {
    selector: '[data-tour="nav-home"]',
    title: 'Home — Your Dashboard',
    body: 'See tasks completed, hours logged, and effort drift across the week, month, or year. Your Karma streak lives here too.',
    emoji: '🏠',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-canvas"]',
    title: 'Canvas — Task Board',
    body: 'Your main workspace. Switch between Kanban columns, a flat List, or a Calendar view using the toggle at the top.',
    emoji: '🗂️',
    placement: 'right',
  },
  {
    selector: '[data-tour="view-switcher"]',
    title: 'Three Views, One Board',
    body: 'Board gives you drag-and-drop Kanban. List is fast and scannable. Calendar shows tasks by due date. All showing the same data.',
    emoji: '🔀',
    placement: 'bottom',
    mayBeMissing: true,
  },
  {
    selector: '[data-tour="project-switcher"]',
    title: 'Filter by Space',
    body: 'Click any project here to filter the board to just that space. Click the name again to go back to all tasks.',
    emoji: '🎯',
    placement: 'right',
    mayBeMissing: true,
  },
  {
    selector: '[data-tour="daily-pulse"]',
    title: 'Daily Pulse',
    body: 'Live header showing tasks completed and hours logged today. Resets at midnight.',
    emoji: '📊',
    placement: 'bottom',
    mayBeMissing: true,
  },
  {
    selector: '[data-tour="nav-today"]',
    title: 'Today — Daily Focus',
    body: "Everything you've flagged for today, sorted by priority. Recurring tasks due today appear here automatically.",
    emoji: '⭐',
    placement: 'right',
  },
  {
    selector: '[data-tour="karma-widget"]',
    title: 'Karma — Daily Rituals',
    body: 'Tick off your habits each day. Complete every ritual to extend your streak. Customise which rituals appear via the ⚙ button.',
    emoji: '🧘',
    placement: 'right',
    mayBeMissing: true,
  },
  {
    selector: '[data-tour="nav-streams"]',
    title: 'Streams — Focus Channels',
    body: 'Checklists, notes, or link collections — shareable with others. Pin the ones you use most. Archive when done.',
    emoji: '🌊',
    placement: 'right',
  },
  {
    selector: '[data-tour="nav-spaces"]',
    title: 'Spaces — Projects',
    body: 'Organise tasks into Work, Study, or Personal projects. Share a space with a collaborator and control their access level.',
    emoji: '🗃️',
    placement: 'right',
  },
  {
    selector: '[data-tour="notif-toggle"]',
    title: 'Settings & Notifications',
    body: 'Click your avatar to open settings: change your display name, switch themes, and log out. Notification schedules can be enabled from here too.',
    emoji: '🔔',
    placement: 'right',
  },
  {
    selector: null,
    title: "You're all set",
    body: "This tour won't show again on this device. Jump back to any section from the sidebar. Now go build something.",
    emoji: '🚀',
    placement: 'center',
  },
]

const MOBILE_STEPS: Step[] = [
  {
    selector: null,
    title: 'Welcome to Chakra',
    body: 'Quick tour — 30 seconds. Tap Next to walk through each section, or × to skip.',
    emoji: '⚡',
    placement: 'center',
  },
  {
    selector: '[data-tour="nav-home"]',
    title: 'Home',
    body: 'Your dashboard. Tasks done, hours logged, Karma streak — all in one place. Tap to see weekly, monthly, or yearly.',
    emoji: '🏠',
    placement: 'top',
    isBottomNavItem: true,
  },
  {
    selector: '[data-tour="nav-canvas"]',
    title: 'Canvas',
    body: 'Your task board. On mobile it starts in List view. Swipe task cards left to mark done. Tap the view toggle at the top to switch.',
    emoji: '🗂️',
    placement: 'top',
    isBottomNavItem: true,
  },
  {
    selector: '[data-tour="daily-pulse"]',
    title: 'Daily Pulse',
    body: "Live count of tasks and hours for today — shown at the top of Canvas. It resets each morning.",
    emoji: '📊',
    placement: 'bottom',
    mayBeMissing: true,
  },
  {
    selector: '[data-tour="nav-today"]',
    title: 'Today',
    body: "Just what's on your plate right now. Tap the ★ on any task to pin it here. Recurring tasks show up automatically when due.",
    emoji: '⭐',
    placement: 'top',
    isBottomNavItem: true,
  },
  {
    selector: '[data-tour="karma-widget"]',
    title: 'Karma Rituals',
    body: 'Tick your daily habits from the Today page. Hit all of them to keep your streak alive. Tap ⚙ to add your own rituals.',
    emoji: '🧘',
    placement: 'top',
    mayBeMissing: true,
  },
  {
    selector: '[data-tour="nav-streams"]',
    title: 'Streams',
    body: 'Checklists, notes, and link collections you can share with others. Tap + to create one. Long-press a card for options.',
    emoji: '🌊',
    placement: 'top',
    isBottomNavItem: true,
  },
  {
    selector: '[data-tour="more-button"]',
    title: 'More',
    body: 'Spaces (your projects), theme toggle, notifications, and account settings all live here.',
    emoji: '⋯',
    placement: 'top',
    isBottomNavItem: true,
  },
  {
    selector: '[data-tour="notif-toggle"]',
    title: 'Notifications',
    body: 'Morning briefing at 11 AM, evening reminder at 8 PM. Add Chakra to your home screen first, then enable from the More sheet.',
    emoji: '🔔',
    placement: 'top',
    mayBeMissing: true,
  },
  {
    selector: null,
    title: "You're ready",
    body: "This tour won't show again on this phone. Navigate with the bar at the bottom. Enjoy the flow.",
    emoji: '🚀',
    placement: 'center',
  },
]

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEY_WEB    = 'chakra-tour-web-done'
const KEY_MOBILE = 'chakra-tour-mobile-done'

// ── Spotlight helpers ─────────────────────────────────────────────────────────

const PAD = 8

function getTargetRect(selector: string | null): Rect | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top:    r.top    - PAD,
    left:   r.left   - PAD,
    width:  r.width  + PAD * 2,
    height: r.height + PAD * 2,
  }
}

function buildRoundedRectPath(rect: Rect, cornerRadius = 10): string {
  const r = cornerRadius
  const { top: t, left: l, width: w, height: h } = rect
  const b = t + h
  const right = l + w
  return [
    `M ${l + r} ${t}`,
    `L ${right - r} ${t} Q ${right} ${t} ${right} ${t + r}`,
    `L ${right} ${b - r} Q ${right} ${b} ${right - r} ${b}`,
    `L ${l + r} ${b} Q ${l} ${b} ${l} ${b - r}`,
    `L ${l} ${t + r} Q ${l} ${t} ${l + r} ${t}`,
    `Z`,
  ].join(' ')
}

/** Full clip path: outer viewport rectangle + cutout rect(s) using evenodd rule */
function buildClipPath(cutouts: Rect[], vw: number, vh: number): string {
  const outer = `M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z`
  const holes = cutouts.map(r => buildRoundedRectPath(r, 6)).join(' ')
  return `${outer} ${holes}`
}

// ── Tooltip positioning ───────────────────────────────────────────────────────

const CARD_W = 300

function tooltipPosition(
  rect: Rect | null,
  placement: Step['placement'],
  vw: number,
  vh: number,
  cardHeight: number,
): { top: number | string; left: number | string; transform?: string } {
  if (!rect || placement === 'center') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const GAP = 16
  let top: number
  let left: number

  if (placement === 'top') {
    top  = rect.top - cardHeight - GAP
    left = rect.left + rect.width / 2 - CARD_W / 2
  } else if (placement === 'bottom') {
    top  = rect.top + rect.height + GAP
    left = rect.left + rect.width / 2 - CARD_W / 2
  } else if (placement === 'left') {
    top  = rect.top + rect.height / 2 - cardHeight / 2
    left = rect.left - CARD_W - GAP
  } else {
    // right (default)
    top  = rect.top + rect.height / 2 - cardHeight / 2
    left = rect.left + rect.width + GAP
  }

  // Clamp to viewport with padding
  left = Math.max(12, Math.min(left, vw - CARD_W - 12))
  top  = Math.max(12, Math.min(top, vh - cardHeight - 12))

  return { top, left }
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingTour() {
  const [active,     setActive]     = useState(false)
  const [isMobile,   setIsMobile]   = useState(false)
  const [stepIndex,  setStepIndex]  = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [navRect,    setNavRect]    = useState<Rect | null>(null)
  const [vw, setVw] = useState(0)
  const [vh, setVh] = useState(0)
  const [animating,  setAnimating]  = useState(false)
  // Measure actual rendered card height to fix tooltip overflow
  const cardRef   = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(240)

  // ── Decide whether to show tour ─────────────────────────────────────────

  useEffect(() => {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)
    setVw(window.innerWidth)
    setVh(window.innerHeight)
    const key = mobile ? KEY_MOBILE : KEY_WEB
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const steps = isMobile ? MOBILE_STEPS : WEB_STEPS

  // ── Measure card height after each render ───────────────────────────────

  useEffect(() => {
    if (cardRef.current) {
      const h = cardRef.current.getBoundingClientRect().height
      if (h > 0) setCardHeight(h)
    }
  })

  // ── Update rects when step changes ──────────────────────────────────────

  const updateRects = useCallback(() => {
    if (!active) return
    const step = steps[stepIndex]
    if (!step) return

    // Target element
    setTargetRect(getTargetRect(step.selector))

    // BottomNav bar rect (mobile only, when step targets nav items)
    if (isMobile && step.isBottomNavItem) {
      const navEl = document.querySelector<HTMLElement>('nav.fixed.bottom-0')
      if (navEl) {
        const r = navEl.getBoundingClientRect()
        setNavRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      } else {
        setNavRect(null)
      }
    } else {
      setNavRect(null)
    }
  }, [active, stepIndex, steps, isMobile])

  useEffect(() => {
    updateRects()
    const onResize = () => {
      setVw(window.innerWidth)
      setVh(window.innerHeight)
      updateRects()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [updateRects])

  // Scroll target into view
  useEffect(() => {
    if (!active) return
    const step = steps[stepIndex]
    if (!step?.selector) return
    const el = document.querySelector(step.selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      const t = setTimeout(updateRects, 350)
      return () => clearTimeout(t)
    }
  }, [active, stepIndex, steps, updateRects])

  // ── Lift BottomNav above overlay for nav-item steps ─────────────────────
  // BottomNav is z-50. Overlay is z-[10000]. When highlighting a nav item
  // we raise the whole nav to z-[10002] so it punches through the dim layer.

  useEffect(() => {
    if (!active || !isMobile) return
    const step = steps[stepIndex]
    const nav = document.querySelector<HTMLElement>('nav.fixed.bottom-0')
    if (!nav) return

    if (step?.isBottomNavItem) {
      nav.style.zIndex = '10002'
    } else {
      nav.style.zIndex = ''
    }
    return () => { nav.style.zIndex = '' }
  }, [active, isMobile, stepIndex, steps])

  // ── Navigation ──────────────────────────────────────────────────────────

  const dismiss = useCallback(() => {
    const key = isMobile ? KEY_MOBILE : KEY_WEB
    localStorage.setItem(key, '1')
    if (isMobile) {
      const nav = document.querySelector<HTMLElement>('nav.fixed.bottom-0')
      if (nav) nav.style.zIndex = ''
    }
    setActive(false)
  }, [isMobile])

  const goTo = useCallback((idx: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => { setStepIndex(idx); setAnimating(false) }, 180)
  }, [animating])

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) { dismiss(); return }
    goTo(stepIndex + 1)
  }, [stepIndex, steps.length, dismiss, goTo])

  const prev = useCallback(() => {
    if (stepIndex === 0) return
    goTo(stepIndex - 1)
  }, [stepIndex, goTo])

  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'Escape')     dismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, next, prev, dismiss])

  if (!active) return null

  const step = steps[stepIndex]
  if (!step) return null

  const isFirst  = stepIndex === 0
  const isLast   = stepIndex === steps.length - 1
  const progress = (stepIndex + 1) / steps.length

  // Build cutout list for clip path
  const cutouts: Rect[] = []
  if (targetRect) cutouts.push(targetRect)
  // Always punch out the whole nav bar when it's lifted above the overlay,
  // so the amber active-indicator bar at the top of the nav isn't clipped.
  if (navRect) {
    cutouts.push({ top: navRect.top - PAD, left: navRect.left - PAD, width: navRect.width + PAD * 2, height: navRect.height + PAD * 2 })
  }

  const clipPath = cutouts.length > 0 ? buildClipPath(cutouts, vw, vh) : undefined
  const pos = tooltipPosition(targetRect, step.placement, vw, vh, cardHeight)

  // Compose transform string for animation
  const baseTransform  = pos.transform ?? ''
  const animTransform  = animating  ? `${baseTransform} translateY(6px)`.trim() : baseTransform || 'translateY(0)'

  return (
    <>
      {/* ── Overlay ───────────────────────────────────────────────────── */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {clipPath ? (
          <svg
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="tour-clip" clipRule="evenodd">
                <path fillRule="evenodd" d={clipPath} />
              </clipPath>
            </defs>
            <rect x={0} y={0} width={vw} height={vh} fill="rgba(0,0,0,0.72)" clipPath="url(#tour-clip)" />
            {/* Amber glow ring around the specific target (not the whole nav) */}
            {targetRect && (
              <rect
                x={targetRect.left} y={targetRect.top}
                width={targetRect.width} height={targetRect.height}
                rx={8} ry={8}
                fill="none"
                stroke="var(--amber, #e8a247)"
                strokeWidth={1.5}
                opacity={0.7}
              />
            )}
          </svg>
        ) : (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }} />
        )}
      </div>

      {/* ── Tooltip card ──────────────────────────────────────────────── */}
      <div
        ref={cardRef}
        style={{
          position:    'fixed',
          top:         pos.top,
          left:        pos.left,
          transform:   animTransform,
          width:       CARD_W,
          maxWidth:    'calc(100vw - 24px)',
          // Hard ceiling so the card never overflows the viewport
          maxHeight:   `calc(${vh}px - 24px)`,
          overflowY:   'auto',
          overscrollBehavior: 'contain',
          zIndex:      10001,
          background:  'var(--bg2, #181b1e)',
          border:      '1px solid var(--border2, rgba(255,255,255,0.13))',
          borderRadius: 16,
          boxShadow:   '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,162,71,0.15)',
          padding:     '20px 20px 16px',
          opacity:     animating ? 0 : 1,
          transition:  'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 2, background: 'var(--bg4, #252a2e)', borderRadius: 1, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, var(--amber, #e8a247), var(--teal, #2dd4bf))',
            borderRadius: 1, transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Step counter + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-space-mono, monospace)', fontSize: 11, color: 'var(--text3, #545250)', letterSpacing: '0.08em' }}>
            {stepIndex + 1} / {steps.length}
          </span>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text3, #545250)', display: 'flex', alignItems: 'center', borderRadius: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text, #f0ede8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3, #545250)')}
            aria-label="Skip tour"
          >
            <X size={14} />
          </button>
        </div>

        {/* Emoji + title */}
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>{step.emoji}</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-dm-sans, sans-serif)', color: 'var(--text, #f0ede8)', lineHeight: 1.3 }}>
            {step.title}
          </h3>
        </div>

        {/* Body */}
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text2, #8a8880)', fontFamily: 'var(--font-dm-sans, sans-serif)', marginBottom: 16 }}>
          {step.body}
        </p>

        {/* Navigation row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === stepIndex ? 16 : 6, height: 6, borderRadius: 3,
                  background: i === stepIndex ? 'var(--amber, #e8a247)' : i < stepIndex ? 'var(--teal, #2dd4bf)' : 'var(--bg5, #2d3238)',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s ease', flexShrink: 0,
                }}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Prev */}
          {!isFirst && (
            <button
              onClick={prev}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '7px 12px', borderRadius: 8,
                border: '1px solid var(--border2, rgba(255,255,255,0.13))',
                background: 'none', cursor: 'pointer', fontSize: 12,
                fontFamily: 'var(--font-dm-sans, sans-serif)', fontWeight: 600,
                color: 'var(--text2, #8a8880)', transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text, #f0ede8)'; e.currentTarget.style.borderColor = 'var(--border3, rgba(255,255,255,0.20))' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2, #8a8880)'; e.currentTarget.style.borderColor = 'var(--border2, rgba(255,255,255,0.13))' }}
            >
              <ArrowLeft size={12} /> Back
            </button>
          )}

          {/* Next / Finish */}
          <button
            onClick={next}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: isLast
                ? 'linear-gradient(135deg, var(--amber, #e8a247), var(--rose, #f87171))'
                : 'var(--amber, #e8a247)',
              cursor: 'pointer', fontSize: 12,
              fontFamily: 'var(--font-dm-sans, sans-serif)', fontWeight: 700,
              color: '#111416', transition: 'opacity 0.15s, transform 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'scale(1)' }}
          >
            {isLast ? <><Sparkles size={12} /> {"Let's go"}</> : <>Next <ArrowRight size={12} /></>}
          </button>
        </div>
      </div>
    </>
  )
}
