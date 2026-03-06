import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CancunForos',
    short_name: 'CancunForos',
    description: 'Comunidad hiperlocal voice-first. Alertas, tips y ofertas en tiempo real.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0ede6',
    theme_color: '#facc15',
    orientation: 'portrait',
    categories: ['social', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
