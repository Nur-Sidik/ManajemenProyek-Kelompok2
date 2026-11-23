import sharp from 'sharp'
import { CATEGORIES, config } from '../config.js'
import { HttpError } from '../http.js'
import { today } from '../util.js'

const MOCK_RESULT = {
  title: 'Indomaret Point',
  amount: 45500,
  category: 'Makanan',
  date: today(),
  confidence: 0.95,
  rawText: 'INDOMARET POINT - TOTAL RP 45.500',
}

export async function scanReceipt({ file, simulateFail = false }) {
  if (!file) {
    throw new HttpError(400, 'NO_FILE', 'Foto struk wajib diunggah.')
  }
  if (simulateFail) {
    throw new HttpError(422, 'OCR_FAILED', 'Struk tidak terbaca, coba foto ulang dengan cahaya lebih terang.')
  }

  if (config.ocrMode !== 'service') {
    return { ...MOCK_RESULT, date: today() }
  }

  const apiKey = String(config.geminiApiKey || '').trim()
  if (!apiKey) {
    throw new HttpError(500, 'OCR_CONFIG_ERROR', 'GEMINI_API_KEY belum diatur di server.')
  }

  // Perkecil resolusi foto struk agar payload Gemini tetap ringan.
  const compressedBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1024, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  const base64Image = compressedBuffer.toString('base64')
  const prompt = `Kamu adalah sistem ekstraksi struk belanja Indonesia. Analisis gambar struk ini dan kembalikan HANYA objek JSON valid tanpa markdown atau teks tambahan.
Format wajib:
{
  "title": "Nama toko atau merchant singkat",
  "amount": 50000,
  "category": "Pilih persis salah satu: ${CATEGORIES.join(', ')}",
  "date": "YYYY-MM-DD (jika tidak terbaca di struk, isi null)"
}
Aturan:
- "amount" wajib berupa angka bulat (integer) dalam Rupiah tanpa titik/koma (contoh: 45500).
- Jika gambar bukan struk belanja atau sama sekali tidak terbaca, kembalikan {"error": "UNREADABLE"}.`

  const modelNames = [...new Set(config.geminiModels)].filter(Boolean)
  let data = null
  let lastError = ''

  for (const modelName of modelNames) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`
    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      })
    } catch (err) {
      lastError = err.message
      console.warn(`Koneksi Gemini model ${modelName} gagal; mencoba model berikutnya.`)
      continue
    }

    if (response.ok) {
      data = await response.json()
      console.log(`OCR Gemini berhasil diproses dengan model: ${modelName}`)
      break
    }

    lastError = `HTTP ${response.status}: ${await response.text()}`
    if (response.status === 401 || response.status === 403) {
      console.error(`Gemini menolak autentikasi (${response.status}).`)
      throw new HttpError(502, 'OCR_AUTH_ERROR', 'API key Gemini tidak valid atau tidak memiliki akses. Periksa GEMINI_API_KEY.')
    }

    // Rate limit, kapasitas penuh, atau model ID tidak tersedia: lanjut ke model berikutnya.
    if ([404, 429, 500, 502, 503, 504].includes(response.status)) {
      console.warn(`Gemini model ${modelName} gagal (${response.status}); mencoba model berikutnya.`)
      continue
    }

    console.error(`Gemini menolak request (${response.status}):`, lastError)
    throw new HttpError(502, 'OCR_PROVIDER_ERROR', 'Gemini gagal memproses struk. Periksa konfigurasi request dan model.')
  }

  if (!data) {
    console.error('Semua model Gemini gagal:', lastError)
    throw new HttpError(502, 'OCR_PROVIDER_ERROR', 'Semua model Gemini sedang sibuk atau tidak tersedia.')
  }

  const rawContent = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || ''
  const cleanJson = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleanJson)
  } catch {
    console.error('Gagal parse JSON dari Gemini:', rawContent)
    throw new HttpError(422, 'OCR_PARSE_ERROR', 'Hasil pembacaan AI tidak valid, silakan input manual.')
  }

  if (parsed.error === 'UNREADABLE' || !parsed.amount || Number(parsed.amount) <= 0) {
    throw new HttpError(422, 'OCR_FAILED', 'Struk tidak terbaca dengan jelas, pastikan foto fokus dan terang.')
  }

  const validCategory = CATEGORIES.includes(parsed.category) ? parsed.category : 'Lainnya'
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) && parsed.date <= today() ? parsed.date : today()

  return {
    title: String(parsed.title || 'Transaksi Struk').slice(0, 100),
    amount: Math.round(Number(parsed.amount)),
    category: validCategory,
    date: validDate,
    confidence: 0.92,
  }
}
