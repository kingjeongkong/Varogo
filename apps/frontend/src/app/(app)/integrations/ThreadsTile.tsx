'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  useThreadsConnect,
  useThreadsConnectionStatus,
  useThreadsDisconnect,
} from '@/features/threads';
import { useImportVoice, useVoiceProfile } from '@/features/voice-profile';
import { Info } from 'lucide-react';

const headingId = 'threads-tile-heading';
const VOICE_TOOLTIP_TEXT =
  'Drafts match your tone by learning from your recent Threads posts.';

function ThreadsLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
    </svg>
  );
}

export function ThreadsTile() {
  const {
    data: connection,
    isLoading: connectionLoading,
    error: connectionError,
  } = useThreadsConnectionStatus();
  const connectMutation = useThreadsConnect();
  const disconnectMutation = useThreadsDisconnect();

  if (connectionLoading) {
    return (
      <section
        aria-labelledby={headingId}
        aria-busy="true"
        className="glass-card p-6"
      >
        <h2 id={headingId} className="sr-only">
          Threads
        </h2>
        <div className="skeleton h-10 w-10 mb-4" />
        <div className="skeleton h-5 w-1/3 mb-3" />
        <div className="skeleton h-4 w-2/3" />
      </section>
    );
  }

  if (connectionError) {
    return (
      <section aria-labelledby={headingId} className="glass-card p-6">
        <h2 id={headingId} className="sr-only">
          Threads
        </h2>
        <Alert>
          Failed to load connection status. Please refresh the page.
        </Alert>
      </section>
    );
  }

  const isConnected = connection?.connected ?? false;

  return (
    <section
      aria-labelledby={headingId}
      className="glass-card p-6 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-3 items-center justify-center">
        <ThreadsLogo className="w-10 h-10 text-text-primary" />
        <h2
          id={headingId}
          className="text-lg font-heading font-semibold text-text-primary"
        >
          Threads
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {isConnected ? (
          <Button
            variant="outline"
            loading={disconnectMutation.isPending}
            loadingText="Disconnecting..."
            onClick={() => disconnectMutation.mutate()}
            className="w-full"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            loading={connectMutation.isPending}
            loadingText="Connecting..."
            onClick={() => connectMutation.mutate()}
            className="w-full"
          >
            Connect Account
          </Button>
        )}

        {isConnected && (
          <p className="text-sm text-text-muted">
            <span
              className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"
              aria-hidden="true"
            />
            {connection?.username
              ? `@${connection.username} connected`
              : 'Connected'}
          </p>
        )}
      </div>

      {(connectMutation.isError || disconnectMutation.isError) && (
        <Alert>
          {connectMutation.isError
            ? 'Failed to connect account. Please try again.'
            : 'Failed to disconnect account. Please try again.'}
        </Alert>
      )}

      {isConnected && <VoiceRow />}
    </section>
  );
}

function VoiceRow() {
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useVoiceProfile();
  const importMutation = useImportVoice();

  const showImportedBadge = !profileLoading && !profileError && !!profile;

  return (
    <div className="border-t border-border pt-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary">Voice</span>
          <Tooltip content={VOICE_TOOLTIP_TEXT}>
            <button
              type="button"
              aria-label="About Voice"
              className="inline-flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <Info className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>

        {showImportedBadge && (
          <span
            className="inline-flex items-center gap-1 text-sm font-medium text-green-400"
            aria-label="Voice imported"
          >
            <span aria-hidden="true">✓</span>
            Imported
          </span>
        )}
      </div>

      {profileLoading ? (
        <div className="skeleton h-10 w-full" />
      ) : profileError ? (
        <Alert>Failed to load voice profile. Please refresh the page.</Alert>
      ) : !profile ? (
        <Button
          variant="outline"
          loading={importMutation.isPending}
          loadingText="Importing..."
          onClick={() => importMutation.mutate()}
          className="w-full"
        >
          Import voice
        </Button>
      ) : null}

      {importMutation.isError && <Alert>{importMutation.error.message}</Alert>}
    </div>
  );
}
