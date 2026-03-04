import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    // Send to OpenRouter's OpenAI-compatible Whisper endpoint
    const whisperForm = new FormData()
    whisperForm.append('file', audio, 'audio.webm')
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'es')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: whisperForm,
    })

    if (!response.ok) {
      // Fallback: try OpenRouter endpoint
      const orForm = new FormData()
      orForm.append('file', audio, 'audio.webm')
      orForm.append('model', 'openai/whisper-1')
      orForm.append('language', 'es')

      const orResponse = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: orForm,
      })

      if (!orResponse.ok) {
        return NextResponse.json(
          { error: 'Error al transcribir audio' },
          { status: 500 }
        )
      }

      const orData = await orResponse.json()
      return NextResponse.json({ text: orData.text })
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
