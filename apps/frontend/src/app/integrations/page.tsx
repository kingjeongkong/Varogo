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
        Threads 계정 연결에 실패했습니다. 다시 시도해주세요.
      </div>
    );
  }

  return (
    <div
      className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
      role="status"
    >
      Threads 계정이 연결되었습니다.
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
            연동 관리
          </h1>
          <p className="text-sm text-text-muted">
            외부 플랫폼 계정을 연결하여 콘텐츠를 게시할 수 있습니다.
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
                      ? `@${connection.username} 연결됨`
                      : '연결됨'}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">
                    Threads 계정을 연결하면 콘텐츠를 바로 게시할 수 있습니다.
                  </p>
                )}
              </div>

              <div>
                {connection?.connected ? (
                  <Button
                    variant="outline"
                    loading={disconnectMutation.isPending}
                    loadingText="해제 중..."
                    onClick={() => disconnectMutation.mutate()}
                  >
                    연결 해제
                  </Button>
                ) : (
                  <Button
                    loading={connectMutation.isPending}
                    loadingText="연결 중..."
                    onClick={() => connectMutation.mutate()}
                  >
                    계정 연결
                  </Button>
                )}
              </div>
            </div>

            {connectMutation.isError && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                계정 연결에 실패했습니다. 다시 시도해주세요.
              </p>
            )}
            {disconnectMutation.isError && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                연결 해제에 실패했습니다. 다시 시도해주세요.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
