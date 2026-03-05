import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { Classification } from '../schemas/shoutout-schema'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const VALID_CATEGORIES = [
  'trafico', 'clima', 'oferta', 'seguridad', 'emergencia',
  'tip', 'comida', 'evento', 'fiesta', 'salud',
  'deporte', 'servicios', 'empleo', 'inmuebles', 'mascotas',
  'transporte', 'cultura', 'social', 'educacion', 'compraventa',
  'gobierno', 'tecnologia', 'naturaleza', 'comunidad', 'perdido',
  'denuncia', 'ninos', 'belleza', 'religion', 'humor',
  'playa', 'hotel', 'tour', 'cenote', 'arqueologia',
  'vuelo', 'snorkel', 'compras', 'fotografia', 'alojamiento',
  'cambio', 'wifi', 'isla', 'vida_nocturna', 'gastronomia',
  'aventura', 'moda', 'legal', 'jardineria', 'otro',
] as const

type Category = (typeof VALID_CATEGORIES)[number]

// ── Content moderation ──────────────────────────────────────────────

const BLOCKED_KEYWORDS = /\b(porno|pornograf[ií]a|xxx|onlyfans|nudes|desnud[oa]s|sexo\s*(oral|anal|grupal)|prostitu|escort|scort|putas?\b|nalgas|verga|pene\b|vagina|culo\b|cogerse|cog[eé]r\s*con|mamada|chingar|pinche\s*(puta|perra|pendej)|narco|narcotráfico|narcomenudeo|cristal\b|metanfetamina|coca[ií]na|heroina|hero[ií]na|fentanilo|crack\b|mota\b|marihuana\b|piedra\s*(droga|crack)|dealer|vendo\s*(mota|piedra|cristal|perico)|perico\b.*droga|muerte\s*(a|al|para)|matar|amenaza\s*de\s*muerte|voy\s*a\s*matar|bomba\b.*explotar|terroris|pedofil|menores?\s*(de\s*edad\s*)?(desnud|sexual)|child\s*porn|cp\b.*menores|lavado\s*de\s*dinero|trata\s*de\s*(personas|blancas)|arma\s*(ilegal|clandestina)|vendo\s*(arma|pistola|fusil))/i

/**
 * Quick keyword check for obviously blocked content.
 * Returns true if content should be blocked.
 */
function isBlockedByKeywords(text: string): boolean {
  return BLOCKED_KEYWORDS.test(text)
}

export interface ModerationResult {
  safe: boolean
  reason?: string
}

// ── Classification keywords ─────────────────────────────────────────

