import { z } from 'zod'

export const createShoutoutSchema = z.object({
  text: z
    .string()
    .min(1, 'El shoutout no puede estar vacio')
    .max(280, 'Maximo 280 caracteres')
    .transform(t => t.trim())
    .refine(t => t.length > 0, 'Solo espacios no es valido'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  sessionId: z.string().min(1),
  alias: z.string().min(1),
  source: z.enum(['text', 'voice']).default('text'),
})

export const classificationSchema = z.object({
  category: z.enum([
    'trafico', 'clima', 'oferta', 'alerta',
    'tip', 'comida', 'evento', 'otro',
  ]),
  emoji: z.string().min(1).max(4),
  summary: z.string().min(1).max(100),
})

export type CreateShoutoutInput = z.infer<typeof createShoutoutSchema>
export type Classification = z.infer<typeof classificationSchema>
