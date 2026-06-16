import type { Metadata } from 'next';
import { Sora, Outfit, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import QueryProvider from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Varogo — Marketing strategy for indie developers',
  description: 'AI-powered Threads marketing strategy SaaS for indie developers',
  other: {
    'facebook-domain-verification': 'f78gprkjcfqmb92ca6kj044nohsbf0',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${sora.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        <QueryProvider>
          <AuthProvider>
            <RadixTooltip.Provider delayDuration={200}>
              {children}
            </RadixTooltip.Provider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
