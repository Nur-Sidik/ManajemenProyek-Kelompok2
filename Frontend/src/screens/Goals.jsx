import { useState } from 'react';
import { api } from '../api.js';
import { useFetch, useStore } from '../store.jsx';
import { addMonthsISO, fmtDate, goalPlan, monthName, monthYear, pct, rupiah, todayISO } from '../format.js';
import { BackLink, Badge, Button, Empty, Field, Icon, Input, Load, MoneyInput, PageHead, Progress, Select } from '../ui.jsx';

const MONTH_OPTIONS = [3, 4, 6, 8, 10, 12, 18, 24, 36];

/* =====================  TARGET TABUNGAN (daftar)  ===================== */
export function GoalsScreen() {
  const { nav, toast } = useStore();
  const [showInactive, setShowInactive] = useState(false);
  const q = useFetch(async () => {
    const [active, inactive] = await Promise.all([api.goals('active'), api.goals('inactive')]);
    return { active, inactive };
  }, []);

  const reactivate = async (g) => {
    try { await api.setGoalStatus(g.id, true); toast(`Target ${g.name} diaktifkan kembali.`); q.reload(); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <PageHead title="Target Tabungan" subtitle="Beri setiap rupiah sebuah tujuan.">
        <button className="link" onClick={() => setShowInactive((s) => !s)}>{showInactive ? 'Target aktif' : 'Target nonaktif'}</button>
        <Button icon="plus" onClick={() => nav('goal-new')}>Tambah Target Baru</Button>
      </PageHead>

      <Load q={q}>
        {({ active, inactive }) => {
          const list = showInactive ? inactive : active;
          const saved = active.reduce((s, g) => s + g.saved, 0);
          const target = active.reduce((s, g) => s + g.target, 0);
          const featured = active.find((g) => goalPlan(g).months) || active[0];
          const fp = featured && goalPlan(featured);
          return (
            <div className="stack">
              <div className="card goal-stats">
                <div><span className="eyebrow">Target aktif</span><strong>{active.length} target</strong></div>
                <div><span className="eyebrow">Total terkumpul</span><strong>{rupiah(saved)}</strong></div>
                <div><span className="eyebrow">Total impianmu</span><strong>{rupiah(target)}</strong></div>
              </div>

              {list.length === 0 ? (
                <Empty title={showInactive ? 'Tidak ada target nonaktif' : 'Belum ada target aktif'}>
                  {showInactive ? 'Target yang kamu jeda akan muncul di sini.' : 'Mulai dengan satu tujuan kecil, lalu setor sedikit demi sedikit.'}
                  {!showInactive && <Button style={{ marginTop: 8 }} onClick={() => nav('goal-new')}>Tambah Target Baru</Button>}
                </Empty>
              ) : (
                <div className="grid g-2">
                  {list.map((g, i) => {
                    const p = goalPlan(g);
                    const dark = i === 0 && !showInactive;
                    return (
                      <div key={g.id} className={`card goal-card ${dark ? 'dark' : ''}`}>
                        <div className="head"><h3>{g.name}</h3><Badge tone={dark ? 'dark' : 'green'}>{g.active ? 'Aktif' : 'Nonaktif'}</Badge></div>
                        <div className="amount">{rupiah(g.saved)}</div>
                        <div className="sub">dari {rupiah(g.target)}</div>
                        <Progress dark={dark} tone={dark ? 'lime' : 'green'} value={p.percent} />
                        <div className="meta"><span>{Math.round(p.percent)}% tercapai</span><span>{p.months ? `Target ${p.endLabel}` : 'Target Fleksibel'}</span></div>
                        <div className="btns">
                          {g.active
                            ? <Button variant={dark ? 'lime' : 'primary'} onClick={() => nav('goal-deposit', g.id)}>Setor Tabungan</Button>
                            : <Button onClick={() => reactivate(g)}>Aktifkan Kembali</Button>}
                          <Button variant={dark ? 'ghost' : 'outline'} iconRight="right" onClick={() => nav('goal-detail', g.id)}>Lihat Detail</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!showInactive && featured && (
                <div className="grid g-goal-featured">
                  <div className="card plan-card">
                    <Badge>RENCANA {featured.name.toUpperCase()}</Badge>
                    {fp.months ? (
                      <>
                        <div className="amount">{rupiah(fp.perMonth)}<small>/ bulan</small></div>
                        <div className="muted">Sisa {rupiah(fp.remaining)} dibagi {fp.months} bulan menuju target.</div>
                      </>
                    ) : (
                      <div className="muted" style={{ margin: '14px 0 6px' }}>Target fleksibel — setor kapan pun kamu bisa.</div>
                    )}
                    <div className="mini-note" style={{ marginTop: 14 }}>Menabung konsisten membuat tujuan lebih dekat.</div>
                  </div>
                  <div className="card mint info-card">
                    <h3 style={{ fontSize: 19 }}>Rencanakan, lalu sisihkan.</h3>
                    <p style={{ marginTop: 14 }}>Setor tabungan setelah menerima pemasukan, bukan menunggu uang tersisa di akhir bulan.</p>
                  </div>
                </div>
              )}
            </div>
          );
        }}
      </Load>
    </>
  );
}

/* =====================  DETAIL TARGET + RIWAYAT SETORAN  ===================== */
export function GoalDetailScreen({ id }) {
  const { nav, toast } = useStore();
  const q = useFetch(() => api.goal(id), [id]);

  const reactivate = async (g) => {
    try { await api.setGoalStatus(g.id, true); toast('Target diaktifkan kembali.'); q.reload(); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <Load q={q}>
      {(g) => {
        const p = goalPlan(g);
        const deposits = g.deposits.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        return (
          <>
            <PageHead title={g.name} subtitle={`${p.months ? `Target ${p.endLabel}` : 'Target fleksibel'} · Dibuat untuk langkah besarmu berikutnya.`}>
              <BackLink onClick={() => nav('goals')}>Kembali ke Target</BackLink>
              <Button variant="outline" onClick={() => nav('goal-edit', g.id)}>Edit Target</Button>
              {g.active && <Button icon="plus" onClick={() => nav('goal-deposit', g.id)}>Setor Tabungan</Button>}
            </PageHead>

            <div className="stack">
              <div className="grid g-goal-detail">
                <div className="card dark goal-card">
                  <div className="head"><span className="eyebrow">Terkumpul</span><Badge tone="dark">{g.active ? 'Aktif' : 'Nonaktif'}</Badge></div>
                  <div className="amount" style={{ fontSize: 32 }}>{rupiah(g.saved)}</div>
                  <div className="sub">dari {rupiah(g.target)}</div>
                  <Progress dark tone="lime" value={p.percent} />
                  <div className="meta"><span>{Math.round(p.percent)}% tercapai</span><span>Sisa {rupiah(p.remaining)}</span></div>
                </div>
                <div className="card">
                  <div className="muted">Kebutuhan per bulan</div>
                  <div className="stat-lg green" style={{ fontSize: 28, margin: '18px 0 8px' }}>{p.months ? rupiah(p.perMonth) : '—'}</div>
                  <div className="muted">{p.months ? `${p.months} bulan menuju ${p.endLabel}` : 'Tanpa batas waktu'}</div>
                  <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0 14px' }} />
                  <div className="mini-note">Sisa target + waktu tersisa</div>
                </div>
              </div>

              <div className="card">
                <h2>Riwayat Setoran</h2>
                <div className="sub" style={{ marginTop: 4 }}>Semua setoran tersimpan di sini</div>
                {deposits.length === 0 ? (
                  <p className="muted" style={{ padding: '28px 0 6px' }}>Belum ada setoran. Mulai dengan setoran pertamamu.</p>
                ) : (
                  <div className="table">
                    <div className="t-head cols-dep"><span>Setoran</span><span>Tanggal</span><span className="amt">Nominal</span></div>
                    {deposits.map((d) => (
                      <div className="t-row cols-dep" key={d.id}>
                        <div><strong>{d.title || `Setoran ${monthName(d.date)}`}</strong><small>{d.note || 'Tabungan rutin'}</small></div>
                        <div className="muted">{fmtDate(d.date)}</div>
                        <div className="amt pos">+{rupiah(d.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="detail-bottom">
                <div><strong>{g.active ? 'Ingin berhenti sementara?' : 'Target ini sedang nonaktif'}</strong><span>Riwayat setoranmu akan tetap tersimpan.</span></div>
                {g.active
                  ? <Button variant="outline" onClick={() => nav('goal-deactivate', g.id)}>Nonaktifkan Target</Button>
                  : <Button onClick={() => reactivate(g)}>Aktifkan Kembali</Button>}
              </div>
            </div>
          </>
        );
      }}
    </Load>
  );
}

/* =====================  TAMBAH / EDIT TARGET  ===================== */
export function GoalFormScreen({ id, mode }) {
  const q = useFetch(() => (mode === 'edit' ? api.goal(id) : Promise.resolve(null)), [id, mode]);
  if (mode !== 'edit') return <GoalForm goal={null} />;
  return <Load q={q}>{(g) => <GoalForm goal={g} />}</Load>;
}

function GoalForm({ goal }) {
  const { nav, toast } = useStore();
  const editing = Boolean(goal);
  const initialMonths = goal ? goalPlan(goal).months : 8;
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal?.target ?? 0);
  const [initial, setInitial] = useState(goal?.saved ?? 0);
  const [months, setMonths] = useState(String(initialMonths));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const m = Number(months);
  const remaining = Math.max(0, target - initial);
  const perMonth = m ? Math.ceil(remaining / m) : 0;
  const options = [
    { value: '0', label: 'Fleksibel' },
    ...[...new Set([...MONTH_OPTIONS, m].filter(Boolean))].sort((a, b) => a - b).map((n) => ({ value: String(n), label: `${n} bulan` })),
  ];

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Nama target wajib diisi.');
    if (!target) return setError('Nominal target harus lebih dari 0.');
    if (initial > target) return setError('Tabungan awal tidak boleh melebihi nominal target.');
    setError('');
    setSaving(true);
    const body = { name: name.trim(), targetAmount: target, months: m || null, deadline: m ? addMonthsISO(m) : null };
    try {
      if (editing) {
        await api.updateGoal(goal.id, body);
        toast('Perubahan target disimpan.');
        nav('goal-detail', goal.id);
      } else {
        await api.createGoal({ ...body, initialAmount: initial });
        toast('Target baru ditambahkan.');
        nav('goals');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const back = () => (editing ? nav('goal-detail', goal.id) : nav('goals'));

  return (
    <>
      <PageHead title={editing ? 'Edit Target' : 'Tambah Target Baru'}
        subtitle={editing ? 'Sesuaikan rencana tanpa kehilangan progres tabunganmu.' : 'Tentukan tujuan, kami bantu hitung kebutuhan tabunganmu.'}>
        <BackLink onClick={() => nav('goals')}>Kembali ke Target</BackLink>
      </PageHead>
      <div className="grid g-form">
        <form className="card" onSubmit={submit} noValidate>
          <h2 style={{ marginBottom: 22 }}>{editing ? `Rincian ${goal.name}` : 'Tujuan baru, semangat baru'}</h2>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Field label="Nama target"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Laptop Baru" /></Field>
          <Field label="Nominal target"><MoneyInput value={target} onChange={setTarget} /></Field>
          {editing ? (
            <Field label="Sudah terkumpul (dari setoran)"><MoneyInput value={initial} onChange={() => {}} disabled /></Field>
          ) : (
            <Field label="Tabungan awal"><MoneyInput value={initial} onChange={setInitial} /></Field>
          )}
          <div className="form-grid">
            <Field label="Tercapai dalam (bulan)"><Select value={months} onChange={setMonths} options={options} /></Field>
            <Field label="Perkiraan target selesai"><Input value={m ? monthYear(addMonthsISO(m)) : 'Fleksibel'} readOnly tabIndex={-1} /></Field>
          </div>
          <div className="field-hint" style={{ marginTop: -6 }}>
            {editing ? 'Setoran tetap tercatat meskipun nominal atau waktu target diubah.' : 'Sudah punya tabungan? Masukkan sebagai saldo awal target ini.'}
          </div>
          <div className="form-actions">
            <Button type="submit" className="lg" loading={saving}>{editing ? 'Simpan Perubahan' : 'Simpan Target'}</Button>
            <Button type="button" variant="outline" className="lg" onClick={back}>Batal</Button>
          </div>
        </form>

        <div className="stack">
          <div className="card dark">
            <div className="eyebrow">Kamu perlu menabung</div>
            <div className="big lime" style={{ margin: '16px 0 4px' }}>{m ? rupiah(perMonth) : '—'}</div>
            <div className="sub">{m ? 'per bulan' : 'target fleksibel'}</div>
            <hr className="rule" style={{ margin: '22px 0 10px' }} />
            <div className="kv"><span>Target</span><b>{rupiah(target)}</b></div>
            <div className="kv"><span>Tabungan saat ini</span><b>{rupiah(initial)}</b></div>
            <div className="kv"><span>Sisa target</span><b>{rupiah(remaining)}</b></div>
            <div className="kv"><span>Waktu tersisa</span><b>{m ? `${m} bulan` : 'Fleksibel'}</b></div>
          </div>
          <div className="card mint info-card">
            <h3>Rencana yang realistis.</h3>
            <p>(Nominal target &minus; tabungan saat ini) &divide; jumlah bulan menuju target.</p>
            <p>Kamu dapat mengubah rencana kapan saja.</p>
            {editing && goal.active && <button type="button" className="link red" onClick={() => nav('goal-deactivate', goal.id)}>Nonaktifkan Target <Icon name="right" size={13} /></button>}
          </div>
        </div>
      </div>
    </>
  );
}

/* =====================  SETOR TABUNGAN  ===================== */
export function GoalDepositScreen({ id }) {
  const q = useFetch(() => api.goal(id), [id]);
  return <Load q={q}>{(g) => <DepositForm goal={g} />}</Load>;
}

function DepositForm({ goal }) {
  const { nav, toast } = useStore();
  const plan = goalPlan(goal);
  const [amount, setAmount] = useState(plan.perMonth || 0);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState(`Tabungan rutin ${monthName(todayISO())}`);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const quick = [...new Set([100000, 500000, plan.perMonth].filter(Boolean))].sort((a, b) => a - b);
  const after = goal.saved + amount;
  const afterPct = Math.min(100, pct(after, goal.target));

  const submit = async (e) => {
    e.preventDefault();
    if (!amount) return setError('Nominal setoran harus lebih dari 0.');
    if (!date) return setError('Tanggal setoran wajib diisi.');
    setError('');
    setSaving(true);
    try {
      await api.deposit(goal.id, { amount, date, note: note.trim() });
      toast(`Setoran ${rupiah(amount)} berhasil disimpan.`);
      nav('goal-detail', goal.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead title="Setor Tabungan" subtitle={`Tambah satu langkah untuk mewujudkan ${goal.name}.`}>
        <BackLink onClick={() => nav('goal-detail', goal.id)}>Kembali ke Detail Target</BackLink>
      </PageHead>
      <div className="grid g-form">
        <form className="card" onSubmit={submit} noValidate>
          <Badge className="" >{goal.name} · {plan.months ? `Target ${plan.endLabel}` : 'Target Fleksibel'}</Badge>
          <div style={{ height: 22 }} />
          {error && <div className="form-error" role="alert">{error}</div>}
          <Field label="Nominal setoran"><MoneyInput value={amount} onChange={setAmount} /></Field>
          {quick.length > 0 && (
            <div className="quick" style={{ gridTemplateColumns: `repeat(${quick.length}, 1fr)` }}>
              {quick.map((v) => <button type="button" key={v} className={amount === v ? 'on' : ''} onClick={() => setAmount(v)}>{rupiah(v)}</button>)}
            </div>
          )}
          <Field label="Tanggal setoran"><Input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Catatan (opsional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="form-actions">
            <Button type="submit" className="lg" loading={saving}>Simpan Setoran</Button>
            <Button type="button" variant="outline" className="lg" onClick={() => nav('goal-detail', goal.id)}>Batal</Button>
          </div>
        </form>

        <div className="stack">
          <div className="card dark">
            <div className="eyebrow">Setelah setoran ini</div>
            <div className="big" style={{ margin: '16px 0 4px' }}>{rupiah(after)}</div>
            <div className="sub">dari {rupiah(goal.target)}</div>
            <div style={{ margin: '18px 0 12px' }}><Progress dark tone="lime" value={afterPct} /></div>
            <div className="lime" style={{ fontWeight: 600 }}>{afterPct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}% tercapai</div>
            <hr className="rule" style={{ margin: '18px 0 8px' }} />
            <div className="kv"><span>Sebelumnya</span><b>{rupiah(goal.saved)}</b></div>
            <div className="kv"><span>Setoran baru</span><b>+{rupiah(amount)}</b></div>
            <div className="kv"><span>Sisa target</span><b>{rupiah(Math.max(0, goal.target - after))}</b></div>
          </div>
          <div className="card mint info-card">
            <h3>Konsisten, bukan terburu-buru.</h3>
            <p>Setoran ini akan masuk ke riwayat {goal.name} dan memperbarui progres target.</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* =====================  NONAKTIFKAN TARGET  ===================== */
export function GoalDeactivateScreen({ id }) {
  const q = useFetch(() => api.goal(id), [id]);
  return <Load q={q}>{(g) => <DeactivateCard goal={g} />}</Load>;
}

function DeactivateCard({ goal }) {
  const { nav, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    try {
      await api.setGoalStatus(goal.id, false);
      toast(`Target ${goal.name} dinonaktifkan.`);
      nav('goals');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Pengaturan Target" subtitle="Kelola tujuan sesuai prioritasmu saat ini." />
      <div className="card center-card" style={{ maxWidth: 520 }}>
        <div className="big-icon red"><Icon name="pause" size={26} stroke={3} /></div>
        <h2>Nonaktifkan target ini?</h2>
        <p className="lead" style={{ margin: '0 auto 24px' }}>{goal.name}</p>
        <div className="check-list">
          <strong>Tabunganmu tetap aman.</strong>
          <ul>
            <li>Saldo {rupiah(goal.saved)} dan riwayat setoran tidak dihapus.</li>
            <li>Pengingat menabung untuk target ini dihentikan.</li>
            <li>Target bisa diaktifkan kembali dari daftar nonaktif.</li>
          </ul>
        </div>
        <p className="mini-note" style={{ textAlign: 'left', margin: '18px 0' }}>Target tidak lagi dihitung sebagai target aktif.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="btns">
          <Button variant="outline" className="lg" onClick={() => nav('goal-detail', goal.id)}>Batal, Tetap Aktif</Button>
          <Button variant="danger" className="lg" loading={busy} onClick={confirm}>Nonaktifkan Target</Button>
        </div>
        <div className="foot">Menonaktifkan target tidak menarik saldo tabungan.</div>
      </div>
    </>
  );
}
