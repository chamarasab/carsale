import type { Metadata } from 'next';
import { Inter, Nunito } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsale-client.vercel.app'),
  title: 'Genuine Automobiles',
  description: 'Genuine quality Japanese auction cars with clear estimated landed costs for Sri Lanka.',
  openGraph: {
    title: 'Genuine Automobiles',
    description: 'Genuine quality Japanese auction cars with clear estimated landed costs for Sri Lanka.',
    images: ['/genuine-automobiles-logo-transparent.png'],
  },
  icons: {
    icon: '/genuine-automobiles-logo-transparent.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('carsale-theme');var d=t?t==='dark':false;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${nunito.variable} ${inter.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
