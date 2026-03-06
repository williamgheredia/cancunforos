export interface SiteConfig {
  appName: string
  appSlogan: string
  appDescription: string

  contact: {
    email: string
    city: string
    country: string
  }

  social: {
    twitter?: string
    instagram?: string
  }

  seo: {
    siteTitle: string
    titleTemplate: string
    defaultDescription: string
    locale: string
  }

  features: {
    voiceMinSeconds: number
    textMaxChars: number
    shoutoutTTLHours: number
    spotInactivityDays: number
    radiusKm: number
    collapseDoubtThreshold: number
  }
}

export const siteConfig: SiteConfig = {
  appName: 'CancunForos',
  appSlogan: 'Lo que pasa aqui, se sabe aqui',
  appDescription: 'Comunidad hiperlocal voice-first. Alertas, tips y ofertas en tiempo real para vecinos y turistas en Cancun.',

  contact: {
    email: 'hola@cancunforos.com',
    city: 'Cancun',
    country: 'Mexico',
  },

  social: {
    twitter: 'https://twitter.com/cancunforos',
    instagram: 'https://instagram.com/cancunforos',
  },

  seo: {
    siteTitle: 'CancunForos | Lo que pasa aqui, se sabe aqui',
    titleTemplate: '%s | CancunForos',
    defaultDescription: 'App de comunidad hiperlocal en Cancun. Shoutouts de voz geolocalizados en tiempo real. Alertas, tips y ofertas para vecinos y turistas.',
    locale: 'es_MX',
  },

  features: {
    voiceMinSeconds: 10,
    textMaxChars: 280,
    shoutoutTTLHours: 24,
    spotInactivityDays: 7,
    radiusKm: 3,
    collapseDoubtThreshold: 0.6,
  },
}
