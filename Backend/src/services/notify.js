import { query } from '../db/index.js'

// dedupeKey mencegah notifikasi yang sama dibuat dua kali (mis. anggaran yang sama di bulan yang sama).
export async function notify(userId, { kind, title, body, link, dedupeKey = null }) {
  const r = await query(
    'INSERT IGNORE INTO notifications (user_id, kind, title, body, link, dedupe_key) VALUES (?,?,?,?,?,?)',
    [userId, kind, title, body, link, dedupeKey]
  )
  return r.affectedRows > 0
}

export async function listNotifications(userId) {
  const rows = await query(
    'SELECT id, kind, title, body, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100',
    [userId]
  )
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    to: n.link,
    read: !!n.is_read,
    createdAt: n.created_at,
  }))
}