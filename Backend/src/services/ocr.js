import sharp from 'sharp'
import { CATEGORIES, config } from '../config.js'
import { HttpError } from '../http.js'
import { today } from '../util.js'

const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.5-pro',
]

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function extractJSON(content) {
  if (!content) return null

  const cleaned = content
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start === -1 || end <= start) return null

  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function scanReceipt({ file, simulateFail = false }) {

  // 1. Validasi file
  if (!file) {
    throw new HttpError(
      400,
      'NO_FILE',
      'Foto struk wajib diunggah.'
    )
  }

  if (simulateFail) {
    throw new HttpError(
      422,
      'OCR_FAILED',
      'Struk tidak terbaca, coba foto ulang dengan cahaya lebih terang.'
    )
  }

  // 2. Validasi mode OCR
  if (config.ocrMode !== 'service') {
    throw new HttpError(
      500,
      'OCR_MODE_DISABLED',
      'OCR_MODE harus diatur ke service untuk menggunakan Gemini.'
    )
  }

  const apiKey = String(config.aiApiKey || '').trim()

  if (!apiKey) {
    throw new HttpError(
      500,
      'OCR_CONFIG_ERROR',
      'GEMINI_API_KEY belum diatur di server.'
    )
  }

  // 3. Optimasi gambar
  let compressedBuffer

  try {
    compressedBuffer = await sharp(file.buffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer()

  } catch (err) {
    console.error('Gagal memproses gambar:', err.message)

    throw new HttpError(
      422,
      'IMAGE_PROCESS_ERROR',
      'Foto tidak dapat diproses. Gunakan JPG, PNG, atau WebP.'
    )
  }

  const base64Image = compressedBuffer.toString('base64')

  // 4. Prompt OCR
  const prompt = `
Kamu adalah sistem OCR profesional untuk aplikasi keuangan Indonesia.

Baca gambar struk dengan teliti.

Ambil informasi berikut:

1. title: Nama toko atau merchant.
2. amount: TOTAL AKHIR yang harus dibayar pelanggan.
3. category: Kategori pengeluaran.
4. date: Tanggal transaksi dalam format YYYY-MM-DD.

Pilih kategori hanya dari daftar berikut:

${CATEGORIES.join(', ')}

ATURAN PENTING:

- Ambil TOTAL BAYAR atau GRAND TOTAL.
- Jangan mengambil subtotal jika terdapat total akhir.
- Jangan mengambil nominal kembalian.
- Jangan mengambil nominal pajak sebagai total transaksi.
- Amount harus berupa integer Rupiah tanpa titik atau koma.
- Jangan mengarang informasi yang tidak terlihat.
- Jika tanggal tidak terbaca, isi string kosong.
- Jika gambar bukan struk atau nominal tidak terbaca, amount harus 0.
- Jika merchant tidak terbaca, gunakan "Transaksi Struk".
- Pilih kategori berdasarkan barang atau jasa yang dibeli.
- Jangan memberikan penjelasan di luar JSON.
`

  // 5. Konfigurasi respons Gemini
  const generationConfig = {
    temperature: 0,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
        },
        amount: {
          type: 'INTEGER',
        },
        category: {
          type: 'STRING',
          enum: CATEGORIES,
        },
        date: {
          type: 'STRING',
        },
      },
      required: ['title', 'amount', 'category', 'date'],
    },
  }

  // 6. Daftar model Gemini
  const baseUrl = String(
    config.ocrUrl ||
    'https://generativelanguage.googleapis.com/v1beta/models'
  )
    .replace(/\/$/, '')
    .replace(/\/[^/]+:generateContent$/, '')

  const candidates = [
    ...new Set([
      ...config.geminiModels,
      ...FALLBACK_MODELS,
    ].filter(Boolean)),
  ]

  let parsed = null
  let lastError = ''

  // 7. Panggil API Gemini
  for (const modelName of candidates) {

    let modelSucceeded = false

    for (let attempt = 1; attempt <= 2; attempt++) {

      try {
        console.log(
          `OCR: coba model ${modelName}, percobaan ${attempt}/2`
        )

        const endpoint =
          `${baseUrl}/${encodeURIComponent(modelName)}:generateContent`

        const response = await fetch(endpoint, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },

          signal: AbortSignal.timeout(30000),

          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Image,
                    },
                  },
                ],
              },
            ],

            generationConfig,
          }),
        })

        if (!response.ok) {

          lastError = await response.text()

          console.error(
            `Gemini ${modelName} HTTP ${response.status}:`,
            lastError.slice(0, 1000)
          )

          if (
            response.status === 401 ||
            response.status === 403
          ) {
            throw new HttpError(
              502,
              'OCR_AUTH_ERROR',
              'API Key Gemini tidak valid atau tidak memiliki akses.'
            )
          }

          if (
            (response.status === 429 ||
              response.status === 503) &&
            attempt < 2
          ) {
            await sleep(1000 * attempt)
            continue
          }

          break
        }

        const data = await response.json()

        const candidate = data.candidates?.[0]

        if (!candidate) {
          lastError = 'Gemini tidak mengembalikan kandidat respons.'
          break
        }

        if (candidate.finishReason === 'MAX_TOKENS') {
          lastError = 'Respons Gemini terpotong karena batas token.'
          break
        }

        const rawContent = (
          candidate.content?.parts || []
        )
          .map((part) => part.text || '')
          .join('')
          .trim()

        console.log(`Respons OCR diterima dari ${modelName}`)

        parsed = extractJSON(rawContent)

        if (!parsed) {
          lastError = `JSON tidak valid: ${rawContent.slice(0, 500)}`
          console.error(lastError)
          break
        }

        modelSucceeded = true

        console.log(`OCR berhasil menggunakan ${modelName}`)

        break

      } catch (err) {

        if (err instanceof HttpError) {
          throw err
        }

        lastError = err.message

        console.warn(
          `Gemini ${modelName} gagal:`,
          lastError
        )

        if (attempt < 2) {
          await sleep(1000 * attempt)
        }
      }
    }

    if (modelSucceeded) break

    parsed = null

    console.warn(
      `Beralih ke model berikutnya setelah ${modelName} gagal.`
    )
  }

  // 8. Jika semua model gagal
  if (!parsed) {
    console.error('Seluruh model OCR gagal:', lastError)

    throw new HttpError(
      502,
      'OCR_PROVIDER_ERROR',
      'Layanan OCR sedang bermasalah. Silakan coba beberapa saat lagi atau input transaksi secara manual.'
    )
  }

  // 9. Validasi hasil OCR
  const amount = Number(parsed.amount)

  if (
    parsed.error === 'UNREADABLE' ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 100_000_000_000
  ) {
    throw new HttpError(
      422,
      'OCR_FAILED',
      'Total transaksi tidak berhasil dibaca. Pastikan foto struk fokus dan terang.'
    )
  }

  const title = String(
    parsed.title || 'Transaksi Struk'
  )
    .trim()
    .slice(0, 100)

  const validCategory = CATEGORIES.includes(parsed.category)
    ? parsed.category
    : 'Lainnya'

  const currentDate = today()

  const validDate =
    isValidISODate(parsed.date) &&
    parsed.date <= currentDate
      ? parsed.date
      : currentDate

  // 10. Hasil akhir
  console.log('HASIL OCR:', {
    title,
    amount,
    category: validCategory,
    date: validDate,
  })

  return {
    title,
    amount,
    category: validCategory,
    date: validDate,
    confidence: 0.9,
  }
}