import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/layout/Navbar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'FinBank — Banking rebuilt from first principles',
  description:
    'The first financial institution of the digital era built on the right principles. Total transparency, collective ownership, unbreakable foundations.',
  keywords: ['fintech', 'DeFi', 'banking', 'blockchain', 'cooperative', 'EURe', 'Base'],
  openGraph: {
    title: 'FinBank — Banking rebuilt from first principles',
    description: 'Total transparency, collective ownership, unbreakable foundations.',
    type: 'website',
    siteName: 'FinBank',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinBank — Banking rebuilt from first principles',
    description: 'Total transparency, collective ownership, unbreakable foundations.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
