import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
import Hero from '@/features/landing/components/Hero';
import HowItWorks from '@/features/landing/components/HowItWorks';
import Features from '@/features/landing/components/Features';
import FinalCta from '@/features/landing/components/FinalCta';

export const metadata: Metadata = {
  title: 'Varogo — Marketing strategy for indie developers on Threads',
  description:
    'You shipped it. Now the feed is silent. Varogo builds your Threads marketing strategy and drafts the posts.',
  openGraph: {
    title: 'Varogo — Marketing strategy for indie developers on Threads',
    description:
      'You shipped it. Now the feed is silent. Varogo builds your Threads marketing strategy and drafts the posts.',
    siteName: 'Varogo',
    url: 'https://varo-go.com',
    type: 'website',
  },
};

export default async function HomePage() {
  const cookieStore = await cookies();
  if (cookieStore.get('access_token')) {
    redirect('/dashboard');
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-surface focus:border focus:border-border focus:rounded-md focus:text-text-primary"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Features />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
