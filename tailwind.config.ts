import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'chakra-bg': '#0d0f14',
        'chakra-bg2': '#13161e',
        'chakra-bg3': '#1a1e29',
        'chakra-bg4': '#20253a',
        'chakra-text': '#d6dae8',
        'chakra-text2': '#7c8299',
        'chakra-text3': '#4a4f63',
        'chakra-accent': '#4f9ef8',
        'chakra-accent-glow': 'rgba(79, 158, 248, 0.12)',
        'chakra-col-todo': '#4a4f63',
        'chakra-col-wip': '#e8a83a',
        'chakra-col-done': '#3ab97d',
        'chakra-priority-high': '#e85d3a',
        'chakra-priority-medium': '#e8a83a',
        'chakra-priority-low': '#4f9ef8',
        'chakra-purple': '#a855f7',
        'chakra-pink': '#ec4899',
        'chakra-cyan': '#06b6d4',
        'chakra-orange': '#f97316',
      },
      backgroundColor: {
        'chakra-border': 'rgba(255, 255, 255, 0.07)',
        'chakra-border2': 'rgba(255, 255, 255, 0.12)',
      },
      fontFamily: {
        'space-mono': ['var(--font-space-mono)', 'monospace'],
        'dm-sans': ['var(--font-dm-sans)', 'sans-serif'],
      },
      keyframes: {
        'chakra-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'chakra-spin-once': 'chakra-spin 600ms ease-out forwards',
        'chakra-spin-fast': 'chakra-spin 400ms ease-out forwards',
        'chakra-spin-loop': 'chakra-spin 1800ms linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
