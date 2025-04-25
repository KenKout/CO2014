// src/app/booking/layout.tsx

export const metadata = {
  title: 'Badminton Booking',
  description: 'Book your badminton court or training session',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}