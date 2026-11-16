// Mock layanan OCR / AI Vision.
// TODO(ai-service): ganti isi fungsi ini dengan request ke layanan di folder ocr/ai-service,
// mis. POST multipart (file struk) -> { store, date, category, accuracy, items, total }.

export function scanReceipt({ file, fail = false } = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) return reject(new Error('UNREADABLE'))
      const items = [
        { name: 'Susu UHT 1L', price: 18000 },
        { name: 'Roti Tawar', price: 16500 },
        { name: 'Mie Instan x5', price: 17500 },
      ]
      resolve({
        store: 'Indomaret Kaliurang',
        date: new Date().toISOString(),
        category: 'Makanan',
        accuracy: 96,
        items,
        total: items.reduce((s, i) => s + i.price, 0),
        fileName: file?.name ?? null,
      })
    }, 2400)
  })
}
