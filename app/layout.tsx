import { Space_Mono, DM_Sans, Cinzel } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Chakra - Personal Work Telemetry',
  description: 'Track effort, energy, and time across all areas of life.',
  icons: {
    icon: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${dmSans.variable} ${cinzel.variable}`}>
      <body className="bg-chakra-bg text-chakra-text antialiased">
        {children}
      </body>
    </html>
  )
}
