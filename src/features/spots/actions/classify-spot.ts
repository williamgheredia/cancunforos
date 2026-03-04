import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { spotClassificationSchema, type SpotClassification } from '../schemas/spot-schema'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const FALLBACK: SpotClassification = {
  category: 'otro',
  emoji: '📍',
}

export async function classifySpot(name: string, description: string): Promise<SpotClassification> {
  try {
    const { object } = await generateObject({
      model: openrouter('anthropic/claude-haiku-4-5-20251001'),
      schema: spotClassificationSchema,
      prompt: `Eres un clasificador de negocios/lugares para una comunidad hiperlocal en Cancun, Mexico.

Clasifica el siguiente lugar en UNA categoria con un emoji representativo.

Categorias disponibles:
- restaurante: restaurantes, cafeterias, bares, puestos de comida
- tienda: tiendas, supermercados, farmacias, comercios
- servicio: mecanicos, plomeros, salones de belleza, lavanderia
- entretenimiento: cines, parques, discotecas, playas, cenotes
- salud: hospitales, clinicas, consultorios, dentistas
- educacion: escuelas, universidades, cursos, talleres
- transporte: estaciones, paradas, rentas de autos
- otro: cualquier cosa que no encaje

Nombre: "${name}"
Descripcion: "${description}"

Responde con la categoria y un emoji representativo.`,
    })

    return object
  } catch {
    return FALLBACK
  }
}
