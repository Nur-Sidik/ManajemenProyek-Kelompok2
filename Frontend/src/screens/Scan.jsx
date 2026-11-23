import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useStore } from '../store.jsx';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, fmtDate, pct, rupiah, signedRupiah, todayISO,
} from '../format.js';
import { BackLink, Button, Badge, Field, Icon, Input, MoneyInput, PageHead, Segmented, Select, Spinner } from '../ui.jsx';

const MAX_BYTES = 10 * 1024 * 1024;
const STEPS = ['Unggah', 'Konfirmasi', 'Selesai'];

function Stepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((s, i) => (
        <span key={s} className={i === current ? 'on' : ''}>{`0${i + 1} ${s}`}{i < 2 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> /</span>}</span>
      ))}
    </div>
  );
}

// Cek anggaran kategori setelah transaksi tersimpan -> teks peringatan (atau null)
async function budgetWarning(category, month) {
  try {
    const budgets = await api.budgets(month);
    const b = budgets.find((x) => x.category === category);
    if (!b) return null;
    const p = pct(b.spent, b.limit);
    if (p > 100) return `Anggaran ${category} terlampaui (${Math.round(p)}% terpakai)`;
    if (p >= b.threshold) return `Anggaran ${category} ${Math.round(p)}% terpakai`;
  } catch { /* peringatan bersifat tambahan */ }
  return null;
}

/* ---------- Transaksi Tersimpan ---------- */
function SavedView({ saved, onAgain, againLabel }) {
  const { nav } = useStore();
  const isIncome = saved.type === 'income';
  return (
    <>
      <PageHead title="Transaksi selesai" subtitle="Satu langkah lagi menuju keuangan yang lebih teratur.">
        {saved.scanned && <Stepper current={2} />}
      </PageHead>
      <div className="card center-card wide">
        <div className="big-icon green"><Icon name="check" size={26} stroke={2.4} /></div>
        <h2>Transaksi Tersimpan</h2>
        <p className="lead" style={{ maxWidth: 'none' }}>{isIncome ? 'Pemasukanmu' : 'Pengeluaranmu'} sudah tercatat dengan aman.</p>
        <div className="summary-box">
          <div className="r"><span>{isIncome ? 'Sumber' : 'Toko'}</span><b>{saved.name}</b></div>
          <div className="r"><span>Tanggal</span><b>{fmtDate(saved.date)}</b></div>
          <div className="r"><span>Kategori</span><b>{saved.category}</b></div>
          <div className="r total"><span>{isIncome ? 'Total pemasukan' : 'Total pengeluaran'}</span><b style={{ color: isIncome ? 'var(--brand)' : undefined }}>{signedRupiah(saved.amount, saved.type)}</b></div>
        </div>
        {saved.warning && (
          <div className="banner amber" style={{ padding: '12px 16px', marginBottom: 14, textAlign: 'left' }}>
            <span className="icon-bang">!</span><strong style={{ fontSize: 12.5 }}>{saved.warning}</strong>
          </div>
        )}
        <div className="btns btns-saved">
          <Button onClick={() => nav('home')}>Kembali ke Dashboard</Button>
          <Button variant="outline" onClick={onAgain}>{againLabel}</Button>
        </div>
      </div>
    </>
  );
}

