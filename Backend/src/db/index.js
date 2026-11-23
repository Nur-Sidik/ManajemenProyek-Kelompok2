import mysql from 'mysql2/promise'
import { config } from '../config.js'

let pool

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    })
  }
  return pool
}

export async function query(sql, params = []) {
  const [rows] = await getDb().execute(sql, params)
  return rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] ?? null
}

export async function withTransaction(fn) {
  const conn = await getDb().getConnection()
  await conn.beginTransaction()
  try {
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function closeDb() {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}