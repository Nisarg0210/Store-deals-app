import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './components.css';

/** Scales correctly on iPhone, iPad, Android; respects safe areas & notches */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
  colorScheme: 'dark',
};

const inter = Inter({
  subsets: ['latin'],
  weight: ['300','400','500','600','700','800','900'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "The Market ON James North — Today's Best Offers",
  description: 'Scan QR codes to discover the latest store deals, clearance items, and limited-time offers near you.',
  keywords: ['store deals', 'clearance', 'discounts', 'QR code deals', 'near expiry deals'],
  applicationName: 'James North Deals',
  appleWebApp: {
    capable: true,
    title: 'James North Deals',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: "The Market ON James North — Today's Best Offers",
    description: 'Find the best deals at your local store — clearance, near expiry, hot deals and more.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
