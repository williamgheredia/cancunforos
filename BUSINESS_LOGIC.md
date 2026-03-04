# BUSINESS_LOGIC.md - CancunForos

> Generado por SaaS Factory | Fecha: 2026-03-04

## 1. Problema de Negocio

**Dolor:** Las personas en una zona local (vecinos y turistas) no tienen forma de enterarse en tiempo real de lo que pasa a metros de donde están. Si hay un accidente, una oferta, un corte de agua o un lugar que vale la pena visitar hoy, esa información existe en la cabeza de alguien cercano pero no llega a quien la necesita. Los canales actuales (WhatsApp, Facebook, Google Maps) son lentos, requieren registro, están saturados de spam o muestran información desactualizada.

**Costo actual:**
- **Tiempo:** Turista pierde 20-30 min revisando reseñas desactualizadas para decidir qué hacer hoy
- **Dinero:** Negocio local pierde clientes que están pasando por su puerta porque no hay canal de bajo costo para comunicar ofertas en el momento
- **Frustración:** El vecino que sabe lo que pasa no tiene canal ligero para compartirlo; la info local valiosa muere en conversaciones privadas

## 2. Solución

**Propuesta de valor:** Una app de comunidad hiperlocal que convierte mensajes de voz en alertas, tips y ofertas geolocalizadas en tiempo real para vecinos y turistas que están en la misma zona ahora mismo.

**Flujo principal - Lector (Happy Path):**
1. Abre la app → sistema detecta ubicación → muestra feed de lo que pasa en 5km
2. Ve shoutouts con emoji, alias, distancia y tiempo relativo
3. Toca pin en mapa o tarjeta en feed para ver mensaje completo
4. Reacciona con "Yo también lo vi" o "Duda" para validar la información

**Flujo principal - Publicador (Happy Path):**
1. Toca botón + flotante en el feed
2. Mantiene presionado walkie talkie y graba mensaje de voz (mínimo 10s)
3. Sistema valida voz humana, transcribe con Whisper, envía texto a Claude
4. Claude asigna categoría, emoji y resumen automáticamente
5. Se captura ubicación y el shoutout aparece en feed + mapa con pin emoji, visible 24 horas

## 3. Usuario Objetivo

**Consumidores y publicadores de shoutouts:**
- **El turista** que acaba de llegar a Cancún, no conoce a nadie y necesita saber qué pasa hoy en su zona
- **El nómada digital** que lleva una semana y quiere conectar o descubrir lugares que no están en Google
- **El vecino** que lleva años en la colonia, sabe todo y quiere avisar a su comunidad sin meterse a WhatsApp

**Gestores de Spots Permanentes:**
- **El dueño de taquería** con una promo hoy que quiere que la gente que pasa lo sepa ahora
- **El operador de tours** de último minuto que necesita llenar lugares para la salida de las 3pm
- **El negocio local** que depende del tráfico peatonal sin presupuesto para plataformas grandes

**Anti-target v1:**
- Negocios que buscan alcance masivo o nacional
- Usuarios que quieren historial, perfil público o seguidores
- Cualquiera que necesite más de 10 segundos para publicar

## 4. Arquitectura de Datos

**Input:**
- Audio de voz (grabación mínimo 10s, se destruye post-transcripción)
- Texto escrito (alternativa manual, máximo 280 caracteres)
- Coordenadas GPS (capturadas al publicar o pull-to-refresh)
- Reacciones ("Yo también lo vi" / "Duda")
- Reportes manuales (razón vía long-press)

**Output:**
- Feed de shoutouts (emoji, alias, distancia, resumen, timestamp relativo)
- Mapa con pins emoji (tap para preview, segundo tap para completo)
- Clasificación automática por Claude (categoría, emoji, resumen 1 línea)
- Spots Permanentes (marcadores fijos, ocultos si no publican en 7 días)
- Alias generado (identidad temporal: "TlacuacheAgotado_23")
- Shoutouts colapsados (marcados cuando >60% dudas)

**Storage (Supabase tables):**

```sql
shoutouts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  alias text not null,
  text text not null,
  summary text not null,
  category text not null,
  emoji text not null,
  source text not null default 'voice', -- 'voice' | 'text'
  lat double precision not null,
  lng double precision not null,
  reactions_confirm int default 0,
  reactions_doubt int default 0,
  reports_count int default 0,
  is_collapsed boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
)

spots (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  description text,
  category text not null,
  emoji text not null,
  lat double precision not null,
  lng double precision not null,
  last_activity timestamptz default now(),
  is_active boolean default true,
  created_at timestamptz default now()
)

reactions (
  id uuid primary key default gen_random_uuid(),
  shoutout_id uuid references shoutouts(id) on delete cascade,
  type text not null, -- 'confirm' | 'doubt'
  session_id text not null,
  created_at timestamptz default now()
)

reports (
  id uuid primary key default gen_random_uuid(),
  shoutout_id uuid references shoutouts(id) on delete cascade,
  reason text not null,
  session_id text not null,
  created_at timestamptz default now()
)
```

## 5. KPI de Exito

**Volumen:** >= 150 shoutouts/semana en zona piloto, >= 70% via voz
**Calidad:** >= 80% clasificacion correcta por Claude, 0 audios almacenados
**Retencion:** >= 40% retencion a 3 dias, >= 3 shoutouts/usuario activo
**Friccion:** Tiempo publicacion <= 20 segundos
**Ecosistema:** >= 10 Spots activos al dia 30, >= 80% mantienen actividad semanal

## 6. Especificacion Tecnica

### Features a Implementar (Feature-First)

```
src/features/
├── feed/           # Feed de shoutouts + pull-to-refresh + filtros
├── map/            # Mapa con pins emoji + Spots Permanentes
├── shoutout/       # Publicar voz/texto + AI processing (Whisper + Claude)
├── spots/          # Spots Permanentes de negocios
└── reactions/      # Reacciones (confirm/doubt) + reportes
```

### Stack Confirmado
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4
- **Backend:** Supabase (Database + Storage)
- **AI:** Vercel AI SDK + OpenRouter (Claude para clasificacion) + Whisper (transcripcion)
- **Validacion:** Zod
- **State:** Zustand
- **Design:** Neobrutalism
- **MCPs:** Next.js DevTools + Playwright + Supabase

### Fases de Implementacion

1. [ ] Setup proyecto + Neobrutalism + BUSINESS_LOGIC.md
2. [ ] Base de datos (tablas + RLS + policies)
3. [ ] Feature: Feed (listado shoutouts + pull-to-refresh)
4. [ ] Feature: Map (mapa con pins + geolocation)
5. [ ] Feature: Shoutout (publicar voz + texto + AI processing)
6. [ ] Feature: Spots (marcadores permanentes de negocios)
7. [ ] Feature: Reactions (confirm/doubt + reportes + colapso)
8. [ ] Testing E2E
9. [ ] Deploy Vercel
