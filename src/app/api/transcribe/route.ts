import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    // Convert audio to base64
    const arrayBuffer = await audio.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')

    // Use OpenRouter chat/completions with multimodal audio input
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe este audio en español. Solo devuelve el texto transcrito, sin explicaciones, sin comillas, sin formato adicional.',
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: base64Audio,
                  format: 'webm',
                },
              },
            ],
          },
        ],
      }),
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
    const text = data.choices?.[0]?.message?.content?.trim() ?? ''

    if (!text) {
      return NextResponse.json(
        { error: 'No se pudo transcribir el audio' },
        { status: 500 }
      )
    }

    return NextResponse.json({ text })
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar audio' },
      { status: 500 }
    )
  }
}
