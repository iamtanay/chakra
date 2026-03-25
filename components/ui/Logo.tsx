'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface LogoProps {
  spin?: 'once' | 'fast' | 'loop' | null
  size?: number
}

export function Logo({ spin = null, size = 32 }: LogoProps) {
  const [animationClass, setAnimationClass] = useState<string>('')

  useEffect(() => {
    if (!spin) {
      setAnimationClass('')
      return
    }
    if (spin === 'once') setAnimationClass('chakra-spin-once')
    else if (spin === 'fast') setAnimationClass('chakra-spin-fast')
    else if (spin === 'loop') setAnimationClass('chakra-spin-loop')
  }, [spin])

  return (
    <Image
      src="/logo.svg"
      alt="Chakra"
      width={size}
      height={size}
      className={animationClass}
      style={{ display: 'inline-block' }}
      priority
    />
  )
}