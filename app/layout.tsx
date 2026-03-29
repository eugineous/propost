import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'ProPost Empire — Command Center',
  description: 'Autonomous Social Media Empire for Eugine Micah',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-pp-bg text-pp-text min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
