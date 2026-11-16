import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackLink, Progress, pctOf, rp } from '../ui.jsx'
import { useStore } from '../store.jsx'
import { CATEGORY_SHARE, REPORT } from '../data.js'

export function Home() {
  const nav = useNavigate()
  const { state, unreadCount } = useStore()
  const first = state.user.name.split(' ')[0]
  const month = new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })

  // Anggaran yang paling dekat dengan batas (80%-99%) ditampilkan sebagai peringatan.
  const warn = state.budgets
    .filter((b) => !b.hidden)
    .map((b) => ({ ...b, pct: (b.spent / b.limit) * 100 }))
    .filter((b) => b.pct >= 80 && b.pct < 100)
    .sort((a, b) => b.pct - a.pct)[0]

  return (
    <div className="screen">
      <div className="top">
        <div>
          <h1>Halo, {first}</h1>
          <p className="sub">Ringkasan keuangan {month}</p>
        </div>
        <button className="pill red" onClick={() => nav('/notifications')}>
          {unreadCount > 0 ? `${unreadCount} notifikasi` : 'Notifikasi'}
        </button>
      </div>

      <div className="two-col">
      <div>
      <div className="balance">
        <div className="lbl">Total Saldo</div>
        <div className="big">{rp(state.summary.balance)}</div>
        <div className="two">
          <div><small>Pemasukan</small><b className="in">{rp(state.summary.income)}</b></div>
          <div><small>Pengeluaran</small><b className="out">{rp(state.summary.expense)}</b></div>
        </div>
      </div>

      {warn && (
        <div className="banner">
          <i />
          <div>
            <b>Anggaran {warn.category} hampir habis</b>
            {Math.round(warn.pct)}% terpakai - sisa {rp(warn.limit - warn.spent)}
          </div>
        </div>
      )}

      </div>
      <div className="card tx-card">
      <div className="section" style={{ marginTop: 0 }}>
        <h2>Transaksi Terbaru</h2>
        <Link to="/report">Lihat laporan</Link>
      </div>
      {state.transactions.slice(0, 3).map((t) => (
        <div className="row" key={t.id}>
          <div className="avatar sq av-green">{t.amount > 0 ? 'U' : t.category[0]}</div>
          <div className="grow">
            <b>{t.title}</b>
            <span className="t">{t.category} - {t.when}</span>
          </div>
          <div className={'amt' + (t.amount > 0 ? ' pos' : '')}>{t.amount > 0 ? '+' : ''}{rp(t.amount)}</div>
        </div>
      ))}
      </div>
      </div>
    </div>
  )
}

export function Report() {
  const { state } = useStore()
  const [tab, setTab] = useState('Minggu')
  const r = REPORT[tab]
  const max = Math.max(...r.values)
  const hi = r.values.indexOf(max)
  const goal = state.goals[0]

  return (
    <div className="screen">
      <BackLink to="/home" />
      <div className="head">
        <h1>Laporan Keuangan</h1>
        <p className="sub">Financial Dashboard</p>
      </div>
      <div className="tabs">
        {Object.keys(REPORT).map((k) => (
          <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{k}</button>
        ))}
      </div>

      <div className="two-col">
      <div className="card">
        <div className="muted">{r.title}</div>
        <div className="bars">
          {r.values.map((v, i) => (
            <div key={r.labels[i] + i}>
              <div className={'bar' + (i === hi ? ' hi' : '')} style={{ height: `${(v / max) * 100 * 0.82}%` }} title={`Rp ${(v * 1000).toLocaleString('id-ID')}`} />
              <small>{r.labels[i]}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="muted">Pengeluaran per kategori</div>
        {CATEGORY_SHARE.map((c) => (
          <div className="cat" key={c.name}>
            <b>{c.name} {c.pct}%</b>
            <Progress pct={c.pct} color={c.color} />
          </div>
        ))}
      </div>

      </div>
      {goal && (
        <Link to={`/target/${goal.id}`} className="goal-card">
          <small>Progres tabungan</small>
          <strong>{pctOf(goal.saved, goal.target)}% menuju {goal.name}</strong>
        </Link>
      )}
    </div>
  )
}

export function Notifications() {
  const nav = useNavigate()
  const { state, unreadCount, markRead } = useStore()
  return (
    <div className="screen">
      <BackLink to="/home" />
      <div className="head">
        <h1>Notifikasi</h1>
        <p className="sub">{unreadCount} belum dibaca</p>
      </div>
      <div className="stack">
      {state.notifications.map((n) => (
        <button
          key={n.id}
          className={'card notif' + (n.read ? ' read' : '')}
          onClick={() => { markRead(n.id); nav(n.to) }}
        >
          <div className={'avatar ' + (n.kind === 'budget' ? 'av-red' : n.kind === 'goal' ? 'av-indigo' : 'av-green')} style={n.kind === 'budget' ? { color: 'var(--ink2)' } : undefined}>{n.letter}</div>
          <div>
            <b style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>{n.title}</b>
            <span className="muted" style={{ fontSize: 13 }}>{n.body}</span>
          </div>
        </button>
      ))}
      </div>
    </div>
  )
}
