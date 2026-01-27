import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui';
import { AuthProvider, ThemeProvider } from '@/contexts';
import { COMPANY } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${COMPANY.name}`,
    default: `${COMPANY.name} - Sistema de Gestión`,
  },
  description: `Sistema de Gestión de Inventario y Cotizaciones - ${COMPANY.name}`,
  keywords: ['inventario', 'cotizaciones', 'baterías', 'NICMAT', 'gestión'],
  authors: [{ name: COMPANY.name }],
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
