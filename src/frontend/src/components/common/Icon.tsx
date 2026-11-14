const PATHS: Record<string, string> = {
  dojo: 'M3 9l9-6 9 6M5 9v11h14V9M9 20v-6h6v6',
  roadmap: 'M5 20V4m0 2h9l-2 3 2 3H5M17 14l2 2-2 2m-6 2h8',
  train: 'M12 5v14M5 12h14',
  recovery: 'M3 12h4l2-6 4 12 2-6h6',
  fuel: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  techniques: 'M12 4v5m0 0l-6 5m6-5l6 5M6 14v3m12-3v3M4 19h4m8 0h4m-10-15h4',
  badges: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3zm-3 9l2 2 4-4',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9c0-4 3-6 7-6s7 2 7 6',
  moon: 'M20 14A8 8 0 019 4a8 8 0 1011 10z',
  drop: 'M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v9H5z',
  alert: 'M12 4l9 16H3L12 4zm0 6v4m0 3v.5',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  trash: 'M5 7h14M9 7V4h6v3m-8 0l1 13h8l1-13',
  info: 'M12 8v.5M12 11v6m9-5a9 9 0 11-18 0 9 9 0 0118 0z',
}

export default function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  )
}
