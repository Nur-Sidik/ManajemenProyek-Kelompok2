import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BackLink, Field, MoneyInput, Progress, Sheet, pctOf, rp } from '../ui.jsx'
import { useStore } from '../store.jsx'
import { CATEGORIES } from '../data.js'

const colorFor = (pct) => (pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)')
const daysLeft = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate()
}

function AlertModal({ budget, onClose }) {
  const nav = useNavigate()
  return (
    <Sheet onClose={onClose}>
      <div className="circle">!</div>
      <h2>Anggaran {budget.category} Terlampaui</h2>
      <p>
        Pengeluaran {rp(budget.spent)} dari batas {rp(budget.limit)}. Kurangi pengeluaran kategori ini agar target tabungan tetap aman.
      </p>
      <Progress pct={100} color="var(--red)" />
      <button className="btn" onClick={() => { onClose(); nav(`/budget/edit?category=${budget.category}`) }}>Lihat Detail Anggaran</button>
      <button className="btn outline" onClick={onClose}>Tutup</button>
    </Sheet>
  )
}

export function Budget() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { state } = useStore()
  const all = state.budgets
  const shown = all.filter((b) => !b.hidden)
  const spent = all.reduce((s, b) => s + b.spent, 0)
  const limit = all.reduce((s, b) => s + b.limit, 0)
  const totalPct = pctOf(spent, limit)

  const showAlert = params.get('alert') === '1'
  const over = shown.find((b) => b.spent > b.limit)
  const closeAlert = () => setParams({}, { replace: true })

  return (
    <div className="screen">
      <div className="head">
        <h1>Anggaran Bulanan</h1>
        <p className="sub">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="card">
        <div className="muted">Total terpakai</div>
        <div className="big-money" style={{ color: 'var(--ink)' }}>{rp(spent)} / {rp(limit)}</div>
        <Progress pct={totalPct} />
        <div className="muted" style={{ marginTop: 10 }}>{totalPct}% terpakai - sisa {daysLeft()} hari</div>
      </div>

      <div className="grid-2">
      {shown.map((b) => {
        const pct = pctOf(b.spent, b.limit)
        const isOver = b.spent > b.limit
        return (
          <button key={b.category} className="card link-card" onClick={() => nav(`/budget/edit?category=${b.category}`)}>
            <div className="b-head">
              <b>{b.category}</b>
              {isOver ? <span className="pill over">Melebihi {pct}%</span> : <span className={'p ' + (pct >= 80 ? 'amber' : 'green')}>{pct}%</span>}
            </div>
            <Progress pct={pct} color={colorFor(pct)} />
            <div className="muted" style={{ marginTop: 10 }}>
              {isOver ? `Melebihi batas ${rp(b.spent - b.limit)}` : `${rp(b.spent)} / ${rp(b.limit)}`}
            </div>
          </button>
        )
      })}
      </div>

      <button className="btn fit" style={{ marginTop: 14 }} onClick={() => nav('/budget/edit')}>Atur Anggaran</button>

      {showAlert && over && <AlertModal budget={over} onClose={closeAlert} />}
    </div>
  )
}

export function BudgetEdit() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { state, saveBudget } = useStore()
  const initial = params.get('category') || 'Makanan'
  const existing = state.budgets.find((b) => b.category === initial)

  const [category, setCategory] = useState(initial)
  const [limit, setLimit] = useState(existing?.limit ?? 0)
  const [alertAt, setAlertAt] = useState(existing?.alertAt ?? 90)
  const [err, setErr] = useState('')

  const pick = (c) => {
    setCategory(c)
    const b = state.budgets.find((x) => x.category === c)
    setLimit(b?.limit ?? 0)
    setAlertAt(b?.alertAt ?? 90)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!limit) return setErr('Masukkan batas anggaran.')
    saveBudget({ category, limit, alertAt })
    nav('/budget', { replace: true })
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <BackLink to="/budget" />
      <div className="head">
        <h1>Atur Anggaran</h1>
        <p className="sub">Tentukan batas pengeluaran per kategori</p>
      </div>
      <Field label="Kategori">
        <select className="input" value={category} onChange={(e) => pick(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Batas anggaran bulanan" error={err}>
        <MoneyInput value={limit} onChange={(v) => { setLimit(v); setErr('') }} placeholder="Rp 1.000.000" />
      </Field>
      <div className="card" style={{ marginTop: 14 }}>
        <b style={{ fontWeight: 500, color: 'var(--ink2)' }}>Kirim peringatan saat terpakai</b>
        <div className="chips">
          {[70, 80, 90].map((p) => (
            <button type="button" key={p} className={alertAt === p ? 'on' : ''} onClick={() => setAlertAt(p)}>{p}%</button>
          ))}
        </div>
        <div className="muted">Notifikasi dikirim juga saat anggaran terlampaui.</div>
      </div>
      <div className="form-actions"><button className="btn" type="submit">Simpan Anggaran</button></div>
    </form>
  )
}
