import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    const whisperForm = new FormData()
    whisperForm.append('file', audio, 'audio.webm')
    whisperForm.append('model', 'openai/whisper-1')
    whisperForm.append('language', 'es')

    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: whisperForm,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Transcription failed:', response.status, errorText)
      return NextResponse.json(
        { error: 'Error al transcribir audio' },
        { status: 500 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ text: data.text })
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar audio' },
      { status: 500 }
    )
  }
}
