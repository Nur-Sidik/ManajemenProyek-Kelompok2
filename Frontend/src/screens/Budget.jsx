import { useState } from 'react';
import { api } from '../api.js';
import { useFetch, useStore } from '../store.jsx';
import {
  EXPENSE_CATEGORIES, THRESHOLDS, budgetStatus, daysLeftInMonth, monthKeyLabel, pct, pctLabel, rupiah, shiftMonth,
} from '../format.js';
import { BackLink, Badge, Button, Empty, Field, Icon, Load, Modal, MoneyInput, PageHead, Progress, Select } from '../ui.jsx';

const toneBar = { green: 'green', amber: 'amber', red: 'red' };

/* =====================  ANGGARAN BULANAN  ===================== */
export function BudgetScreen() {
  const { nav, month, setMonth, toast } = useStore();
  const q = useFetch(() => api.budgets(month), [month]);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmRemove = async () => {
    setBusy(true);
    try {
      await api.deleteBudget(removing.id);
      toast(`Anggaran ${removing.category} dihapus.`);
      setRemoving(null);
      q.reload();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Anggaran Bulanan" subtitle="Beri batas yang sehat untuk setiap kebutuhanmu.">
        <div className="month-nav">
          <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya"><Icon name="chevL" size={14} /></button>
          <span>{monthKeyLabel(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Bulan berikutnya"><Icon name="chevR" size={14} /></button>
        </div>
        <Button icon="plus" onClick={() => nav('budget-edit')}>Atur Anggaran</Button>
      </PageHead>

      <Load q={q}>
        {(budgets) => {
          if (budgets.length === 0) {
            return (
              <Empty title="Belum ada anggaran bulan ini">
                Tentukan batas pengeluaran per kategori agar kamu mendapat peringatan sebelum uangmu habis.
                <Button style={{ marginTop: 8 }} onClick={() => nav('budget-edit')}>Atur Anggaran</Button>
              </Empty>
            );
          }
          const spent = budgets.reduce((s, b) => s + b.spent, 0);
          const limit = budgets.reduce((s, b) => s + b.limit, 0);
          const p = pct(spent, limit);
          const days = daysLeftInMonth(month);
          const thresholds = [...new Set(budgets.map((b) => b.threshold))].sort();
          return (
            <div className="stack">
              <div className="card dark budget-total">
                <div>
                  <div className="eyebrow">Total terpakai</div>
                  <div className="nums"><strong>{rupiah(spent)}</strong><span className="sub">/ {rupiah(limit)}</span></div>
                  <Progress dark value={p} tone="lime" />
                </div>
                <div className="right">
                  <strong>{pctLabel(p)} terpakai</strong>
                  <span className="sub">{limit >= spent ? `Sisa ${rupiah(limit - spent)}` : `Melebihi ${rupiah(spent - limit)}`} · {days} hari lagi</span>
                </div>
              </div>

              <div className="grid g-2">
                {budgets.map((b) => {
                  const bp = pct(b.spent, b.limit);
                  const st = budgetStatus(bp, b.threshold);
                  return (
                    <div className="card budget-card" key={b.id ?? b.category}>
                      <div className="head"><h3>{b.category}</h3><Badge tone={st.tone}>{st.label}</Badge></div>
                      <div className="nums"><strong>{rupiah(b.spent)}</strong><span className="sub">/ {rupiah(b.limit)}</span></div>
                      <Progress value={bp} tone={toneBar[st.tone]} />
                      <div className={`pct ${st.tone}`}>{pctLabel(bp)} terpakai</div>
                      <div className="foot">
                        <span>{b.limit >= b.spent ? `Sisa ${rupiah(b.limit - b.spent)}` : `Melebihi batas ${rupiah(b.spent - b.limit)}`}</span>
                        <button className="link" onClick={() => nav('budget-edit', b.category)}>Edit</button>
                        <button className="link red" onClick={() => setRemoving(b)}>Hapus</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mini-note">
                Peringatan aktif pada {thresholds.map((t) => `${t}%`).join(' / ')} pemakaian dan saat anggaran terlampaui.
              </div>
            </div>
          );
        }}
      </Load>

      {removing && (
        <Modal title="Hapus anggaran?" onClose={() => setRemoving(null)}
          actions={<>
            <Button variant="outline" onClick={() => setRemoving(null)}>Batal</Button>
            <Button variant="danger" loading={busy} onClick={confirmRemove}>Hapus</Button>
          </>}>
          Anggaran <b>{removing.category}</b> akan dihapus. Transaksi yang sudah tercatat tidak ikut terhapus.
        </Modal>
      )}
    </>
  );
}

/* =====================  EDIT / ATUR ANGGARAN  ===================== */
export function BudgetEditScreen({ id }) {
  const { month } = useStore();
  const q = useFetch(() => api.budgets(month), [month]);
  return <Load q={q}>{(budgets) => <BudgetForm budgets={budgets} category={id} />}</Load>;
}

function BudgetForm({ budgets, category }) {
  const { nav, month, toast } = useStore();
  const existing = budgets.find((b) => b.category === category);
  const available = EXPENSE_CATEGORIES.filter((c) => !budgets.some((b) => b.category === c));
  const options = existing ? [existing.category] : available;

  const [cat, setCat] = useState(existing?.category ?? options[0] ?? '');
  const [limit, setLimit] = useState(existing?.limit ?? 0);
  const [threshold, setThreshold] = useState(existing?.threshold ?? 80);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const spent = existing?.spent ?? 0;
  const p = pct(spent, limit || existing?.limit);
  const st = budgetStatus(p, threshold);

  const save = async (e) => {
    e.preventDefault();
    if (!cat) return setError('Semua kategori sudah memiliki anggaran.');
    if (!limit) return setError('Batas anggaran harus lebih dari 0.');
    setError('');
    setSaving(true);
    try {
      if (existing) await api.updateBudget(existing.id, { limit, threshold });
      else await api.createBudget({ category: cat, limit, threshold, month });
      toast('Anggaran disimpan.');
      nav('budget');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.deleteBudget(existing.id);
      toast(`Anggaran ${existing.category} dihapus.`);
      nav('budget');
    } catch (err) {
      setConfirmDel(false);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead title="Atur Anggaran" subtitle={`Tentukan batas pengeluaran per kategori untuk ${monthKeyLabel(month)}.`}>
        <BackLink onClick={() => nav('budget')}>Kembali ke Anggaran</BackLink>
      </PageHead>
      <div className="grid g-form">
        <form className="card" onSubmit={save} noValidate>
          <h2 style={{ marginBottom: 22 }}>{existing ? 'Edit anggaran kategori' : 'Tambah anggaran kategori'}</h2>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Field label="Kategori">
            <Select value={cat} onChange={setCat} options={options.length ? options : ['—']} disabled={Boolean(existing) || options.length === 0} />
          </Field>
          <Field label="Batas anggaran bulanan"><MoneyInput value={limit} onChange={setLimit} /></Field>
          <div className="field">
            <span className="field-label" style={{ marginTop: 4 }}>Kirim peringatan saat terpakai</span>
            <div className="radio-cards" role="radiogroup" aria-label="Ambang peringatan">
              {THRESHOLDS.map((t) => (
                <button type="button" key={t} role="radio" aria-checked={threshold === t}
                  className={`radio-card ${threshold === t ? 'on' : ''}`} onClick={() => setThreshold(t)}>
                  <i />{t}%
                </button>
              ))}
            </div>
            <span className="field-hint">Notifikasi dikirim juga saat anggaran terlampaui.</span>
          </div>
          <div className="form-actions">
            <Button type="submit" className="lg" loading={saving}>Simpan Anggaran</Button>
            <Button type="button" variant="outline" className="lg" onClick={() => nav('budget')}>Batal</Button>
          </div>
          {existing && <button type="button" className="link red" style={{ marginTop: 18 }} onClick={() => setConfirmDel(true)}>Hapus anggaran kategori ini</button>}
        </form>

        <div className="stack">
          <div className="card">
            <h2 style={{ marginBottom: 14 }}>Kondisi saat ini</h2>
            {existing || cat ? (
              <>
                <Badge tone={st.tone}>{cat} · {pctLabel(p)} terpakai</Badge>
                <div className="big" style={{ margin: '16px 0 12px' }}>{rupiah(spent)}</div>
                <Progress value={p} tone={toneBar[st.tone]} />
                <div className="sub" style={{ marginTop: 16 }}>{limit >= spent ? 'Sisa yang dapat digunakan' : 'Melebihi batas'}</div>
                <div className="stat-lg green" style={{ fontSize: 20, marginTop: 4, color: limit >= spent ? undefined : 'var(--red)' }}>{rupiah(Math.abs(limit - spent))}</div>
              </>
            ) : <p className="muted">Pilih kategori untuk melihat kondisinya.</p>}
          </div>
          <div className="card mint info-card">
            <h3>Kamu tetap memegang kendali.</h3>
            <p>Pilih ambang peringatan yang paling sesuai dengan kebiasaan belanjamu.</p>
            <p>Mengubah batas anggaran tidak akan menghapus transaksi yang sudah tercatat.</p>
          </div>
        </div>
      </div>

      {confirmDel && (
        <Modal title="Hapus anggaran?" onClose={() => setConfirmDel(false)}
          actions={<>
            <Button variant="outline" onClick={() => setConfirmDel(false)}>Batal</Button>
            <Button variant="danger" loading={saving} onClick={remove}>Hapus</Button>
          </>}>
          Anggaran <b>{existing.category}</b> akan dihapus. Transaksi yang sudah tercatat tidak ikut terhapus.
        </Modal>
      )}
    </>
  );
}
