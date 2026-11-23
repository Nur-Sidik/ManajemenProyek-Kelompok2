import { useState } from 'react';
import { api } from '../api.js';
import { useFetch, useStore } from '../store.jsx';
import {
  budgetStatus, catColor, compact, dayLabel, firstName, fmtDate, goalPlan, monthKeyLabel, pct, pctLabel,
  recentMonthKeys, relTime, rupiah, signedRupiah,
} from '../format.js';
import { Badge, Button, Chip, Icon, Load, PageHead, Progress, Segmented, Select } from '../ui.jsx';

/* =====================  BERANDA  ===================== */
export function HomeScreen() {
  const { user, nav, month, setMonth } = useStore();
  const q = useFetch(async () => {
    const [summary, txs, budgets, goals] = await Promise.all([
      api.summary(month),
      api.transactions({ limit: 5, month }),
      api.budgets(month),
      api.goals('active'),
    ]);
    return { summary, txs, budgets, goals };
  }, [month]);
  const unread = useStore().unread;

  return (
    <>
      <PageHead title={`Halo, ${firstName(user?.name)}`} subtitle="Berikut ringkasan keuanganmu bulan ini.">
        <div className="home-select">
          <Select value={month} onChange={setMonth} options={recentMonthKeys(12).map((k) => ({ value: k, label: monthKeyLabel(k) }))} aria-label="Bulan" />
        </div>
        <Button variant="outline" icon="plus" onClick={() => nav('manual')}>Input Manual</Button>
      </PageHead>

      <Load q={q}>
        {({ summary, txs, budgets, goals }) => {
          const alert = budgets
            .map((b) => ({ ...b, p: pct(b.spent, b.limit) }))
            .filter((b) => b.p >= b.threshold)
            .sort((a, b) => b.p - a.p)[0];
          const goal = goals[0];
          const gp = goal && goalPlan(goal);
          return (
            <div className="stack">
              <div className="grid g-home">
                <div className="card dark balance">
                  <div>
                    <div className="eyebrow">Total saldo</div>
                    <div className="big">{rupiah(summary.balance)}</div>
                    <div className="sub">Saldo tersedia di akunmu</div>
                  </div>
                  <div className="actions">
                    <Button variant="lime" onClick={() => nav('scan')}>Scan Struk</Button>
                    <span className="sub">Catat lebih cepat dengan AI</span>
                  </div>
                </div>
                <div className="card stat-card">
                  <span className="pill-in"><Icon name="down" size={12} /> Masuk</span>
                  <div className="muted" style={{ marginTop: 22 }}>Pemasukan</div>
                  <div className="big" style={{ margin: '8px 0 14px' }}>{rupiah(summary.income)}</div>
                  <div className="mini-note">+ Uang masuk bulan ini</div>
                </div>
                <div className="card stat-card">
                  <span className="pill-out"><Icon name="up" size={12} /> Keluar</span>
                  <div className="muted" style={{ marginTop: 22 }}>Pengeluaran</div>
                  <div className="big" style={{ margin: '8px 0 14px' }}>{rupiah(summary.expense)}</div>
                  <div className="mini-note">&minus; Dalam 7 hari terakhir</div>
                </div>
              </div>

              {alert && (
                <div className={`banner ${alert.p > 100 ? 'red' : 'amber'}`}>
                  <span className="icon-bang">!</span>
                  <div>
                    <strong>Anggaran {alert.category} {alert.p > 100 ? 'terlampaui' : 'hampir habis'}</strong>
                    <span className="t">
                      {pctLabel(alert.p)} terpakai · {alert.p > 100 ? `melebihi ${rupiah(alert.spent - alert.limit)}` : `sisa ${rupiah(alert.limit - alert.spent)}`}. Yuk, atur pengeluaran berikutnya.
                    </span>
                  </div>
                  <button className="link" onClick={() => nav('budget')}>Lihat anggaran <Icon name="right" size={14} /></button>
                </div>
              )}

              <div className="grid g-home-lower">
                <div className="card">
                  <div className="row between">
                    <h2>Transaksi Terbaru</h2>
                    <button className="link" onClick={() => nav('report')}>Lihat laporan <Icon name="right" size={14} /></button>
                  </div>
                  {txs.length === 0 ? (
                    <p className="muted" style={{ padding: '28px 0 8px' }}>Belum ada transaksi. Mulai dengan scan struk atau input manual.</p>
                  ) : (
                    <div className="table">
                      <div className="t-head cols-tx"><span>Transaksi</span><span>Kategori</span><span className="amt">Nominal</span></div>
                      {txs.map((t) => (
                        <div className="t-row cols-tx" key={t.id}>
                          <div><strong>{t.name}</strong><small>{dayLabel(t.date) === fmtDate(t.date) ? fmtDate(t.date) : `${dayLabel(t.date)} · ${fmtDate(t.date)}`}</small></div>
                          <div><Chip category={t.type === 'income' ? 'Pemasukan' : t.category} /></div>
                          <div className={`amt ${t.type === 'income' ? 'pos' : ''}`}>{signedRupiah(t.amount, t.type)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="stack">
                  <div className="card goal-mini">
                    <h2>Selangkah lebih dekat</h2>
                    {goal ? (
                      <>
                        <div className="row between" style={{ margin: '18px 0 10px' }}>
                          <span className="muted">{goal.name}</span><span className="pct">{Math.round(gp.percent)}%</span>
                        </div>
                        <Progress value={gp.percent} />
                        <div className="mini-note" style={{ margin: '14px 0 18px' }}>{rupiah(goal.saved)} dari {rupiah(goal.target)}</div>
                      </>
                    ) : (
                      <p className="muted" style={{ margin: '14px 0 18px' }}>Belum ada target aktif. Buat target pertamamu.</p>
                    )}
                    <button className="link" onClick={() => nav('goals')}>{goal ? 'Lihat target' : 'Buat target'} <Icon name="right" size={14} /></button>
                  </div>
                  <div className="card mint">
                    <h3>{unread} notifikasi untukmu</h3>
                    <p className="mini-note" style={{ margin: '10px 0 14px' }}>Pembaruan anggaran, struk, dan target.</p>
                    <button className="link" onClick={() => nav('notifications')}>Buka notifikasi <Icon name="right" size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </Load>
    </>
  );
}

/* =====================  LAPORAN KEUANGAN  ===================== */
const PERIODS = [
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
  { value: 'year', label: 'Tahun' },
];
const PERIOD_TEXT = {
  week: { chart: 'Pengeluaran 7 hari terakhir', within: 'Dalam 7 hari terakhir', avg: 'Rata-rata harian' },
  month: { chart: 'Pengeluaran bulan ini', within: 'Dalam bulan ini', avg: 'Rata-rata harian' },
  year: { chart: 'Pengeluaran tahun ini', within: 'Dalam tahun ini', avg: 'Rata-rata bulanan' },
};

function niceStep(raw) {
  if (raw <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  const n = [1, 2, 2.5, 5, 7.5, 10].find((c) => f <= c) || 10;
  return n * exp;
}

function BarChart({ series }) {
  const max = Math.max(...series.map((s) => s.amount), 0);
  const step = niceStep(max / 3);
  const top = step * 3;
  const peak = series.findIndex((s) => s.amount === max && max > 0);
  const labelEvery = Math.max(1, Math.ceil(series.length / 8));
  return (
    <div className="chart" role="img" aria-label="Grafik pengeluaran">
      <div className="chart-y">{[0, 1, 2, 3].map((i) => <span key={i}>{i === 0 ? '0' : compact(step * i)}</span>)}</div>
      <div className="chart-plot">
        <div className="grid-layer">{[0, 1, 2, 3].map((i) => <div key={i} className="gridline" style={{ bottom: `${(i / 3) * 100}%` }} />)}</div>
        {series.map((s, i) => (
          <div className="bar-col" key={i} title={`${s.label}: ${rupiah(s.amount)}`}>
            <div className={`bar ${i === peak ? 'top' : ''}`} style={{ height: `${top ? (s.amount / top) * 100 : 0}%` }} />
            {i % labelEvery === 0 && <label>{s.label}</label>}
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadCsv(report, period) {
  const rows = [
    ['Laporan Keuangan SaveSmart AI', report.range],
    [],
    ['Periode', 'Pengeluaran (Rp)'],
    ...report.series.map((s) => [s.label, s.amount]),
    [],
    ['Kategori', 'Pengeluaran (Rp)', 'Persentase'],
    ...report.categories.map((c) => [c.name, c.amount, `${Math.round(c.percent)}%`]),
    [],
    ['Total', report.total],
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `laporan-${period}.csv` });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function ReportScreen() {
  const { nav } = useStore();
  const [period, setPeriod] = useState('week');
  const q = useFetch(async () => {
    const [report, goals] = await Promise.all([api.report(period), api.goals('active')]);
    return { report, goal: goals[0] };
  }, [period]);
  const t = PERIOD_TEXT[period];

  return (
    <>
      <PageHead title="Laporan Keuangan" subtitle="Pahami pola pengeluaran, ambil keputusan lebih terarah.">
        <Button variant="outline" icon="download" disabled={!q.data} onClick={() => downloadCsv(q.data.report, period)}>Unduh Laporan</Button>
      </PageHead>

      <div className="row between" style={{ marginBottom: 18 }}>
        <Segmented className="light" value={period} onChange={setPeriod} options={PERIODS} />
        <span className="badge badge-green" style={{ background: '#fff', color: 'var(--muted)' }}>{q.data?.report.range}</span>
      </div>

      <Load q={q}>
        {({ report, goal }) => {
          const top = report.topCategory;
          const gp = goal && goalPlan(goal);
          return (
            <div className="stack">
              <div className="grid g-3">
                <div className="card"><div className="muted">Total pengeluaran</div><div className="stat-lg">{rupiah(report.total)}</div><div className="sub">{t.within}</div></div>
                <div className="card"><div className="muted">{t.avg}</div><div className="stat-lg">{rupiah(report.dailyAverage)}</div><div className="sub">Berdasarkan periode terpilih</div></div>
                <div className="card">
                  <div className="muted">Kategori terbesar</div>
                  <div className="stat-lg green">{top ? `${top.name} · ${Math.round(top.percent)}%` : '-'}</div>
                  <div className="sub">{top ? `${rupiah(top.amount)} dari total pengeluaran` : 'Belum ada pengeluaran'}</div>
                </div>
              </div>

              <div className="grid g-2-1">
                <div className="card">
                  <h2>{t.chart}</h2>
                  <div className="sub" style={{ marginTop: 6 }}>Rupiah (Rp)</div>
                  {report.series.length ? <BarChart series={report.series} /> : <p className="muted" style={{ padding: 40 }}>Belum ada data.</p>}
                </div>
                <div className="card">
                  <h2 style={{ marginBottom: 22 }}>Pengeluaran per kategori</h2>
                  {report.categories.length === 0 && <p className="muted">Belum ada pengeluaran pada periode ini.</p>}
                  {report.categories.map((c) => (
                    <div className="cat-row" key={c.name}>
                      <div className="head"><span>{c.name}</span><span>{rupiah(c.amount)}</span><span>{Math.round(c.percent)}%</span></div>
                      <div className="progress"><div className="progress-bar" style={{ width: `${c.percent}%`, background: catColor(c.name) }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              {goal && (
                <div className="card dark report-goal">
                  <div><div className="eyebrow">Progres tabungan</div><h3>{Math.round(gp.percent)}% menuju {goal.name}</h3></div>
                  <div><Progress dark value={gp.percent} /><div className="sub" style={{ marginTop: 8 }}>{rupiah(goal.saved)} / {rupiah(goal.target)}</div></div>
                  <button className="link lime" onClick={() => nav('goals')}>Lihat target <Icon name="right" size={14} /></button>
                </div>
              )}
            </div>
          );
        }}
      </Load>
    </>
  );
}

/* =====================  NOTIFIKASI  ===================== */
const NOTIF_UI = {
  budget: { link: 'Lihat Detail Anggaran', route: 'budget' },
  transaction: { link: 'Lihat Transaksi', route: 'home' },
  goal: { link: 'Lihat Target', route: 'goals' },
};

function notifTone(n) {
  if (n.type === 'budget') return n.severity === 'danger' || /terlampaui|melebihi/i.test(n.title) ? 'red' : 'amber';
  return 'green';
}

export function NotificationsScreen() {
  const { nav, setUnread } = useStore();
  const [filter, setFilter] = useState('all');
  const q = useFetch(() => api.notifications(), []);

  const markAll = async () => {
    try { await api.readAllNotifications(); setUnread(0); q.reload(); } catch { /* tetap tampilkan daftar */ }
  };
  const open = async (n) => {
    if (!n.read) { try { await api.readNotification(n.id); } catch { /* abaikan */ } }
    const ui = NOTIF_UI[n.type];
    if (!ui) return q.reload();
    if (n.type === 'goal' && n.refId) nav('goal-detail', n.refId);
    else nav(ui.route);
  };

  return (
    <Load q={q}>
      {(items) => {
        const unread = items.filter((n) => !n.read).length;
        const shown = (filter === 'unread' ? items.filter((n) => !n.read) : items)
          .slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const groups = shown.reduce((acc, n) => {
          const d = dayLabel(n.createdAt);
          const key = d === 'Hari ini' ? 'Hari ini' : d === 'Kemarin' ? 'Kemarin' : 'Sebelumnya';
          (acc[key] = acc[key] || []).push(n);
          return acc;
        }, {});
        return (
          <>
            <PageHead title="Notifikasi" subtitle="Pembaruan penting untuk anggaran, transaksi, dan tujuanmu.">
              <Button variant="outline" onClick={markAll} disabled={unread === 0}>Tandai Semua Dibaca</Button>
            </PageHead>
            <Segmented className="light" value={filter} onChange={setFilter}
              options={[{ value: 'all', label: 'Semua' }, { value: 'unread', label: `Belum dibaca · ${unread}` }]} />
            {shown.length === 0 && <div className="state-box" style={{ marginTop: 24 }}><strong>Tidak ada notifikasi</strong><p>Semua pembaruan sudah kamu baca.</p></div>}
            {['Hari ini', 'Kemarin', 'Sebelumnya'].filter((g) => groups[g]).map((g) => (
              <section key={g}>
                <div className="notif-group">{g}</div>
                {groups[g].map((n) => {
                  const tone = notifTone(n);
                  const ui = NOTIF_UI[n.type];
                  return (
                    <article key={n.id} className={`card notif ${n.read ? 'read' : ''}`}>
                      <div className={`ico ${tone}`}>
                        {n.type === 'budget' ? '!' : n.type === 'goal' ? <Icon name="up" size={20} /> : <Icon name="check" size={20} />}
                      </div>
                      <div>
                        <h3>{n.title}</h3>
                        <p>{n.message}</p>
                        {ui && <button className={`link ${tone === 'red' ? 'red' : ''}`} onClick={() => open(n)}>{ui.link} <Icon name="right" size={13} /></button>}
                      </div>
                      <div className="meta"><span>{relTime(n.createdAt)}</span><i className="dot" /></div>
                    </article>
                  );
                })}
              </section>
            ))}
            {shown.length > 0 && <div className="foot-note">Semua pembaruan terbaru sudah ditampilkan.</div>}
          </>
        );
      }}
    </Load>
  );
}
