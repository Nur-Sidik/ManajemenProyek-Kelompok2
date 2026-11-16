import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

// ---------- helpers ----------
export const rp = (n) => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID')
export const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
export const toDigits = (s) => Number(String(s).replace(/\D/g, '')) || 0

// ---------- ikon ----------
const PATHS = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  budget: (<><path d="M21 12A9 9 0 1 1 12 3v9z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15z" /></>),
  scan: <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10" />,
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>),
  pencil: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  check: <path d="M5 13l4 4L19 7" />,
}

export function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

// ---------- komponen kecil ----------
export function BackLink({ to, light }) {
  const nav = useNavigate()
  return (
    <button type="button" className={'back' + (light ? ' light' : '')} onClick={() => (to ? nav(to) : nav(-1))}>
      &lt; Kembali
    </button>
  )
}

export function Progress({ pct, color = 'var(--green)', track, height = 8 }) {
  return (
    <div className="progress" style={{ height, background: track }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  )
}

export function Logo({ size = 60, dark }) {
  return (
    <div className={'logo' + (dark ? ' dark' : '')} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      S
    </div>
  )
}

export function MoneyInput({ value, onChange, placeholder }) {
  return (
    <input
      className="input"
      inputMode="numeric"
      placeholder={placeholder}
      value={value ? 'Rp ' + value.toLocaleString('id-ID') : ''}
      onChange={(e) => onChange(toDigits(e.target.value))}
    />
  )
}

export function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {error && <span className="err">{error}</span>}
    </label>
  )
}

export function Sheet({ children, onClose }) {
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ---------- navigasi bawah ----------
const NAV = [
  { to: '/home', label: 'Beranda', icon: 'home', match: ['/home', '/report', '/notifications'] },
  { to: '/budget', label: 'Anggaran', icon: 'budget', match: ['/budget'] },
  { to: '/scan', label: 'Scan', icon: 'scan', center: true, match: [] },
  { to: '/target', label: 'Target', icon: 'target', match: ['/target'] },
  { to: '/profile', label: 'Profil', icon: 'user', match: ['/profile'] },
]

export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="bottom-nav" aria-label="Menu utama">
      {NAV.map((n) => {
        const active = n.match.some((m) => pathname.startsWith(m))
        if (n.center) {
          return (
            <Link key={n.to} to={n.to} className="nav-scan" aria-label="Scan struk">
              <span className="nav-scan-btn"><Icon name="scan" size={26} /></span>
              <span className="nav-label">{n.label}</span>
            </Link>
          )
        }
        return (
          <Link key={n.to} to={n.to} className={'nav-item' + (active ? ' active' : '')}>
            <span className="nav-dot"><Icon name={n.icon} size={20} /></span>
            <span className="nav-label">{n.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// Sidebar untuk layar lebar (web)
export function Sidebar() {
  const { pathname } = useLocation()
  const items = NAV.filter((n) => !n.center)
  return (
    <aside className="sidebar" aria-label="Menu utama">
      <Link to="/home" className="side-brand">
        <Logo size={38} />
        <span>SaveSmart AI</span>
      </Link>
      <nav>
        {items.slice(0, 2).map((n) => (
          <Link key={n.to} to={n.to} className={'side-item' + (n.match.some((m) => pathname.startsWith(m)) ? ' active' : '')}>
            <Icon name={n.icon} size={20} />
            {n.label}
          </Link>
        ))}
        <Link to="/scan" className="side-scan">
          <Icon name="scan" size={20} />
          Scan Struk
        </Link>
        {items.slice(2).map((n) => (
          <Link key={n.to} to={n.to} className={'side-item' + (n.match.some((m) => pathname.startsWith(m)) ? ' active' : '')}>
            <Icon name={n.icon} size={20} />
            {n.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

// Layout untuk layar yang memakai navigasi: sidebar (web) / menu bawah (ponsel)
export function WithNav() {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
