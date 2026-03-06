import type { Metadata, Viewport } from 'next'
import { siteConfig } from '@/config/siteConfig'
import { ServiceWorkerRegister } from '@/shared/components/ServiceWorkerRegister'
import './globals.css'

export const metadata: Metadata = {
  title: siteConfig.seo.siteTitle,
  description: siteConfig.seo.defaultDescription,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteConfig.appName,
  },
  openGraph: {
    title: siteConfig.seo.siteTitle,
    description: siteConfig.seo.defaultDescription,
    locale: siteConfig.seo.locale,
    siteName: siteConfig.appName,
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#facc15',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