const KEYWORD_MAP: { keywords: RegExp; category: Category; emoji: string }[] = [
  { keywords: /accidente|choque|choqu|trafico|tráfico|transito|tránsito|semaforo|semáforo|bache|obra\s*vial|cierre\s*vial|congesti[oó]n|atropell/i, category: 'trafico', emoji: '🚗' },
  { keywords: /lluvia|calor|sol\b|hurac[aá]n|tormenta|inundaci[oó]n|norte\b|clima|nublado|granizo|viento\b/i, category: 'clima', emoji: '🌧️' },
  { keywords: /descuento|oferta|promo|barato|gratis|2x1|remate|rebaja|liquidaci[oó]n|cupon|cup[oó]n/i, category: 'oferta', emoji: '💰' },
  { keywords: /robo|asalto|balacera|insegur|peligro|secuestro|extorsi[oó]n|navaja|pistola|amenaza/i, category: 'seguridad', emoji: '🚨' },
  { keywords: /ambulancia|bombero|incendio|urgente|emergencia|apag[oó]n|explosi[oó]n|derrumbe|911/i, category: 'emergencia', emoji: '🆘' },
  { keywords: /consejo|recomendaci[oó]n|\btip\b|sugerencia|recomiendo|prueben|visiten|vayan/i, category: 'tip', emoji: '💡' },
  { keywords: /restaurante|tacos|mariscos|cocina|men[uú]|platillo|comer|cena|almuerzo|desayuno|antojitos|torta|pizza|sushi|birria|loncher[ií]a/i, category: 'comida', emoji: '🍽️' },
  { keywords: /concierto|festival|feria|expo|inauguraci[oó]n|celebraci[oó]n|carnaval|espect[aá]culo/i, category: 'evento', emoji: '🎉' },
  { keywords: /antro|bar\b|nightlife|dj\b|happy\s*hour|disco|club\s*nocturno|after/i, category: 'fiesta', emoji: '🎶' },
  { keywords: /hospital|farmacia|dengue|mosquito|doctor|m[eé]dico|cl[ií]nica|vacuna|enferm|salud|covid/i, category: 'salud', emoji: '🏥' },
  { keywords: /futbol|f[uú]tbol|partido|cancha|gym|gimnasio|surf|buceo|nataci[oó]n|torneo|deporte|correr|marat[oó]n/i, category: 'deporte', emoji: '⚽' },
  { keywords: /plomero|electricista|mec[aá]nico|carpintero|pintor|alba[nñ]il|t[eé]cnico|reparaci[oó]n|mantenimiento/i, category: 'servicios', emoji: '🔧' },
  { keywords: /trabajo|vacante|empleo|se\s*busca|contratando|sueldo|freelance|medio\s*tiempo/i, category: 'empleo', emoji: '💼' },
  { keywords: /renta|departamento|casa\b|roomie|inmueble|terreno|se\s*renta|se\s*vende.*casa|hipoteca/i, category: 'inmuebles', emoji: '🏠' },
  { keywords: /perro|gato|mascota|veterinar|adopci[oó]n|cachorro|gatito|perrito|extravi[oó]/i, category: 'mascotas', emoji: '🐾' },
  { keywords: /uber|taxi|cami[oó]n|ado\b|ferry|ruta\b|autobus|autob[uú]s|colectivo|estacionamiento/i, category: 'transporte', emoji: '🚌' },
  { keywords: /museo|arte\b|teatro|galer[ií]a|exposici[oó]n|libro|lectura|pintura|escultura/i, category: 'cultura', emoji: '🎭' },
  { keywords: /hola\b|buenos\s*d[ií]as|buenas\s*(tardes|noches)|alguien\s*sabe|pregunta|opini[oó]n|meetup|quedamos/i, category: 'social', emoji: '💬' },
  { keywords: /escuela|universidad|curso|taller|beca|clase|maestr|profesor|capacitaci[oó]n|diplomado/i, category: 'educacion', emoji: '📚' },
  { keywords: /vendo\b|compro\b|intercambio|bazar|garage\s*sale|usado|segunda\s*mano/i, category: 'compraventa', emoji: '🛒' },
  { keywords: /tr[aá]mite|cfe\b|imss|sat\b|licencia|pasaporte|gobierno|municipio|alcald/i, category: 'gobierno', emoji: '🏛️' },
  { keywords: /internet|se[nñ]al|fibra\s*[oó]ptica|telmex|celular|computadora|reparar\s*(cel|compu|laptop)/i, category: 'tecnologia', emoji: '📱' },
  { keywords: /cocodrilo|iguana|serpiente|fauna|flora|selva|manglar|ave\b|aves\b|tortuga|mono/i, category: 'naturaleza', emoji: '🌿' },
  { keywords: /voluntari|colecta|donaci[oó]n|junta\s*vecinal|vecinos|limpieza\s*(de\s*)?(playa|parque|colonia)/i, category: 'comunidad', emoji: '🤝' },
  { keywords: /perd[ií]|encontr[eé]|extravi|cartera|llaves|documento|celular\s*perdido|mochila/i, category: 'perdido', emoji: '🔍' },
  { keywords: /queja|denuncia|abuso|fraude|estafa|corrupci[oó]n|injusticia|multa\s*injusta/i, category: 'denuncia', emoji: '📣' },
  { keywords: /guarder[ií]a|ni[nñ]o|infantil|parque\s*infantil|juegos\s*infantiles|beb[eé]|pediatra/i, category: 'ninos', emoji: '👶' },
  { keywords: /est[eé]tica|spa\b|u[nñ]as|barber[ií]a|peluquer[ií]a|makeup|maquillaje|facial|masaje/i, category: 'belleza', emoji: '💇' },
  { keywords: /misa|iglesia|procesi[oó]n|virgen|rosario|templo|capilla|d[ií]a\s*de\s*muertos|parroquia|semana\s*santa|bautizo/i, category: 'religion', emoji: '🙏' },
  { keywords: /jaja|meme|chiste|broma|chistoso|gracioso|humor|lol\b|jeje/i, category: 'humor', emoji: '😂' },
  { keywords: /playa|sargazo|oleaje|arena\b|orilla\s*del\s*mar|playa\s*(delfines|langosta|tortugas|marlin|forum)/i, category: 'playa', emoji: '🏖️' },
  { keywords: /hotel\b|resort|all\s*inclusive|hostal|hospedaje/i, category: 'hotel', emoji: '🏨' },
  { keywords: /tour\b|excursi[oó]n|gu[ií]a\s*tur[ií]stic|paquete\s*tur[ií]stic/i, category: 'tour', emoji: '🗺️' },
  { keywords: /cenote|cueva\s*submar|r[ií]o\s*subterr[aá]neo/i, category: 'cenote', emoji: '💎' },
  { keywords: /ruina|maya|chich[eé]n|tulum\b|cob[aá]|zona\s*arqueol[oó]gica|pir[aá]mide/i, category: 'arqueologia', emoji: '🏛️' },
  { keywords: /aeropuerto|vuelo|avi[oó]n|retraso\s*(de\s*)?vuelo|equipaje|aerol[ií]nea|terminal/i, category: 'vuelo', emoji: '✈️' },
  { keywords: /snorkel|buceo|arrecife|vida\s*marina|coral|pez|peces|submarino/i, category: 'snorkel', emoji: '🤿' },
  { keywords: /souvenir|mercado\s*28|plaza\s*comercial|shopping|tienda\s*de\s*regalos/i, category: 'compras', emoji: '🛍️' },
  { keywords: /foto|atardecer|paisaje|amanecer|selfie|instagram|drone/i, category: 'fotografia', emoji: '📸' },
  { keywords: /check.?in|check.?out|amenidad|toalla|alberca|piscina|habitaci[oó]n/i, category: 'alojamiento', emoji: '🛏️' },
  { keywords: /tipo\s*de\s*cambio|d[oó]lar|casa\s*de\s*cambio|atm\b|cajero/i, category: 'cambio', emoji: '💱' },
  { keywords: /wifi|wi.fi|sim\s*card|chip\s*(telcel|at&t)|datos\s*m[oó]viles/i, category: 'wifi', emoji: '📶' },
  { keywords: /isla\s*mujeres|holbox|cozumel|contoy|isla\b/i, category: 'isla', emoji: '🏝️' },
  { keywords: /zona\s*hotelera\s*(de\s*)?noche|coco\s*bongo|mandala|se[nñ]or\s*frog/i, category: 'vida_nocturna', emoji: '🌙' },
  { keywords: /cochinita|ceviche|mezcal|tequila|marquesita|panuchos|salbutes|poc\s*chuc|comida\s*(local|regional|yucateca)/i, category: 'gastronomia', emoji: '🌮' },
  { keywords: /tirolesa|zipline|atv|parasailing|jetski|jet\s*ski|cuatrimoto|rappel|kayak/i, category: 'aventura', emoji: '🪂' },
  { keywords: /ropa|zapatos|boutique|marca|outfit|vestido/i, category: 'moda', emoji: '👗' },
  { keywords: /abogado|demanda|contrato|asesor[ií]a\s*legal|migraci[oó]n|visa|permiso|juicio/i, category: 'legal', emoji: '⚖️' },
  { keywords: /planta|vivero|huerto|jard[ií]n|paisajismo|poda|flores|maceta/i, category: 'jardineria', emoji: '🌺' },
]

