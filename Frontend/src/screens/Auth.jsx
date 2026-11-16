import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, Logo } from '../ui.jsx'
import { useStore } from '../store.jsx'

export function Splash() {
  const nav = useNavigate()
  const { state } = useStore()
  useEffect(() => {
    const t = setTimeout(() => nav(state.user ? '/home' : '/welcome', { replace: true }), 1800)
    return () => clearTimeout(t)
  }, [nav, state.user])
  return (
    <div className="screen green">
      <Logo size={82} dark />
      <div className="splash-name">SaveSmart AI</div>
      <div className="splash-tag">Kelola uang lebih cerdas</div>
    </div>
  )
}

const FEATURES = [
  { letter: 'S', cls: 'av-green', title: 'Smart Receipt Scanner', text: 'Foto struk, data transaksi terisi otomatis oleh AI.' },
  { letter: 'B', cls: 'av-amber', title: 'Budget Alert', text: 'Dapat peringatan saat pengeluaran melebihi anggaran.' },
  { letter: 'T', cls: 'av-indigo', title: 'Target Tabungan', text: 'Hitung kebutuhan tabungan bulanan untuk tujuanmu.' },
]

export function Welcome() {
  const nav = useNavigate()
  return (
    <div className="screen center wide">
      <h1 style={{ marginBottom: 18 }}>Satu aplikasi untuk keuanganmu</h1>
      <div className="features">
        {FEATURES.map((f) => (
          <div key={f.letter} className="card feature">
            <div className={`avatar ${f.cls}`}>{f.letter}</div>
            <div>
              <b>{f.title}</b>
              <span className="t">{f.text}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn" style={{ marginTop: 14 }} onClick={() => nav('/register')}>Mulai Sekarang</button>
      <Link to="/login" className="link">Sudah punya akun? Masuk</Link>
    </div>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Login() {
  const nav = useNavigate()
  const { login } = useStore()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!EMAIL_RE.test(f.email)) er.email = 'Masukkan email yang valid.'
    if (f.password.length < 8) er.password = 'Kata sandi minimal 8 karakter.'
    setErr(er)
    if (Object.keys(er).length) return
    // TODO(backend): panggil endpoint login
    login(f.email)
    nav('/home', { replace: true })
  }

  return (
    <form className="screen center" onSubmit={submit} noValidate>
      <Logo size={60} />
      <h1 style={{ marginTop: 20 }}>Selamat datang kembali</h1>
      <p className="sub">Masuk untuk melanjutkan mengelola keuanganmu.</p>
      <Field label="Email" error={err.email}>
        <input className="input" type="email" placeholder="nama@email.com" value={f.email} onChange={set('email')} autoComplete="email" />
      </Field>
      <Field label="Kata sandi" error={err.password}>
        <input className="input" type="password" placeholder="········" value={f.password} onChange={set('password')} autoComplete="current-password" />
      </Field>
      <div className="form-actions">
        <button className="btn" type="submit">Masuk</button>
        <button className="btn outline" type="button" onClick={() => nav('/register')}>Daftar akun baru</button>
      </div>
    </form>
  )
}

export function Register() {
  const nav = useNavigate()
  const { login } = useStore()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState({})
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!f.name.trim()) er.name = 'Nama lengkap wajib diisi.'
    if (!EMAIL_RE.test(f.email)) er.email = 'Masukkan email yang valid.'
    if (f.password.length < 8) er.password = 'Kata sandi minimal 8 karakter.'
    setErr(er)
    if (Object.keys(er).length) return
    // TODO(backend): panggil endpoint register
    login(f.email, f.name.trim())
    nav('/home', { replace: true })
  }

  return (
    <form className="screen center" onSubmit={submit} noValidate>
      <h1>Buat akun baru</h1>
      <p className="sub">Mulai catat pengeluaran dan capai target tabunganmu.</p>
      <Field label="Nama lengkap" error={err.name}>
        <input className="input" placeholder="Abdullah Duwi Putro" value={f.name} onChange={set('name')} autoComplete="name" />
      </Field>
      <Field label="Email" error={err.email}>
        <input className="input" type="email" placeholder="nama@email.com" value={f.email} onChange={set('email')} autoComplete="email" />
      </Field>
      <Field label="Kata sandi" error={err.password}>
        <input className="input" type="password" placeholder="Minimal 8 karakter" value={f.password} onChange={set('password')} autoComplete="new-password" />
      </Field>
      <div className="form-actions">
        <button className="btn" type="submit">Daftar</button>
      </div>
      <Link to="/login" className="link">Sudah punya akun? Masuk</Link>
    </form>
  )
}
