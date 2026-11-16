import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { seed } from './data.js'

const KEY = 'savesmart.state.v1'
const Ctx = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const shortDate = (d, opts) => d.toLocaleDateString('id-ID', opts)

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => load() ?? seed())
  const [scanResult, setScanResult] = useState(null) // hasil scan sementara, tidak disimpan

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* abaikan */
    }
  }, [state])

  // --- Auth (dummy). TODO(backend): ganti dengan endpoint login/register ---
  const login = useCallback((email, name) => {
    setState((s) => ({ ...s, user: { name: name || s.user?.name || 'Abdullah Duwi Putro', email } }))
  }, [])
  const logout = useCallback(() => setState((s) => ({ ...s, user: null })), [])
  const resetDemo = useCallback(() => setState((s) => ({ ...seed(), user: s.user })), [])

  // --- Transaksi ---
  const addTransaction = useCallback(({ title, category, amount }) => {
    const tx = { id: Date.now(), title, category, amount: -Math.abs(amount), when: 'Hari ini' }
    setState((s) => ({
      ...s,
      transactions: [tx, ...s.transactions],
      summary: {
        ...s.summary,
        expense: s.summary.expense + Math.abs(amount),
        balance: s.summary.balance - Math.abs(amount),
      },
      budgets: s.budgets.map((b) => (b.category === category ? { ...b, spent: b.spent + Math.abs(amount) } : b)),
      notifications: [
        {
          id: Date.now() + 1, kind: 'receipt', letter: 'S', read: false, to: '/report',
          title: `Struk ${title.split(' ')[0]} tersimpan`,
          body: `Rp ${Math.abs(amount).toLocaleString('id-ID')} - kategori ${category}`,
        },
        ...s.notifications,
      ],
    }))
    return tx
  }, [])

  // --- Anggaran ---
  const saveBudget = useCallback(({ category, limit, alertAt }) => {
    setState((s) => {
      const exists = s.budgets.some((b) => b.category === category)
      const budgets = exists
        ? s.budgets.map((b) => (b.category === category ? { ...b, limit, alertAt } : b))
        : [...s.budgets, { category, spent: 0, limit, alertAt }]
      return { ...s, budgets }
    })
  }, [])

  // --- Target tabungan ---
  const addGoal = useCallback(({ name, target, months }) => {
    const due = new Date()
    due.setMonth(due.getMonth() + months)
    const id = Date.now()
    setState((s) => ({
      ...s,
      goals: [
        ...s.goals,
        { id, name, target, saved: 0, monthsLeft: months, deadline: shortDate(due, { month: 'long', year: 'numeric' }), deposits: [] },
      ],
    }))
    return id
  }, [])

  const deposit = useCallback((goalId, amount) => {
    const now = new Date()
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              saved: g.saved + amount,
              deposits: [
                { id: Date.now(), title: `Setoran ${shortDate(now, { month: 'long' })}`, when: shortDate(now, { day: 'numeric', month: 'short' }), amount },
                ...g.deposits,
              ],
            }
          : g,
      ),
    }))
  }, [])

  // --- Notifikasi ---
  const markRead = useCallback((id) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
  }, [])

  const unreadCount = state.notifications.filter((n) => !n.read).length

  const value = useMemo(
    () => ({ state, unreadCount, scanResult, setScanResult, login, logout, resetDemo, addTransaction, saveBudget, addGoal, deposit, markRead }),
    [state, unreadCount, scanResult, login, logout, resetDemo, addTransaction, saveBudget, addGoal, deposit, markRead],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
