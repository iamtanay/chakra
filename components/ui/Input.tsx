import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', style, ...props }, ref) => (
    <div>
      {label && (
        <label
          className="block font-mono text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl outline-none transition-all duration-150 font-syne text-sm ${className}`}
        style={{
          background: 'var(--bg4)',
          border:     '1px solid var(--border)',
          color:      'var(--text)',
          ...style,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber)'; props.onFocus?.(e) }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)'; props.onBlur?.(e) }}
        {...props}
      />
    </div>
  )
)
Input.displayName = 'Input'
