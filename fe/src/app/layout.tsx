import '@/styles/globals.css'
import { Urbanist } from 'next/font/google'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { AuthProvider } from '@/context/AuthContext'

const urbanist = Urbanist({ 
  subsets: ['latin'],
  weight: ['400', '500', '600']
})

export const metadata: Metadata = {
  title: 'BadmintonHub',
  description: 'Your premier badminton destination',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* <link href="https://fonts.cdnfonts.com/css/catorze27-style1" rel="stylesheet" /> */}
      </head>
      <body className={urbanist.className}>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}