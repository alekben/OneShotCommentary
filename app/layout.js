import './globals.css'

export const metadata = {
  title: 'One Shot Commentary',
  description: 'AI Agent single response generator',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

