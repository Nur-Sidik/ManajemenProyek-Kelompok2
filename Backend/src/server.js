import { config } from './config.js'
import { createApp } from './app.js'
import { getDb } from './db/index.js'

const app = createApp()

try {
  await getDb().query('SELECT 1')
  console.log(`Terhubung ke MySQL (${config.db.database} @ ${config.db.host}:${config.db.port})`)
} catch (err) {
  console.error('Gagal terhubung ke MySQL Laragon:', err.message)
  process.exit(1)
}

app.listen(config.port, () => {
  console.log(`SaveSmart AI backend berjalan di http://localhost:${config.port}`)
  console.log(`OCR: ${config.ocrMode === 'service' ? config.ocrUrl : 'mode mock (hasil contoh)'}`)
})