// ── Helpers ─────────────────────────────────────────────────────────

function classifyWithKeywords(text: string): Classification {
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.test(text)) {
      return {
        category: entry.category,
        emoji: entry.emoji,
        summary: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
      }
    }
  }

  return {
    category: 'otro',
    emoji: '📢',
    summary: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
  }
}

function parseAIResponse(response: string): { classification: Classification; safe: boolean; isPromo: boolean } | null {
  const cleaned = response.trim()
  const parts = cleaned.split('|')

  if (parts.length < 4) return null

  const safeStr = parts[0].trim().toUpperCase()
  const category = parts[1].trim().toLowerCase() as Category
  const emoji = parts[2].trim()

  // Check if last part is promo indicator (YES/NO)
  const lastPart = parts[parts.length - 1].trim().toUpperCase()
  const hasPromoField = lastPart === 'YES' || lastPart === 'NO'
  const isPromo = lastPart === 'YES'

  const summaryParts = hasPromoField ? parts.slice(3, -1) : parts.slice(3)
  const summary = summaryParts.join('|').trim()

  const safe = safeStr === 'SAFE'

  if (safeStr === 'BLOCKED') {
    return { classification: { category: 'otro', emoji: '📢', summary: '' }, safe: false, isPromo: false }
  }

  if (!VALID_CATEGORIES.includes(category)) return null
  if (!emoji || emoji.length > 4) return null
  if (!summary) return null

  return { classification: { category, emoji, summary }, safe, isPromo }
}

