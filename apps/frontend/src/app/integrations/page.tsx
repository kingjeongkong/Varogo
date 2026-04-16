'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import {
  useThreadsConnectionStatus,
  useThreadsConnect,
  useThreadsDisconnect,
} from '@/features/threads/hooks/use-threads-connection';

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

  const { data: connection, isLoading } = useThreadsConnectionStatus();
  const connectMutation = useThreadsConnect();
  const disconnectMutation = useThreadsDisconnect();

  return (
    <div className="min-h-screen">
      <Header />

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

        {isLoading ? (
          <div className="glass-card p-8">
            <div className="skeleton h-6 w-1/4 mb-4" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        ) : (
          <div className="glass-card p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-heading font-semibold text-text-primary">
                  Threads
                </h2>
                {connection?.connected ? (
                  <p className="text-sm text-text-muted">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2" aria-hidden="true" />
                    {connection.username
                      ? `@${connection.username} connected`
                      : 'Connected'}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">
                    Connect your Threads account to publish content directly.
                  </p>
                )}
              </div>

              <div>
                {connection?.connected ? (
                  <Button
                    variant="outline"
                    loading={disconnectMutation.isPending}
                    loadingText="Disconnecting..."
                    onClick={() => disconnectMutation.mutate()}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    loading={connectMutation.isPending}
                    loadingText="Connecting..."
                    onClick={() => connectMutation.mutate()}
                  >
                    Connect Account
                  </Button>
                )}
              </div>
            </div>

            {connectMutation.isError && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                Failed to connect account. Please try again.
              </p>
            )}
            {disconnectMutation.isError && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                Failed to disconnect account. Please try again.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
