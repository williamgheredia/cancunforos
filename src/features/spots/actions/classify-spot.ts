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

Clasifica el siguiente lugar en UNA categoria y elige el emoji MAS ESPECIFICO posible.

Categorias y emojis sugeridos:
- restaurante: 🍽️ restaurante, 🍕 pizzeria, 🍣 sushi, 🌮 tacos, ☕ cafe, 🍺 bar, 🍔 hamburguesas, 🍦 helados, 🥐 panaderia
- tienda: 🛒 super, 💊 farmacia, 👗 ropa, 📱 tecnologia, 🛍️ tienda, 🏪 abarrotes, 🐾 mascotas, 🔨 ferreteria
- servicio: 🔧 mecanico, ✂️ salon belleza, 👔 lavanderia, 🏨 hotel, 💈 barberia, 🧹 limpieza, 📦 paqueteria, ⛽ gasolinera
- entretenimiento: 🎬 cine, 🏖️ playa, 🌳 parque, 🪩 disco, 🎮 arcade, 💪 gym, 🏊 alberca, 🎭 teatro, 🎳 boliche
- salud: 🏥 hospital, 🦷 dentista, 👁️ optica, 🧠 psicologo, 💉 laboratorio, 🩺 clinica
- educacion: 🎓 universidad, 📚 escuela, 🎨 taller arte, 💻 coworking, 📖 libreria
- transporte: 🚌 parada bus, 🚕 taxi, 🚗 renta autos, ✈️ aeropuerto, ⛽ gasolinera
- otro: 📍 si no encaja en ninguna

IMPORTANTE: Elige el emoji que MEJOR represente el lugar especifico, no uno generico.

Nombre: "${name}"
Descripcion: "${description}"

Responde con la categoria y el emoji mas representativo.`,
    })

    return object
  } catch {
    return FALLBACK
  }
}
