import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { classificationSchema, type Classification } from '../schemas/shoutout-schema'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const FALLBACK: Classification = {
  category: 'otro',
  emoji: '📢',
  summary: '',
}

export async function classifyShoutout(text: string): Promise<Classification> {
  try {
    const { object } = await generateObject({
      model: openrouter('anthropic/claude-haiku-4-5-20251001'),
      schema: classificationSchema,
      prompt: `Eres un clasificador de shoutouts para una comunidad hiperlocal en Cancun, Mexico.

Clasifica el siguiente texto en UNA categoria con un emoji representativo y un resumen de 1 linea en español.

Categorias disponibles:
- trafico: accidentes, congestion, obras, cierres viales
- clima: lluvia, calor extremo, huracanes, inundaciones
- oferta: descuentos, promociones, ventas especiales
- alerta: seguridad, emergencias, cortes de luz/agua
- tip: recomendaciones, consejos, lugares nuevos
- comida: restaurantes, puestos, comida callejera
- evento: fiestas, conciertos, eventos culturales
- otro: cualquier cosa que no encaje

Texto: "${text}"

Responde con la categoria, un emoji representativo y un resumen corto en español.`,
    })

    return object
  } catch {
    return {
      ...FALLBACK,
      summary: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
    }
  }
}
