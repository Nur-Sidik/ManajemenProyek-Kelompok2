import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackLink, Field, Logo, MoneyInput, Progress, Sheet, pctOf, rp } from '../ui.jsx'
import { useStore } from '../store.jsx'

const monthly = (target, saved, months) => (months > 0 ? Math.ceil(Math.max(target - saved, 0) / months) : 0)

export function Goals() {
  const nav = useNavigate()
  const { state } = useStore()
  const [main, ...rest] = state.goals

  return (
    <div className="screen">
      <div className="head">
        <h1>Target Tabungan</h1>
        <p className="sub">{state.goals.length} target aktif</p>
      </div>

      {main && (
        <>
          <button className="card dark-green link-card" onClick={() => nav(`/target/${main.id}`)}>
            <div className="muted" style={{ fontWeight: 600 }}>{main.name}</div>
            <div className="big-money" style={{ fontSize: 21 }}>{rp(main.saved)} / {rp(main.target)}</div>
            <Progress pct={pctOf(main.saved, main.target)} color="var(--green-m)" />
            <div className="muted" style={{ marginTop: 10 }}>
              {pctOf(main.saved, main.target)}% tercapai{main.deadline ? ` - target ${main.deadline.replace('Juli', 'Jul')}` : ''}
            </div>
          </button>

          {main.monthsLeft > 0 && (
            <div className="card">
              <div className="muted">Kebutuhan tabungan bulanan</div>
              <div className="big-green">{rp(monthly(main.target, main.saved, main.monthsLeft))} / bulan</div>
              <div className="muted">
                Sisa {rp(main.target - main.saved)} dibagi {main.monthsLeft} bulan menuju target.
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid-2">
      {rest.map((g) => (
        <button key={g.id} className="card link-card" onClick={() => nav(`/target/${g.id}`)}>
          <b style={{ fontSize: 17, color: 'var(--ink2)' }}>{g.name}</b>
          <div className="muted" style={{ fontSize: 16, margin: '8px 0 10px' }}>{rp(g.saved)} / {rp(g.target)}</div>
          <Progress pct={pctOf(g.saved, g.target)} color="var(--indigo)" />
        </button>
      ))}
      </div>

      <button className="btn fit" style={{ marginTop: 14 }} onClick={() => nav('/target/new')}>Tambah Target Baru</button>
    </div>
  )
}

export function GoalNew() {
  const nav = useNavigate()
  const { addGoal } = useStore()
  const [f, setF] = useState({ name: '', target: 0, months: '' })
  const [err, setErr] = useState({})
  const months = Number(f.months) || 0
  const need = months > 0 ? Math.ceil(f.target / months) : 0

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!f.name.trim()) er.name = 'Nama target wajib diisi.'
    if (!f.target) er.target = 'Masukkan nominal target.'
    if (months < 1) er.months = 'Minimal 1 bulan.'
    setErr(er)
    if (Object.keys(er).length) return
    addGoal({ name: f.name.trim(), target: f.target, months })
    nav('/target', { replace: true })
  }

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <BackLink to="/target" />
      <div className="head">
        <h1>Buat Target Baru</h1>
        <p className="sub">Hitung otomatis kebutuhan tabungan</p>
      </div>
      <Field label="Nama target" error={err.name}>
        <input className="input" placeholder="Laptop Baru" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Nominal target" error={err.target}>
        <MoneyInput value={f.target} onChange={(v) => setF({ ...f, target: v })} placeholder="Rp 12.000.000" />
      </Field>
      <Field label="Tercapai dalam (bulan)" error={err.months}>
        <input className="input" inputMode="numeric" placeholder="8 bulan" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
      </Field>
      <div className="calc">
        <small>Kamu perlu menabung</small>
        <b>{rp(need)} / bulan</b>
      </div>
      <div className="form-actions"><button className="btn" type="submit">Simpan Target</button></div>
    </form>
  )
}

export function GoalDetail() {
  const { id } = useParams()
  const { state, deposit } = useStore()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(0)
  const g = state.goals.find((x) => String(x.id) === id)
  if (!g) return <Navigate to="/target" replace />

  const suggest = monthly(g.target, g.saved, g.monthsLeft)
  const openSheet = () => { setAmount(suggest || 0); setOpen(true) }
  const confirm = () => { if (amount) { deposit(g.id, amount); setOpen(false) } }

  return (
    <div className="screen">
      <BackLink to="/target" />
      <div className="head">
        <h1>{g.name}</h1>
        {g.deadline && <p className="sub">Target {g.deadline}</p>}
      </div>

      <div className="goal-card" style={{ marginTop: 0 }}>
        <small>Terkumpul</small>
        <div style={{ fontSize: 34, fontWeight: 700, margin: '8px 0 12px', letterSpacing: '-0.02em' }}>{rp(g.saved)}</div>
        <Progress pct={pctOf(g.saved, g.target)} color="var(--green-m)" />
        <small style={{ display: 'block', marginTop: 10 }}>{pctOf(g.saved, g.target)}% dari {rp(g.target)}</small>
      </div>

      <div className="section"><h2>Riwayat Setoran</h2></div>
      {g.deposits.length === 0 && <p className="muted">Belum ada setoran.</p>}
      {g.deposits.map((d) => (
        <div className="row" key={d.id}>
          <div className="avatar sq av-green">S</div>
          <div className="grow"><b>{d.title}</b><span className="t">Tabungan - {d.when}</span></div>
          <div className="amt pos">+{rp(d.amount)}</div>
        </div>
      ))}

      <button className="btn" style={{ marginTop: 14 }} onClick={openSheet}>Setor Tabungan</button>

      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h2 style={{ marginBottom: 14 }}>Setor Tabungan</h2>
          <div style={{ textAlign: 'left' }}>
            <Field label="Nominal setoran">
              <MoneyInput value={amount} onChange={setAmount} placeholder="Rp 975.000" />
            </Field>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={confirm}>Simpan Setoran</button>
            <button className="btn outline" onClick={() => setOpen(false)}>Batal</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

export function Profile() {
  const nav = useNavigate()
  const { state, logout, resetDemo } = useStore()
  return (
    <div className="screen profile">
      <div className="head" style={{ marginTop: 24 }}>
        <Logo size={72} />
        <h1>{state.user.name}</h1>
        <p className="sub">{state.user.email}</p>
      </div>
      <button className="btn outline" onClick={resetDemo}>Reset data demo</button>
      <button className="btn" onClick={() => { logout(); nav('/welcome', { replace: true }) }}>Keluar</button>
    </div>
  )
}
