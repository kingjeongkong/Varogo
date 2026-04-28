'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ThreadsTile } from './ThreadsTile';

function ThreadsCallbackBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const banner = searchParams.get('threads');

  useEffect(() => {
    if (banner === 'connected' || banner === 'error') {
      router.replace('/integrations', { scroll: false });
    }
  }, [banner, router]);

  if (banner !== 'connected' && banner !== 'error') return null;

  if (banner === 'error') {
    return (
      <div
        className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        role="alert"
      >
        Failed to connect Threads account. Please try again.
      </div>
    );
  }

  return (
    <div
      className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
      role="status"
    >
      Threads account connected.
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="space-y-2 mb-10">
        <h1 className="text-2xl font-heading font-bold text-text-primary">
          Integrations
        </h1>
        <p className="text-sm text-text-muted">
          Connect external platform accounts to publish content.
        </p>
      </div>

      <Suspense fallback={null}>
        <ThreadsCallbackBanner />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ThreadsTile />
      </div>
    </main>
  );
}