async function classifyAndModerateWithAI(text: string): Promise<{ classification: Classification; safe: boolean; isPromo: boolean }> {
  const { text: response } = await generateText({
    model: openrouter('google/gemini-2.5-flash'),
    prompt: `Eres moderador y clasificador de una comunidad en Cancun, Mexico.

PASO 1 - MODERACION:
Determina si el contenido es seguro (SAFE) o debe bloquearse (BLOCKED).
BLOQUEA si contiene:
- Contenido sexual explicito, pornografia, o solicitud de servicios sexuales
- Venta o promocion de drogas ilegales o sustancias controladas
- Amenazas de muerte o violencia directa contra personas
- Explotacion de menores de cualquier tipo
- Incitacion al odio, discriminacion racial/etnica/religiosa
- Terrorismo o promocion de actos terroristas
- Venta ilegal de armas
- Trata de personas
- Contenido que glorifique o promueva actividades ilegales graves

NO BLOQUEES contenido que:
- Reporta inseguridad o alertas (ej: "hubo un asalto en la SM28" es SAFE)
- Usa lenguaje coloquial sin ser ofensivo
- Habla de alcohol, bares o fiestas de forma normal
- Reporta accidentes o emergencias

PASO 2 - CLASIFICACION (solo si es SAFE):
CATEGORIAS (50):
trafico, clima, oferta, seguridad, emergencia, tip, comida, evento, fiesta, salud,
deporte, servicios, empleo, inmuebles, mascotas, transporte, cultura, social, educacion, compraventa,
gobierno, tecnologia, naturaleza, comunidad, perdido, denuncia, ninos, belleza, religion, humor,
playa, hotel, tour, cenote, arqueologia, vuelo, snorkel, compras, fotografia, alojamiento,
cambio, wifi, isla, vida_nocturna, gastronomia, aventura, moda, legal, jardineria, otro

REGLAS:
- accidente/choque/bache/semaforo/congestion → trafico
- lluvia/calor/huracan/tormenta → clima
- descuento/promo/2x1/gratis → oferta
- robo/asalto/inseguridad → seguridad
- ambulancia/bomberos/incendio/911 → emergencia
- restaurante/tacos/mariscos/cafe → comida
- cochinita/ceviche/mezcal/comida regional → gastronomia
- concierto/festival/feria/expo → evento
- antro/bar/nightlife/DJ → fiesta
- hospital/farmacia/dengue/doctor → salud
- futbol/gym/surf/torneo → deporte
- plomero/electricista/mecanico → servicios
- trabajo/vacante/contratando → empleo
- renta/casa/roomie/departamento → inmuebles
- perro/gato/mascota/veterinaria → mascotas
- uber/taxi/camion/ADO/ferry → transporte
- museo/arte/teatro/galeria → cultura
- hola/pregunta/opinion/meetup → social
- escuela/curso/taller/beca → educacion
- vendo/compro/bazar/intercambio → compraventa
- tramite/CFE/IMSS/gobierno → gobierno
- internet/señal/celular/laptop → tecnologia
- cocodrilo/iguana/fauna/selva → naturaleza
- voluntariado/colecta/junta vecinal → comunidad
- perdi/encontre/cartera/llaves → perdido
- queja/denuncia/fraude/estafa → denuncia
- guarderia/niño/parque infantil → ninos
- estetica/spa/uñas/barberia → belleza
- misa/iglesia/procesion/virgen → religion
- jaja/meme/chiste/broma → humor
- playa/sargazo/oleaje/arena → playa
- hotel/resort/hostal → hotel
- tour/excursion/guia turistico → tour
- cenote/cueva/rio subterraneo → cenote
- ruinas/maya/Chichen/Tulum → arqueologia
- aeropuerto/vuelo/equipaje → vuelo
- snorkel/buceo/arrecife → snorkel
- souvenir/mercado 28/shopping → compras
- foto/atardecer/paisaje/selfie → fotografia
- check-in/amenidad/alberca → alojamiento
- tipo de cambio/dolar/ATM → cambio
- wifi/SIM card/datos moviles → wifi
- Isla Mujeres/Holbox/Cozumel → isla
- zona hotelera de noche/Coco Bongo → vida_nocturna
- tirolesa/ATV/parasailing/kayak → aventura
- ropa/zapatos/boutique → moda
- abogado/contrato/visa/migracion → legal
- planta/vivero/jardin → jardineria
- SOLO usa "otro" si NINGUNA de las 49 categorias aplica

PASO 3 - DETECCION DE PROMOCION B2C:
Determina si el contenido es una PROMOCION COMERCIAL (B2C):
- YES si menciona un NEGOCIO ESPECIFICO (restaurante, tienda, hotel, bar, etc.) con intencion promocional
- YES si es publicidad comercial de un establecimiento
- NO si es venta persona-a-persona (ej: "vendo mi bici")
- NO si es una recomendacion personal sin intencion comercial
- NO si solo menciona un lugar sin promocionar

FORMATO DE RESPUESTA (una sola linea):
Si es seguro: SAFE|CATEGORIA|EMOJI|RESUMEN|PROMO
Si es bloqueado: BLOCKED|otro|📢|bloqueado|NO

Donde PROMO es YES o NO.

Ejemplos:
SAFE|trafico|🚗|Choque en la avenida Tulum|NO
SAFE|oferta|💰|2x1 en margaritas en La Habichuela|YES
SAFE|compraventa|🛒|Vendo mi bici usada en buen estado|NO
SAFE|comida|🍽️|Nuevo menu de temporada en Porfirios|YES
BLOCKED|otro|📢|bloqueado|NO

Texto: "${text}"`,
  })

  const result = parseAIResponse(response)
  if (!result) {
    throw new Error(`AI response unparseable: "${response}"`)
  }
  return result
}

// ── Public API ──────────────────────────────────────────────────────

export interface ClassificationResult {
  classification: Classification
  blocked: boolean
  isPromo: boolean
}

export async function classifyShoutout(text: string): Promise<ClassificationResult> {
  // Layer 1: Keyword blocklist (instant, no API call)
  if (isBlockedByKeywords(text)) {
    console.log('[classify-shoutout] BLOCKED by keywords')
    return {
      classification: { category: 'otro', emoji: '📢', summary: '' },
      blocked: true,
      isPromo: false,
    }
  }

  // Layer 2: AI moderation + classification (single call)
  try {
    const { classification, safe, isPromo } = await classifyAndModerateWithAI(text)
    if (!safe) {
      console.log('[classify-shoutout] BLOCKED by AI moderation')
      return { classification, blocked: true, isPromo: false }
    }
    return { classification, blocked: false, isPromo }
  } catch (error) {
    console.error('[classify-shoutout] AI failed:', error)
  }

  // Layer 3: Keyword classification fallback (no moderation needed — already passed Layer 1)
  const keywordResult = classifyWithKeywords(text)
  console.log('[classify-shoutout] Using keyword fallback:', keywordResult.category)
  return { classification: keywordResult, blocked: false, isPromo: false }
}
