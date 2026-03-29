import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './components.css';

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
