'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  useImportVoice,
  useVoiceProfile,
} from '@/features/voice-profile/hooks/use-voice-profile';
import { useThreadsConnectionStatus } from '@/hooks/use-threads-connection';

interface PostFlowVoiceGateProps {
  children: ReactNode;
}

export function PostFlowVoiceGate({ children }: PostFlowVoiceGateProps) {
  const {
    data: connection,
    isLoading: connectionLoading,
    error: connectionError,
  } = useThreadsConnectionStatus();
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useVoiceProfile();
  const importMutation = useImportVoice();

  if (connectionLoading || profileLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Checking voice setup"
        className="glass-card p-6"
      >
        <div className="skeleton h-5 w-1/3 mb-3" />
        <div className="skeleton h-4 w-2/3" />
      </section>
    );
  }

  if (connectionError || profileError) {
    return (
      <Alert>
        Failed to load voice setup. Please refresh the page.
      </Alert>
    );
  }

  if (!connection?.connected) {
    return (
      <section className="glass-card p-6 space-y-3">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          Connect Threads first
        </h2>
        <p className="text-sm text-text-muted">
          We use your recent Threads posts to match your writing voice before
          drafting. Head to integrations to connect your account, then come
          back here.
        </p>
        <Link
          href="/integrations"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-base font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-surface-hover hover:text-text-primary active:scale-[0.97]"
        >
          Go to integrations
        </Link>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="glass-card p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-heading font-semibold text-text-primary">
            Import your voice
          </h2>
          <p className="text-sm text-text-muted">
            One-time step. We read your recent Threads posts so the hooks we
            suggest sound like you.
          </p>
        </div>
        <Button
          loading={importMutation.isPending}
          loadingText="Importing..."
          onClick={() => importMutation.mutate()}
        >
          Import voice from Threads
        </Button>
        {importMutation.isError && (
          <Alert>{importMutation.error.message}</Alert>
        )}
      </section>
    );
  }

  return <>{children}</>;
}
