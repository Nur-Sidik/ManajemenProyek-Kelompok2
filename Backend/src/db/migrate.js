import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { config } from '../config.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(here, '..', '..', '..', 'Database', 'schema_mysql.sql')

const sql = fs.readFileSync(schemaPath, 'utf8')
const conn = await mysql.createConnection({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  multipleStatements: true,
})

await conn.query(sql)
console.log('Skema MySQL savesmart_ai berhasil dimigrasi.')
await conn.end()