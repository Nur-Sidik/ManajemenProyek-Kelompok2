import { useState } from 'react';
import { api } from '../api.js';
import { useStore } from '../store.jsx';
import { Button, Checkbox, Field, Input, Logo } from '../ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Brand() {
  return (
    <section className="auth-left">
      <Logo light />
      <span className="auth-pill">TEMAN KEUANGAN CERDASMU</span>
      <h2>Langkah kecil hari ini. Masa depan lebih terencana.</h2>
      <p>Catat pengeluaran, jaga anggaran, dan wujudkan targetmu dalam satu ruang yang sederhana.</p>
      <div className="auth-goal">
        <div className="top"><span>Target Laptop Baru</span><span>35% tercapai</span></div>
        <div className="amt-big">Rp 4.200.000</div>
        <div className="sub">dari Rp 12.000.000</div>
        <div className="progress on-dark"><div className="progress-bar tone-lime" style={{ width: '35%' }} /></div>
        <div className="sub">Sedikit demi sedikit, impian jadi lebih dekat.</div>
      </div>
      <div className="auth-foot"><span>SCAN STRUK AI</span><span>/</span><span>ANGGARAN</span><span>/</span><span>TARGET</span></div>
    </section>
  );
}

export default function Auth() {
  const { login, toast } = useStore();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const switchMode = (m) => { setMode(m); setErrors({}); setFormError(''); setShow(false); };

  const validate = () => {
    const e = {};
    if (!isLogin && form.name.trim().length < 2) e.name = 'Nama lengkap wajib diisi.';
    if (!EMAIL_RE.test(form.email)) e.email = 'Masukkan alamat email yang valid.';
    if (isLogin ? !form.password : form.password.length < 8) e.password = isLogin ? 'Kata sandi wajib diisi.' : 'Kata sandi minimal 8 karakter.';
    if (!isLogin && !agree) e.agree = 'Setujui Syarat & Ketentuan untuk melanjutkan.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      let res;
      if (isLogin) {
        res = await api.login({ email: form.email.trim(), password: form.password });
      } else {
        const created = await api.register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
        res = created.token ? created : await api.login({ email: form.email.trim(), password: form.password });
        if (!res.user.name) res.user.name = form.name.trim();
      }
      login(res.token, res.user, isLogin ? remember : true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!EMAIL_RE.test(form.email)) {
      setErrors({ email: 'Isi email dulu, lalu klik "Lupa kata sandi?".' });
      return;
    }
    try { await api.forgotPassword(form.email.trim()); } catch { /* jangan bocorkan status akun */ }
    toast('Jika email terdaftar, tautan pemulihan telah dikirim.');
  };

  return (
    <div className="auth">
      <Brand />
      <section className="auth-right">
        <div className="auth-mobile-brand"><Logo /></div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <h1>{isLogin ? 'Selamat datang kembali' : 'Mulai perjalananmu'}</h1>
          <p>{isLogin ? 'Masuk untuk melanjutkan mengelola keuanganmu.' : 'Buat akun dan kelola uang dengan lebih terarah.'}</p>

          {formError && <div className="form-error" role="alert">{formError}</div>}

          {!isLogin && (
            <Field label="Nama lengkap" error={errors.name}>
              <Input value={form.name} onChange={set('name')} placeholder="Nama lengkapmu" autoComplete="name" />
            </Field>
          )}
          <Field label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="nama@email.com" autoComplete="email" />
          </Field>
          <Field label="Kata sandi" error={errors.password}
            hint={!isLogin ? 'Gunakan kombinasi huruf, angka, dan simbol.' : undefined}>
            <div className="pw-wrap">
              <Input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')}
                placeholder={isLogin ? 'Kata sandimu' : 'Minimal 8 karakter'} autoComplete={isLogin ? 'current-password' : 'new-password'} />
              <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)}>{show ? 'Sembunyikan' : 'Tampilkan'}</button>
            </div>
          </Field>

          {isLogin ? (
            <div className="auth-row">
              <Checkbox checked={remember} onChange={setRemember}>Ingat saya</Checkbox>
              <button type="button" className="link" onClick={forgot}>Lupa kata sandi?</button>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <Checkbox checked={agree} onChange={setAgree}>
                Saya menyetujui Syarat &amp; Ketentuan serta <b style={{ color: 'var(--brand)' }}>Kebijakan Privasi SaveSmart AI.</b>
              </Checkbox>
              {errors.agree && <span className="field-error">{errors.agree}</span>}
            </div>
          )}

          <Button type="submit" className="block lg" loading={busy}>{isLogin ? 'Masuk' : 'Daftar'}</Button>

          <div className="auth-alt">
            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
            <button type="button" onClick={() => switchMode(isLogin ? 'register' : 'login')}>{isLogin ? 'Daftar akun baru' : 'Masuk'}</button>
          </div>
        </form>
        <div className="auth-privacy">Data keuanganmu bersifat pribadi dan terlindungi.</div>
      </section>
    </div>
  );
}
