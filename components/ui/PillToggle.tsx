interface PillToggleProps<T extends string> {
  options: T[]
  value: T
  onChange: (value: T) => void
  label?: string
}

export function PillToggle<T extends string>({ options, value, onChange, label }: PillToggleProps<T>) {
  return (
    <div>
      {label && (
        <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>
          {label}
        </label>
      )}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="px-3 py-1.5 rounded-lg font-mono text-xs capitalize transition-all duration-150"
            style={{
              background: value === opt ? 'var(--amber)' : 'transparent',
              color:      value === opt ? '#0a0a0a'      : 'var(--text3)',
              fontWeight: value === opt ? 600             : 400,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
