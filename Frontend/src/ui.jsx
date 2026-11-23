import { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { amountInput, initials, monthKeyLabel, parseAmount } from './format.js';

/* ---------------- Ikon ---------------- */
const ICONS = {
  home: 'M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5',
  budget: 'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 10h16M10 10v10',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8',
  target: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM12 12.5v-.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
  chart: 'M5 20V11M12 20V4M19 20v-6',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  logout: 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9',
  plus: 'M12 5v14M5 12h14',
  right: 'M5 12h14M13 6l6 6-6 6',
  left: 'M19 12H5M11 6l-6 6 6 6',
  up: 'M7 17L17 7M8 7h9v9',
  down: 'M17 7L7 17M16 17H7V8',
  check: 'M5 12.5l4.5 4.5L19 7',
  alert: 'M12 7v6M12 17.5v.01',
  pause: 'M9 6v12M15 6v12',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  camera: 'M4 8h3l2-3h6l2 3h3v12H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
};
export function Icon({ name, size = 18, stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ---------------- Elemen dasar ---------------- */
export function Button({ variant = 'primary', icon, iconRight, loading, children, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner sm" /> : icon && <Icon name={icon} size={16} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={16} />}
    </button>
  );
}

export const Badge = ({ tone = 'green', children, className = '' }) => (
  <span className={`badge badge-${tone} ${className}`}>{children}</span>
);

export function Progress({ value, tone = 'green', dark = false }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`progress ${dark ? 'on-dark' : ''}`}>
      <div className={`progress-bar tone-${tone}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export const Input = (props) => <input className="input" {...props} />;

export function MoneyInput({ value, onChange, ...rest }) {
  return (
    <input className="input" inputMode="numeric" placeholder="Rp 0" value={amountInput(value)}
      onChange={(e) => onChange(parseAmount(e.target.value))} {...rest} />
  );
}

export function Select({ value, onChange, options, ...rest }) {
  return (
    <div className="select-wrap">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
        {options.map((o) => {
          const opt = typeof o === 'object' ? o : { value: o, label: o };
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
      <svg className="select-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
    </div>
  );
}

export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
  );
}

export const Checkbox = ({ checked, onChange, children }) => (
  <label className="check">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="check-box"><Icon name="check" size={12} stroke={3} /></span>
    <span>{children}</span>
  </label>
);

export const Spinner = () => <span className="spinner" role="status" aria-label="Memuat" />;

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="state-box err">
      <strong>Gagal memuat data</strong>
      <p>{error?.message || 'Terjadi kesalahan.'}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}

// Pembungkus status pemuatan: <Load q={useFetch(...)}>{(data) => ...}</Load>
export function Load({ q, children }) {
  if (q.error && !q.data) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (q.loading && !q.data) return <div className="state-box"><Spinner /></div>;
  return q.data ? children(q.data) : null;
}

export const Empty = ({ title, children }) => (
  <div className="state-box"><strong>{title}</strong>{children && <p>{children}</p>}</div>
);

export function Modal({ title, children, onClose, actions }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

export function LogoutModal() {
  const { logoutOpen, cancelLogout, logout } = useStore();
  if (!logoutOpen) return null;
  return (
    <Modal title="Keluar dari akun?" onClose={cancelLogout}
      actions={<>
        <Button variant="outline" onClick={cancelLogout}>Batal</Button>
        <Button variant="danger" onClick={logout}>Keluar</Button>
      </>}>
      Data keuanganmu tetap tersimpan dan akan muncul lagi saat kamu masuk kembali.
    </Modal>
  );
}

export function Toast() {
  const { toastState } = useStore();
  if (!toastState) return null;
  return <div key={toastState.key} className={`toast ${toastState.kind}`} role="status">{toastState.message}</div>;
}

/* ---------------- Tata letak ---------------- */
export const Logo = ({ light }) => (
  <div className={`logo ${light ? 'light' : ''}`}>
    <span className="logo-mark">S</span>
    <span className="logo-text">SaveSmart<sup>AI</sup></span>
  </div>
);

const NAV_MAIN = [
  { key: 'home', label: 'Beranda', icon: 'home', route: 'home' },
  { key: 'budget', label: 'Anggaran', icon: 'budget', route: 'budget' },
  { key: 'scan', label: 'Scan Struk', icon: 'scan', route: 'scan' },
  { key: 'goals', label: 'Target', icon: 'target', route: 'goals' },
  { key: 'profile', label: 'Profil', icon: 'user', route: 'profile' },
];

export function Layout({ active, crumb, children }) {
  const { user, nav, unread, month, askLogout } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const go = (route) => { setDrawerOpen(false); nav(route); };
  const logout = () => { setDrawerOpen(false); askLogout(); };

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Tutup drawer bila layar melebar ke ukuran desktop supaya halaman tidak terkunci.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = (e) => e.matches && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const item = (it, extra) => (
    <button key={it.key} className={`nav-item ${active === it.key ? 'on' : ''}`} onClick={() => go(it.route)}
      aria-current={active === it.key ? 'page' : undefined}>
      <Icon name={it.icon} size={19} />
      <span>{it.label}</span>
      {extra}
    </button>
  );
  const navItems = (
    <>
      <Logo />
      <div className="nav-caption">KEUANGAN PRIBADI</div>
      <nav className="nav">
        {NAV_MAIN.map((it) => item(it))}
        <div className="nav-sep" />
        {item({ key: 'report', label: 'Laporan', icon: 'chart', route: 'report' })}
        {item({ key: 'notifications', label: 'Notifikasi', icon: 'bell', route: 'notifications' },
          unread > 0 && <span className="nav-count">{unread}</span>)}
      </nav>
      <div className="side-tip">
        <strong>Sedikit demi sedikit, jadi kebiasaan baik.</strong>
        <span>Mulai dari satu transaksi hari ini.</span>
      </div>
      <button className="nav-item logout" onClick={logout}><Icon name="logout" size={19} /><span>Keluar</span></button>
    </>
  );
  return (
    <div className="app">
      <aside className="sidebar">{navItems}</aside>

      <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      <aside id="mobile-menu" className={`drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen} aria-label="Menu navigasi">
        <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Tutup menu"><Icon name="close" size={20} /></button>
        {navItems}
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Buka menu"
              aria-expanded={drawerOpen} aria-controls="mobile-menu">
              <Icon name="menu" size={22} />
            </button>
            <div className="mobile-brand"><Logo /></div>
            <div className="crumb">Ruang keuangan / {crumb}</div>
          </div>
          <div className="top-right">
            <span className="top-month">{monthKeyLabel(month)}</span>
            <button className="bell" onClick={() => nav('notifications')} aria-label="Notifikasi">
              <Icon name="bell" size={19} />{unread > 0 && <i />}
            </button>
            <span className="top-sep" />
            <button className="who" onClick={() => nav('profile')}>
              <span className="avatar">{initials(user?.name)}</span>
              <span><strong>{user?.name || 'Pengguna'}</strong><small>Akun pribadi</small></span>
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

export const BackLink = ({ onClick, children }) => (
  <button className="back-link" onClick={onClick}><Icon name="left" size={14} />{children}</button>
);

export const Chip = ({ category, color }) => (
  <span className="chip" style={color ? { '--dot': color } : undefined}>{category}</span>
);

// Hook kecil untuk state form
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = (k) => (v) => setValues((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }));
  return [values, set, setValues];
}
