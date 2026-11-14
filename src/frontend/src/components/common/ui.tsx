import React, { useEffect } from 'react'
import Icon from './Icon'

export function Panel({ children, className = '', hot = false, as: Tag = 'section', ...rest }:
  { children: React.ReactNode; className?: string; hot?: boolean; as?: React.ElementType } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={`panel ${hot ? 'panel-hot' : ''} ${className}`} {...rest}>{children}</Tag>
}

export function PageHead({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="kicker">{kicker}</div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}

export function Meter({ value, max, color = '#e5202f', height = 8, marker }:
  { value: number; max: number; color?: string; height?: number; marker?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="relative w-full bg-ink-700" style={{ height }} role="progressbar"
      aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(max)}>
      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      {marker !== undefined && (
        <div className="absolute top-[-3px] bottom-[-3px] w-px bg-bone/60" style={{ left: `${Math.min(100, marker * 100)}%` }} />
      )}
    </div>
  )
}

/** Circular gauge with a big number in the middle. */
export function Ring({ value, max = 100, size = 140, color = '#e5202f', children, stroke = 10 }:
  { value: number; max?: number; size?: number; color?: string; children?: React.ReactNode; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1d1d23" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${c * pct} ${c}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function Stat({ label, value, unit, sub, color }: { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; color?: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num text-2xl font-bold leading-tight" style={{ color }}>
        {value}{unit && <span className="ml-1 text-sm font-medium text-ash">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-ash">{sub}</div>}
    </div>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, className = '' }:
  { value: T | null; options: { id: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="group">
      {options.map(o => (
        <button key={String(o.id)} type="button" className="chip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 1-N numbered scale with a caption for the selected value. */
export function Scale({ value, onChange, labels, from = 1 }: { value: number; onChange: (v: number) => void; labels: string[]; from?: number }) {
  return (
    <div>
      <div className="flex gap-1">
        {labels.map((_, i) => {
          const v = i + from
          return (
            <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v} aria-label={`${v}: ${labels[i]}`}
              className={`num h-10 flex-1 border text-sm font-bold transition-colors ${value === v ? 'border-blood bg-blood text-white' : 'border-ink-600 bg-ink-900 text-ash hover:border-smoke hover:text-bone'}`}>
              {v}
            </button>
          )
        })}
      </div>
      <div className="mt-1 text-xs text-bone-dim">{labels[value - from]}</div>
    </div>
  )
}

export function Stepper({ value, onChange, min, max, step = 1, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="flex items-stretch">
      <button type="button" className="w-10 border border-ink-600 bg-ink-900 text-lg text-bone hover:border-blood" onClick={() => onChange(clamp(value - step))} aria-label="Decrease">−</button>
      <div className="num flex min-w-[4.5rem] flex-1 items-center justify-center border-y border-ink-600 bg-ink-950 px-2 text-lg font-bold">
        {value}{unit && <span className="ml-1 text-xs font-medium text-ash">{unit}</span>}
      </div>
      <button type="button" className="w-10 border border-ink-600 bg-ink-900 text-lg text-bone hover:border-blood" onClick={() => onChange(clamp(value + step))} aria-label="Increase">+</button>
    </div>
  )
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ash">{hint}</span>}
    </label>
  )
}

export function Modal({ open, onClose, children, wide = false, title }:
  { open: boolean; onClose?: () => void; children: React.ReactNode; wide?: boolean; title?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`panel panel-hot rise my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-xl'}`} onClick={e => e.stopPropagation()}>
        {onClose && (
          <button className="absolute right-4 top-3 text-ash hover:text-bone" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        )}
        {children}
      </div>
    </div>
  )
}

/** Small vertical bar chart. Good enough for a few dozen values and matches the theme exactly. */
export function Bars({ data, height = 110, color = '#e5202f', max, unit = '', target, every = 1 }:
  { data: { label: string; value: number; color?: string; title?: string; dim?: boolean }[]; height?: number; color?: string; max?: number; unit?: string; target?: number; every?: number }) {
  const top = Math.max(max ?? 0, target ?? 0, ...data.map(d => d.value), 1)
  return (
    <div>
      <div className="relative flex items-end gap-[3px]" style={{ height }}>
        {target !== undefined && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-bone/35" style={{ bottom: `${(target / top) * 100}%` }}>
            <span className="num absolute -top-4 right-0 text-[10px] text-ash">{target}{unit}</span>
          </div>
        )}
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end" title={d.title ?? `${d.label}: ${d.value}${unit}`}>
            <div className="w-full transition-all duration-300 group-hover:brightness-125"
              style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value > 0 ? 2 : 0, background: d.color ?? color, opacity: d.dim ? 0.35 : 1 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {data.map((d, i) => (
          <div key={i} className="num w-0 flex-1 whitespace-nowrap text-[9px] text-smoke">{i % every === 0 ? d.label : ''}</div>
        ))}
      </div>
    </div>
  )
}

export function Dot({ status }: { status: 'good' | 'watch' | 'bad' | 'info' }) {
  const c = { good: '#4ade80', watch: '#ffa42b', bad: '#e5202f', info: '#615e58' }[status]
  return <span className="mt-1.5 inline-block h-2 w-2 shrink-0" style={{ background: c }} />
}

export function Sources({ items }: { items: { title: string; url: string; used_for?: string }[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map(s => (
        <li key={s.url + s.title}>
          <a className="link" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
          {s.used_for && <div className="text-xs text-ash">{s.used_for}</div>}
        </li>
      ))}
    </ul>
  )
}

export function Details({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-t border-ink-600 py-3" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-cond text-sm font-semibold uppercase tracking-[0.14em] text-bone-dim hover:text-bone">
        {title}
        <Icon name="chevron" size={16} className="transition-transform group-open:rotate-90" />
      </summary>
      <div className="pt-3 text-sm text-bone-dim">{children}</div>
    </details>
  )
}

export const fmtDate = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', opts) : '—'

export const localISO = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
