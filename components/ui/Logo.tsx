'use client'

interface LogoProps {
  spin?: 'once' | 'fast' | 'loop' | null
  size?: number
}

export function Logo({ spin = null, size = 32 }: LogoProps) {
  const animationClass =
    spin === 'once' ? 'chakra-spin-once'
    : spin === 'fast' ? 'chakra-spin-fast'
    : spin === 'loop' ? 'chakra-spin-loop'
    : ''

  // Uses CSS vars --logo-from / --logo-mid / --logo-to defined per theme in globals.css
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      width={size}
      height={size}
      className={animationClass}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="var(--logo-from)" stopOpacity="1"/>
          <stop offset="60%"  stopColor="var(--logo-mid)"  stopOpacity="0.9"/>
          <stop offset="100%" stopColor="var(--logo-to)"   stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="var(--logo-mid)" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="var(--logo-to)"  stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="spokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="var(--logo-from)"/>
          <stop offset="100%" stopColor="var(--logo-to)"/>
        </linearGradient>
        <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="var(--logo-from)"/>
          <stop offset="50%"  stopColor="var(--logo-mid)"/>
          <stop offset="100%" stopColor="var(--logo-to)"/>
        </linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outer ambient glow */}
      <circle cx="60" cy="60" r="55" fill="url(#outerGlow)"/>

      {/* 16 serrated blade teeth */}
      <g filter="url(#glow)" opacity="0.9">
        {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((angle) => (
          <path
            key={angle}
            d="M60 8 L64 18 L60 15 L56 18 Z"
            fill="url(#rimGrad)"
            transform={angle === 0 ? undefined : `rotate(${angle} 60 60)`}
          />
        ))}
      </g>

      {/* Outer rim ring */}
      <circle cx="60" cy="60" r="46" stroke="url(#rimGrad)" strokeWidth="1.5" opacity="0.7"/>

      {/* 8 primary spokes */}
      <g filter="url(#glow)" strokeLinecap="round">
        <line x1="60" y1="22" x2="60" y2="98" stroke="url(#spokeGrad)" strokeWidth="2"/>
        <line x1="22" y1="60" x2="98" y2="60" stroke="url(#spokeGrad)" strokeWidth="2"/>
        <line x1="33.4" y1="33.4" x2="86.6" y2="86.6" stroke="url(#spokeGrad)" strokeWidth="2"/>
        <line x1="86.6" y1="33.4" x2="33.4" y2="86.6" stroke="url(#spokeGrad)" strokeWidth="2"/>
      </g>

      {/* 4 secondary thin spokes */}
      <g stroke="var(--logo-mid)" strokeLinecap="round" opacity="0.4">
        <line x1="60" y1="22" x2="60" y2="98" strokeWidth="0.75" transform="rotate(22.5 60 60)"/>
        <line x1="60" y1="22" x2="60" y2="98" strokeWidth="0.75" transform="rotate(67.5 60 60)"/>
        <line x1="60" y1="22" x2="60" y2="98" strokeWidth="0.75" transform="rotate(112.5 60 60)"/>
        <line x1="60" y1="22" x2="60" y2="98" strokeWidth="0.75" transform="rotate(157.5 60 60)"/>
      </g>

      {/* Middle dashed ring */}
      <circle cx="60" cy="60" r="30" stroke="var(--logo-from)" strokeWidth="0.75" opacity="0.3" strokeDasharray="3.5 2.5"/>

      {/* Inner solid ring */}
      <circle cx="60" cy="60" r="18" stroke="url(#rimGrad)" strokeWidth="1.75" opacity="0.9"/>

      {/* Hub glow */}
      <circle cx="60" cy="60" r="14" fill="url(#coreGlow)" opacity="0.2"/>

      {/* Hub ring */}
      <circle cx="60" cy="60" r="10" stroke="var(--logo-from)" strokeWidth="1.5" opacity="0.85" fill="none"/>

      {/* Center jewel */}
      <circle cx="60" cy="60" r="6" fill="var(--bg)" stroke="var(--logo-mid)" strokeWidth="1"/>
      <circle cx="60" cy="60" r="4" fill="var(--logo-mid)" filter="url(#softGlow)"/>
      <circle cx="60" cy="60" r="2.5" fill="var(--logo-from)"/>
      <circle cx="60" cy="60" r="1.2" fill="white" opacity="0.9"/>

      {/* Spoke tip accent dots */}
      <g fill="var(--logo-from)" filter="url(#glow)" opacity="0.85">
        <circle cx="60"    cy="14.5"  r="2"/>
        <circle cx="60"    cy="105.5" r="2"/>
        <circle cx="14.5"  cy="60"    r="2"/>
        <circle cx="105.5" cy="60"    r="2"/>
        <circle cx="27.7"  cy="27.7"  r="1.5"/>
        <circle cx="92.3"  cy="92.3"  r="1.5"/>
        <circle cx="92.3"  cy="27.7"  r="1.5"/>
        <circle cx="27.7"  cy="92.3"  r="1.5"/>
      </g>
    </svg>
  )
}
