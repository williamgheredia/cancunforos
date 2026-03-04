import { z } from 'zod'

export const createSpotSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre no puede estar vacio')
    .max(80, 'Maximo 80 caracteres')
    .transform(t => t.trim())
    .refine(t => t.length > 0, 'Solo espacios no es valido'),
  description: z
    .string()
    .max(280, 'Maximo 280 caracteres')
    .transform(t => t.trim())
    .optional()
    .default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  sessionId: z.string().min(1),
})

export const spotClassificationSchema = z.object({
  category: z.enum([
    'restaurante', 'tienda', 'servicio', 'entretenimiento',
    'salud', 'educacion', 'transporte', 'otro',
  ]),
  emoji: z.string().min(1).max(4),
})

export type CreateSpotInput = z.infer<typeof createSpotSchema>
export type SpotClassification = z.infer<typeof spotClassificationSchema>
