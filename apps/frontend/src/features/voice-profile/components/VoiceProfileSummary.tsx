'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useThreadsConnectionStatus } from '@/hooks/use-threads-connection';
import Link from 'next/link';
import { useImportVoice, useVoiceProfile } from '../hooks/use-voice-profile';

export function VoiceProfileSummary() {
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

  const headingId = 'voice-profile-heading';

  if (connectionLoading || profileLoading) {
    return (
      <section
        aria-labelledby={headingId}
        aria-busy="true"
        className="glass-card p-6 mb-8"
      >
        <h2 id={headingId} className="sr-only">
          Your Voice
        </h2>
        <div className="skeleton h-5 w-1/4 mb-3" />
        <div className="skeleton h-4 w-1/2" />
      </section>
    );
  }

  if (connectionError || profileError) {
    return (
      <section aria-labelledby={headingId} className="mb-8">
        <h2 id={headingId} className="sr-only">
          Your Voice
        </h2>
        <Alert>Failed to load voice profile. Please refresh the page.</Alert>
      </section>
    );
  }

  if (!connection?.connected) {
    return (
      <section
        aria-labelledby={headingId}
        className="glass-card p-6 mb-8 flex items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <h2
            id={headingId}
            className="text-lg font-heading font-semibold text-text-primary"
          >
            Your Voice
          </h2>
          <p className="text-sm text-text-muted">
            Connect your Threads account to import your voice.
          </p>
        </div>
        <Link
          href="/integrations"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-base font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-surface-hover hover:text-text-primary active:scale-[0.97]"
        >
          Connect Threads
        </Link>
      </section>
    );
  }

  if (!profile) {
    return (
      <section
        aria-labelledby={headingId}
        className="glass-card p-6 mb-8 space-y-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2
              id={headingId}
              className="text-lg font-heading font-semibold text-text-primary"
            >
              Your Voice
            </h2>
            <p className="text-sm text-text-muted">
              Import your voice from recent Threads posts so drafts sound like
              you.
            </p>
          </div>
          <Button
            loading={importMutation.isPending}
            loadingText="Importing..."
            onClick={() => importMutation.mutate()}
          >
            Import voice
          </Button>
        </div>
        {importMutation.isError && (
          <Alert>{importMutation.error.message}</Alert>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="glass-card p-6 mb-8 space-y-2"
    >
      <h2
        id={headingId}
        className="text-lg font-heading font-semibold text-text-primary"
      >
        Your Voice
      </h2>
      <p className="text-sm text-text-muted">
        {profile.sampleCount} posts analyzed
      </p>
      <p className="text-sm text-text-secondary">
        {profile.styleFingerprint.tonality}
      </p>
    </section>
  );
}
