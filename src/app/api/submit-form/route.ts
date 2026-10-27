import { NextRequest, NextResponse } from 'next/server'

const GAS_URL =
  'https://script.google.com/macros/s/AKfycby663b4RX_4AR-441lXRLhBG0r2ed8B5NzoWKF2lS1b7umjTpr6Csfs86r7O7rMSWLI/exec'

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData()
    const out = new FormData()

    const photoFiles: File[] = []
    for (const [key, value] of incoming.entries()) {
      if (key === 'scrap_photo' && value instanceof File && value.size > 0) {
        photoFiles.push(value)
        continue
      }
      if (value instanceof File) continue
      out.append(key, value)
    }

    out.append('scrap_photo_count', String(photoFiles.length))

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i]
      const buffer = Buffer.from(await file.arrayBuffer())
      out.append(`scrap_photo_${i + 1}_name`, file.name || `scrap-${i + 1}.jpg`)
      out.append(`scrap_photo_${i + 1}_mime`, file.type || 'image/jpeg')
      out.append(`scrap_photo_${i + 1}_base64`, buffer.toString('base64'))
      out.append('scrap_photo', file, file.name || `scrap-${i + 1}.jpg`)
    }

    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      body: out,
    })

    if (!gasRes.ok) {
      return NextResponse.json(
        { ok: false, error: 'Upstream form handler failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('submit-form error:', error)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
