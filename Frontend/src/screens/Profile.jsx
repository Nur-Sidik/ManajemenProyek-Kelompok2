import { useState } from 'react';
import { api } from '../api.js';
import { useFetch, useStore } from '../store.jsx';
import { Badge, Button, Field, Input, Load, Modal, PageHead, Select, Toggle } from '../ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfileScreen() {
  const q = useFetch(() => api.me(), []);
  return <Load q={q}>{(me) => <ProfileForm me={me} />}</Load>;
}

function ProfileForm({ me }) {
  const { setUser, user, toast, askLogout } = useStore();
  const [f, setF] = useState(me);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(me);

  const save = async () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Nama lengkap wajib diisi.';
    if (!EMAIL_RE.test(f.email)) e.email = 'Email tidak valid.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const updated = await api.updateMe({ ...f, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() });
      setUser({ ...user, ...updated });
      toast('Perubahan profil disimpan.');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead title="Profil" subtitle="Atur informasi pribadi dan preferensi keuanganmu.">
        <Button loading={saving} disabled={!dirty} onClick={save}>Simpan Perubahan</Button>
      </PageHead>

      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h2>Informasi pribadi</h2><Badge>Akun aktif</Badge></div>
          <Field label="Nama lengkap" error={errors.name}><Input value={f.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Nomor telepon (opsional)"><Input value={f.phone} onChange={set('phone')} placeholder="+62 812 3456 7890" autoComplete="tel" /></Field>
          <div className="field-hint">Email digunakan untuk masuk dan menerima pembaruan penting.</div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Preferensi aplikasi</h2></div>
          <Field label="Bahasa"><Select value={f.language} onChange={set('language')} options={[{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }]} /></Field>
          <Field label="Mata uang"><Select value={f.currency} onChange={set('currency')} options={[{ value: 'IDR', label: 'Rupiah (IDR)' }]} /></Field>
          <Field label="Periode anggaran"><Select value={f.budgetPeriod} onChange={set('budgetPeriod')} options={[{ value: 'monthly', label: 'Bulanan' }, { value: 'weekly', label: 'Mingguan' }]} /></Field>
        </div>

        <div className="card">
          <div className="card-head"><h2>Keamanan akun</h2></div>
          <div className="row between">
            <div><strong style={{ fontWeight: 500 }}>Kata sandi</strong><div className="sub" style={{ marginTop: 4 }}>Ganti secara berkala untuk menjaga akunmu.</div></div>
            <Button variant="outline" onClick={() => setPwOpen(true)}>Ubah Kata Sandi</Button>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />
          <div className="row" style={{ gap: 28 }}>
            <button className="link red" style={{ fontSize: 13 }} onClick={askLogout}>Keluar dari akun</button>
            <span className="sub">Data tetap tersimpan saat kamu masuk kembali.</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Notifikasi</h2></div>
          {[['notifBudget', 'Peringatan anggaran'], ['notifGoal', 'Pengingat tabungan'], ['notifWeekly', 'Email ringkasan mingguan']].map(([k, label]) => (
            <div className="set-row" key={k}><span>{label}</span><Toggle label={label} checked={Boolean(f[k])} onChange={set(k)} /></div>
          ))}
        </div>
      </div>

      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}
    </>
  );
}

function PasswordModal({ onClose }) {
  const { toast } = useStore();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!cur) return setError('Kata sandi saat ini wajib diisi.');
    if (next.length < 8) return setError('Kata sandi baru minimal 8 karakter.');
    if (next !== confirm) return setError('Konfirmasi kata sandi tidak cocok.');
    setError('');
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: cur, newPassword: next });
      toast('Kata sandi berhasil diubah.');
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Ubah kata sandi" onClose={onClose}
      actions={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button loading={busy} onClick={submit}>Simpan</Button>
      </>}>
      {error && <div className="form-error" role="alert">{error}</div>}
      <Field label="Kata sandi saat ini"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
      <Field label="Kata sandi baru"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
      <Field label="Ulangi kata sandi baru"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
    </Modal>
  );
}
