---
name: anti-silence-validation
description: Validacion de 3 capas para audio grabado desde el navegador. Previene que modelos de IA "imaginen" contenido cuando el usuario graba silencio o ruido sin voz. Aplicar siempre que se implemente grabacion de voz con transcripcion AI.
license: MIT
---

# Anti-Silence Validation (3 Capas)

## Purpose

Cuando un usuario graba audio sin hablar (silencio, ruido de fondo), los modelos de IA como Gemini pueden "imaginar" o "alucinar" contenido inexistente. Este skill implementa una validacion de 3 capas que previene este problema cortando el flujo lo antes posible.

## When to Use

- Implementando grabacion de voz con transcripcion AI
- Usando MediaRecorder API + modelo de IA para speech-to-text
- Cualquier flujo donde audio del navegador se envia a un LLM multimodal

## Arquitectura de 3 Capas

```
[Grabacion] → Capa 1 (Client) → Capa 2 (Server) → Capa 3 (Post-AI) → [Texto]
                 ↓ reject           ↓ reject            ↓ reject
              "Sin voz"          "Sin voz"          "Sin voz clara"
```

### Capa 1: Client-Side (Hook/Component)

**Donde**: Hook de grabacion o componente que maneja el MediaRecorder.
**Cuando**: Despues de `mediaRecorder.stop()`, antes de enviar al API.
**Que valida**: Tamano del blob de audio.

```typescript
// En el hook de grabacion (ej: use-voice-recorder.ts)
const blob = new Blob(chunks, { type: 'audio/webm' })

// Blobs < 5KB son casi seguro silencio
if (blob.size < 5000) {
  setError('No se detecto voz. Habla mas fuerte e intenta de nuevo.')
  setState('idle')
  return // NO enviar al API
}

// Continuar con fetch al API...
```

**Por que 5KB**: Un audio WebM/Opus de ~10 segundos de silencio pesa ~3-4KB. Voz real de 2+ segundos supera los 10KB facilmente.

### Capa 2: Server-Side (API Route)

**Donde**: El endpoint que recibe el audio (ej: `/api/transcribe`).
**Cuando**: Antes de enviar al modelo de IA.
**Que valida**: Tamano del archivo recibido.

```typescript
// En la API route
const audio = formData.get('audio') as File | null

if (!audio) {
  return NextResponse.json({ error: 'No audio file' }, { status: 400 })
}

// Segunda validacion: rechazar archivos pequenos
if (audio.size < 5000) {
  return NextResponse.json(
    { error: 'No se detecto voz. Intenta grabar de nuevo hablando claramente.' },
    { status: 400 }
  )
}
```

**Por que duplicar**: El client puede ser bypaseado. La validacion server-side es la fuente de verdad.

### Capa 3: Post-AI Validation

**Donde**: Despues de recibir la respuesta del modelo de IA.
**Cuando**: Antes de devolver el texto al cliente.
**Que valida**: Contenido de la transcripcion.

```typescript
// En el prompt al modelo:
const prompt = `Transcribe este audio en español. Solo devuelve el texto transcrito,
sin explicaciones, sin comillas, sin formato adicional.
Si el audio esta en silencio, no contiene voz humana clara,
o solo tiene ruido de fondo, responde EXACTAMENTE con la palabra: SILENCIO`

// Despues de obtener la respuesta:
const text = response.choices?.[0]?.message?.content?.trim() ?? ''

if (!text || text === 'SILENCIO' || text.length < 3) {
  return NextResponse.json(
    { error: 'No se detecto voz clara. Habla mas fuerte o acerca el microfono.' },
    { status: 400 }
  )
}
```

**Por que**: Algunos blobs de ruido ambiental pesan >5KB pero no contienen voz. El modelo debe decidir, pero necesita instrucciones explicitas para reportar silencio en lugar de inventar contenido.

## Parametros Ajustables

| Parametro | Default | Descripcion |
|-----------|---------|-------------|
| `MIN_BLOB_SIZE` | 5000 bytes | Tamano minimo de blob para considerar que hay audio |
| `SILENCE_KEYWORD` | `"SILENCIO"` | Palabra que el modelo devuelve cuando no hay voz |
| `MIN_TEXT_LENGTH` | 3 chars | Longitud minima de transcripcion valida |

## Errores Comunes

### El modelo ignora la instruccion SILENCIO
- Reforzar en el prompt: "responde EXACTAMENTE con la palabra: SILENCIO"
- Algunos modelos necesitan que la instruccion este al inicio Y al final del prompt

### Blobs de ruido ambiental pasan la Capa 1
- Normal si el entorno es ruidoso. La Capa 3 los atrapa.
- Considerar subir `MIN_BLOB_SIZE` a 8000-10000 en entornos ruidosos.

### Audio legitimo rechazado
- Bajar `MIN_BLOB_SIZE` a 3000 si usuarios reportan falsos positivos
- Reducir `MIN_TEXT_LENGTH` a 2 si el idioma permite palabras de 2 chars

## Checklist de Implementacion

```
□ Capa 1: Hook/component valida blob.size > MIN_BLOB_SIZE
□ Capa 2: API route valida file.size > MIN_BLOB_SIZE
□ Capa 3: Prompt incluye instruccion SILENCIO
□ Capa 3: Post-respuesta valida texto no vacio, no SILENCIO, length >= MIN_TEXT_LENGTH
□ Mensajes de error claros en espanol (o idioma del proyecto)
□ UX: Estado de error visible al usuario con instrucciones para reintentar
```