/* ---------- Scan Struk (Unggah → Konfirmasi → Selesai / Tidak terbaca) ---------- */
export function ScanScreen() {
  const { nav, month, toast } = useStore();
  const [step, setStep] = useState('upload'); // upload | reading | confirm | unreadable | saved
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pickRef = useRef();
  const camRef = useRef();

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const reset = () => { setStep('upload'); setFile(null); setPreview(''); setResult(null); setError(''); };

  const handleFile = async (f) => {
    if (!f) return;
    setError('');
    if (!/^image\/(jpeg|png)$/.test(f.type)) return setError('Format file harus JPG atau PNG.');
    if (f.size > MAX_BYTES) return setError('Ukuran file maksimum 10 MB.');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep('reading');
    try {
      const r = await api.scanReceipt(f);
      setResult({ ...r, date: r.date || todayISO() });
      setStep('confirm');
    } catch (e) {
      if (e.status === 422 || e.code === 'RECEIPT_UNREADABLE') setStep('unreadable');
      else { setError(e.message); setStep('upload'); }
    }
  };

  const save = async () => {
    if (!result.merchant.trim() || !result.total) return toast('Nama toko dan total wajib diisi.', 'err');
    setSaving(true);
    try {
      await api.createTransaction({
        type: 'expense', name: result.merchant.trim(), amount: result.total, date: result.date,
        category: result.category, source: 'scan', items: result.items.map((i) => ({ name: i.name, amount: i.amount })),
      });
      const warning = await budgetWarning(result.category, month);
      setSaved({ type: 'expense', name: result.merchant, date: result.date, category: result.category, amount: result.total, warning, scanned: true });
      setStep('saved');
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const fileInputs = (
    <>
      <input ref={pickRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
    </>
  );

  /* --- Struk tidak terbaca --- */
  if (step === 'unreadable') {
    return (
      <>
        <PageHead title="Scan Struk" subtitle="Belum berhasil? Kamu tetap bisa mencatat transaksi secara manual." />
        <div className="card center-card wide">
          <div className="big-icon red">!</div>
          <h2>Struk Tidak Terbaca</h2>
          <p className="lead">Foto terlalu gelap atau buram. Coba lagi dengan cahaya yang cukup, atau isi transaksi secara manual.</p>
          <div className="tips"><strong>Tips untuk hasil yang lebih jelas</strong><span>Letakkan struk di permukaan rata dan hindari pantulan cahaya.</span></div>
          <div className="btns">
            <Button onClick={reset}>Scan Ulang</Button>
            <Button variant="outline" onClick={() => nav('manual')}>Input Manual</Button>
          </div>
          <div className="foot">Tidak ada transaksi yang tersimpan dari foto ini.</div>
        </div>
      </>
    );
  }

  /* --- Transaksi tersimpan --- */
  if (step === 'saved') return <SavedView saved={saved} againLabel="Scan Struk Lagi" onAgain={reset} />;

  /* --- Konfirmasi transaksi --- */
  if (step === 'confirm' && result) {
    const set = (k) => (v) => setResult((r) => ({ ...r, [k]: v }));
    const cats = EXPENSE_CATEGORIES.includes(result.category) ? EXPENSE_CATEGORIES : [result.category, ...EXPENSE_CATEGORIES];
    return (
      <>
        <PageHead title="Konfirmasi Transaksi" subtitle="Periksa hasil pembacaan AI sebelum menyimpan transaksi."><Stepper current={1} /></PageHead>
        <div className="grid g-scan-confirm">
          <div className="receipt-view">
            <span className="tag">STRUK ASLI</span>
            <img src={preview} alt="Foto struk" />
            <div className="fname">{file?.name}</div>
            <div className="note">Hasil AI perlu diperiksa kembali.<br />Pastikan total sesuai dengan strukmu.</div>
          </div>
          <div className="card">
            <div className="card-head"><h2>Detail transaksi</h2>{result.confidence > 0 && <Badge><Icon name="check" size={12} stroke={2.6} /> Akurasi AI {result.confidence}%</Badge>}</div>
            <Field label="Toko"><Input value={result.merchant} onChange={(e) => set('merchant')(e.target.value)} /></Field>
            <div className="form-grid">
              <Field label="Tanggal"><Input type="date" max={todayISO()} value={result.date} onChange={(e) => set('date')(e.target.value)} /></Field>
              <Field label="Kategori"><Select value={result.category} onChange={set('category')} options={cats} /></Field>
            </div>
            <div className="items-head">Item Terdeteksi <span>{result.items.length} item</span></div>
            {result.items.map((it, i) => <div className="item-row" key={i}><span>{it.name}</span><span>{rupiah(it.amount)}</span></div>)}
            {result.items.length === 0 && <div className="item-row muted">Tidak ada rincian item.</div>}
            <div className="total-row"><span>Total</span><MoneyInput value={result.total} onChange={set('total')} aria-label="Total" /></div>
            <div className="row" style={{ gap: 14 }}>
              <Button className="lg" style={{ flex: 1.6 }} loading={saving} onClick={save}>Simpan Transaksi</Button>
              <Button className="lg" variant="outline" style={{ flex: 1 }} onClick={reset}>Scan Ulang</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* --- Unggah (dan proses membaca) --- */
  const reading = step === 'reading';
  return (
    <>
      <PageHead title="Scan Struk" subtitle="Foto struk, biarkan AI membantu mencatat pengeluaranmu."><Stepper current={0} /></PageHead>
      {fileInputs}
      <div className="grid g-scan-upload">
        <div className="card">
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (!reading) handleFile(e.dataTransfer.files[0]); }}
          >
            {reading ? (
              <div className="reading">
                {preview && <img src={preview} alt="Struk yang dibaca" style={{ maxHeight: 260 }} />}
                <Spinner /><strong style={{ color: 'var(--ink)' }}>AI sedang membaca struk…</strong>
              </div>
            ) : (
              <div>
                <div className="dz-icon"><Icon name="upload" size={28} /></div>
                <h3>Foto struk di sini</h3>
                <p>Gunakan kamera atau pilih foto dari galeri.</p>
              </div>
            )}
          </div>
          {error && <div className="form-error" style={{ marginTop: 16, marginBottom: 0 }} role="alert">{error}</div>}
          <div className="upload-actions">
            <Button className="lg" icon="upload" disabled={reading} onClick={() => pickRef.current.click()}>Unggah Foto Struk</Button>
            <Button className="lg" variant="outline" icon="camera" disabled={reading} onClick={() => camRef.current.click()}>Gunakan Kamera</Button>
          </div>
          <div className="hint-line">Format JPG atau PNG · Maksimum 10 MB · Data hanya digunakan untuk pencatatan transaksi.</div>
        </div>

        <div className="stack">
          <div className="card">
            <Badge><Icon name="spark" size={12} /> SMART RECEIPT SCANNER</Badge>
            <h2 style={{ fontSize: 22, lineHeight: 1.3, margin: '20px 0 0' }}>Satu foto.<br />Tanpa ketik satu-satu.</h2>
            <div className="steps-list">
              {[['Foto di tempat terang', 'Pastikan teks dan total terlihat jelas.'], ['Ambil seluruh bagian struk', 'Hindari lipatan atau sudut terpotong.'], ['Periksa hasil pembacaan', 'Kamu bisa mengubah data sebelum simpan.']].map(([t, d], i) => (
                <div className="s" key={t}><span className="n">{`0${i + 1}`}</span><div><strong>{t}</strong><span>{d}</span></div></div>
              ))}
            </div>
          </div>
          <div className="card mint">
            <h3>Tidak punya struk?</h3>
            <p className="mini-note" style={{ margin: '10px 0 18px', color: 'var(--muted)' }}>Catat pemasukan atau pengeluaran langsung lewat formulir manual.</p>
            <Button variant="outline" className="block" iconRight="right" onClick={() => nav('manual')}>Input Manual</Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Input Manual (Pengeluaran & Pemasukan) ---------- */
export function ManualScreen() {
  const { nav, month, toast } = useStore();
  const [type, setType] = useState('expense');
  const [f, setF] = useState({ name: '', amount: 0, date: todayISO(), category: EXPENSE_CATEGORIES[0], note: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const income = type === 'income';
  const cats = income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const switchType = (t) => { setType(t); setErrors({}); setF((s) => ({ ...s, category: (t === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0] })); };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = income ? 'Sumber pemasukan wajib diisi.' : 'Nama transaksi wajib diisi.';
    if (!f.amount) er.amount = 'Nominal harus lebih dari 0.';
    if (!f.date) er.date = 'Tanggal wajib diisi.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    try {
      await api.createTransaction({ type, name: f.name.trim(), amount: f.amount, date: f.date, category: f.category, note: f.note.trim(), source: 'manual' });
      const warning = income ? null : await budgetWarning(f.category, month);
      setSaved({ type, name: f.name.trim(), date: f.date, category: f.category, amount: f.amount, warning });
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return <SavedView saved={saved} againLabel="Input Lagi" onAgain={() => { setSaved(null); setF({ name: '', amount: 0, date: todayISO(), category: cats[0], note: '' }); }} />;
  }

  return (
    <>
      <PageHead title="Input Manual" subtitle="Catat transaksi tanpa struk, tetap rapi dan terkelompok.">
        <BackLink onClick={() => nav('scan')}>Kembali ke Scan Struk</BackLink>
      </PageHead>
      <div className="grid g-form">
        <form className="card" onSubmit={submit} noValidate>
          <Field label="Jenis transaksi" className="seg-field">
            <Segmented value={type} onChange={switchType} options={[{ value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]} />
          </Field>
          <Field label={income ? 'Sumber pemasukan' : 'Nama transaksi'} error={errors.name}>
            <Input value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder={income ? 'mis. Uang Saku' : 'mis. Indomaret Kaliurang'} />
          </Field>
          <Field label="Nominal" error={errors.amount}><MoneyInput value={f.amount} onChange={set('amount')} /></Field>
          <div className="form-grid">
            <Field label="Tanggal" error={errors.date}><Input type="date" max={todayISO()} value={f.date} onChange={(e) => set('date')(e.target.value)} /></Field>
            <Field label="Kategori"><Select value={f.category} onChange={set('category')} options={cats} /></Field>
          </div>
          <Field label="Catatan (opsional)"><Input value={f.note} onChange={(e) => set('note')(e.target.value)} placeholder="Belanja kebutuhan harian" /></Field>
          <div className="form-actions">
            <Button type="submit" className="lg" loading={saving}>Simpan Transaksi</Button>
            <Button type="button" variant="outline" className="lg" onClick={() => nav('scan')}>Batal</Button>
          </div>
        </form>

        <div className="stack">
          <div className="card dark">
            <div className="eyebrow">Ringkasan transaksi</div>
            <h2 style={{ margin: '14px 0 10px', fontSize: 19 }}>{income ? 'Pemasukan baru' : 'Pengeluaran baru'}</h2>
            <div className={`big ${income ? 'lime' : ''}`} style={{ margin: '0 0 6px' }}>{signedRupiah(f.amount, type)}</div>
            <div className="sub">{income ? 'Menambah saldo tersedia' : 'Mengurangi saldo tersedia'}</div>
            <hr className="rule" />
            <div className="kv"><span>Kategori</span><b>{f.category}</b></div>
            <div className="kv"><span>Pencatatan</span><b>Manual</b></div>
          </div>
          {income ? (
            <div className="card mint info-card">
              <h3>Setiap pemasukan berarti.</h3>
              <p>Pemasukan akan ditambahkan ke saldo dan laporan keuangan. Tidak memengaruhi batas anggaran pengeluaran.</p>
            </div>
          ) : (
            <div className="card amber info-card">
              <h3>Tetap pantau anggaranmu.</h3>
              <p>Transaksi akan masuk ke anggaran sesuai kategori. Periksa nominal dan tanggal agar laporanmu tetap akurat.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
