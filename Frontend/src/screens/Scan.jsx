import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BackLink, Field, Icon, MoneyInput, pctOf, rp } from '../ui.jsx'
import { useStore } from '../store.jsx'
import { CATEGORIES } from '../data.js'
import { scanReceipt } from '../services/ocr.js'

const STEPS = ['Deteksi teks (OCR)', 'Kenali toko dan item', 'Kategorikan otomatis']
const fmtDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export function Scan() {
  const nav = useNavigate()
  const { setScanResult } = useStore()
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const [camOn, setCamOn] = useState(false)
  const [step, setStep] = useState(0) // 0 = belum memproses

  // Coba nyalakan kamera belakang; kalau gagal, tampilkan bingkai kosong.
  useEffect(() => {
    let stream
    let cancelled = false
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setCamOn(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function run({ file, fail } = {}) {
    if (step) return
    setStep(1)
    const t1 = setTimeout(() => setStep(2), 800)
    const t2 = setTimeout(() => setStep(3), 1600)
    try {
      const result = await scanReceipt({ file, fail })
      setScanResult(result)
      nav('/scan/confirm', { replace: true })
    } catch {
      nav('/scan/error', { replace: true })
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }

  return (
    <div className="screen dark">
      <BackLink to="/home" light />
      <div className="head">
        <h1>Scan Struk</h1>
        <p className="sub" style={{ marginTop: 14 }}>Arahkan kamera ke struk. AI membaca toko, total, dan item otomatis.</p>
      </div>

      <div className="viewfinder">
        {camOn && <video ref={videoRef} autoPlay playsInline muted />}
        <div className="over">
          <span className="chip">AI Vision aktif</span>
          <span>Posisikan struk di dalam bingkai</span>
        </div>
      </div>

      <div className="controls">
        <button className="round" aria-label="Pilih dari galeri" onClick={() => fileRef.current?.click()}><Icon name="image" /></button>
        <button className="shutter" aria-label="Ambil foto struk" onClick={() => run()} />
        <button className="round" aria-label="Input manual" onClick={() => nav('/scan/manual')}><Icon name="pencil" /></button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && run({ file: e.target.files[0] })} />
      <button className="demo" onClick={() => run({ fail: true })}>Demo: simulasikan struk tidak terbaca</button>

      {step > 0 && (
        <div className="processing">
          <div className="chip">AI Vision aktif</div>
          <h2>Membaca struk...</h2>
          <p>AI Vision mengekstrak toko, tanggal, dan total</p>
          <div className="steps">
            {STEPS.map((s, i) => {
              const state = step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''
              return (
                <div key={s} className={'step ' + state}>
                  <span className="dot">{state === 'done' && <Icon name="check" size={13} />}</span>
                  {s}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function Confirm() {
  const nav = useNavigate()
  const { scanResult, setScanResult, addTransaction } = useStore()
  const [category, setCategory] = useState(scanResult?.category ?? 'Makanan')
  if (!scanResult) return <Navigate to="/scan" replace />

  const save = () => {
    const tx = addTransaction({ title: scanResult.store, category, amount: scanResult.total })
    setScanResult(null)
    nav('/scan/success', { replace: true, state: { tx } })
  }

  return (
    <div className="screen">
      <div className="head">
        <h1>Konfirmasi Transaksi</h1>
        <p style={{ marginTop: 12 }}><span className="chip">Terbaca AI - akurasi {scanResult.accuracy}%</span></p>
      </div>
      <div className="card">
        <div className="kv"><span>Toko</span><b>{scanResult.store}</b></div>
        <div className="kv"><span>Tanggal</span><b>{fmtDate(scanResult.date)}</b></div>
        <div className="kv">
          <span>Kategori</span>
          <select className="tag" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Kategori">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        <b style={{ display: 'block', marginBottom: 6 }}>Item Terdeteksi</b>
        {scanResult.items.map((i) => (
          <div className="kv" key={i.name}><span style={{ color: 'var(--ink2)', fontSize: 15 }}>{i.name}</span><b>{rp(i.price)}</b></div>
        ))}
        <div className="kv total"><span>Total</span><b>{rp(scanResult.total)}</b></div>
      </div>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <button className="btn" onClick={save}>Simpan Transaksi</button>
        <button className="btn outline" onClick={() => { setScanResult(null); nav('/scan', { replace: true }) }}>Scan Ulang</button>
      </div>
    </div>
  )
}

export function ScanError() {
  const nav = useNavigate()
  return (
    <div className="screen center status">
      <div className="circle bad">!</div>
      <h1>Struk Tidak Terbaca</h1>
      <p style={{ marginTop: 8 }}>Foto terlalu gelap atau buram. Coba lagi dengan cahaya cukup, atau isi transaksi secara manual.</p>
      <button className="btn" onClick={() => nav('/scan', { replace: true })}>Scan Ulang</button>
      <button className="btn outline" onClick={() => nav('/scan/manual', { replace: true })}>Input Manual</button>
    </div>
  )
}

export function Success() {
  const nav = useNavigate()
  const { state } = useLocation()
  const { state: store } = useStore()
  if (!state?.tx) return <Navigate to="/home" replace />
  const tx = state.tx
  const b = store.budgets.find((x) => x.category === tx.category)
  const pct = b ? pctOf(b.spent, b.limit) : 0

  return (
    <div className="screen center status">
      <div className="circle ok"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></div>
      <h1 style={{ marginBottom: 18 }}>Transaksi Tersimpan</h1>
      <div className="card">
        <div className="kv"><span style={{ color: 'var(--ink2)', fontSize: 15 }}>{tx.title}</span><b>{rp(tx.amount)}</b></div>
        <div className="kv"><span>Kategori</span><b>{tx.category}</b></div>
      </div>
      {b && pct >= 70 && (
        <div className={'banner' + (pct >= 100 ? ' red' : '')} style={{ marginTop: 0, marginBottom: 12, textAlign: 'left' }}>
          <i />
          <b>{pct >= 100 ? `Anggaran ${tx.category} terlampaui (${pct}%)` : `Anggaran ${tx.category} ${pct}% terpakai`}</b>
        </div>
      )}
      <button className="btn" onClick={() => nav('/home', { replace: true })}>Kembali ke Dashboard</button>
    </div>
  )
}

// Tujuan tombol "Input Manual" (tidak ada di Figma, dibuat mengikuti gaya layar Konfirmasi).
export function ManualInput() {
  const nav = useNavigate()
  const { addTransaction } = useStore()
  const [f, setF] = useState({ title: '', amount: 0, category: 'Makanan' })
  const [err, setErr] = useState({})

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!f.title.trim()) er.title = 'Nama toko / keterangan wajib diisi.'
    if (!f.amount) er.amount = 'Masukkan nominal.'
    setErr(er)
    if (Object.keys(er).length) return
    const tx = addTransaction({ title: f.title.trim(), category: f.category, amount: f.amount })
    nav('/scan/success', { replace: true, state: { tx } })
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <BackLink to="/scan" />
      <div className="head">
        <h1>Input Manual</h1>
        <p className="sub">Isi detail transaksi secara manual.</p>
      </div>
      <Field label="Toko / keterangan" error={err.title}>
        <input className="input" placeholder="Indomaret Kaliurang" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </Field>
      <Field label="Nominal" error={err.amount}>
        <MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} placeholder="Rp 52.000" />
      </Field>
      <Field label="Kategori">
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div className="form-actions"><button className="btn" type="submit">Simpan Transaksi</button></div>
    </form>
  )
}
