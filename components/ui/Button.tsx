interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--amber)',    color: '#0a0a0a',       fontFamily: 'Syne, sans-serif', fontWeight: 600 },
    secondary: { background: 'var(--bg4)',      color: 'var(--text2)',  border: '1px solid var(--border)', fontFamily: 'Syne, sans-serif' },
    danger:    { background: 'var(--rose)',      color: '#0a0a0a',       fontFamily: 'Syne, sans-serif', fontWeight: 600 },
  }

  return (
    <button
      className={`px-4 py-2.5 rounded-xl text-sm transition-all duration-150 ${className}`}
      style={styles[variant]}
      {...props}
    >
      {children}
    </button>
  )
}
