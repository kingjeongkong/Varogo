import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostFlowVoiceGate } from './PostFlowVoiceGate';
import type {
  StyleFingerprint,
  ThreadsConnectionResponse,
  VoiceProfileResponse,
} from '@/lib/types';

const mockImportMutate = vi.fn();

vi.mock('@/hooks/use-threads-connection', () => ({
  useThreadsConnectionStatus: vi.fn(),
}));

vi.mock('@/features/voice-profile/hooks/use-voice-profile', () => ({
  useVoiceProfile: vi.fn(),
  useImportVoice: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { useThreadsConnectionStatus } from '@/hooks/use-threads-connection';
import {
  useImportVoice,
  useVoiceProfile,
} from '@/features/voice-profile/hooks/use-voice-profile';

function mockUseThreadsConnectionStatus(
  overrides: Record<string, unknown> = {},
) {
  vi.mocked(useThreadsConnectionStatus).mockReturnValue({
    data: {
      connected: true,
      username: 'alice',
    } satisfies ThreadsConnectionResponse,
    isLoading: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockUseVoiceProfile(overrides: Record<string, unknown> = {}) {
  vi.mocked(useVoiceProfile).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockUseImportVoice(overrides: Record<string, unknown> = {}) {
  vi.mocked(useImportVoice).mockReturnValue({
    mutate: mockImportMutate,
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const MOCK_STYLE_FINGERPRINT: StyleFingerprint = {
  tonality: 'Direct, first-person, casual but analytical.',
  avgLength: 240,
  openingPatterns: ['I think', 'Tried'],
  signaturePhrases: ['the constraint is the feature'],
  emojiDensity: 0.05,
  hashtagUsage: 0,
};

const MOCK_VOICE_PROFILE: VoiceProfileResponse = {
  id: 'vp-1',
  userId: 'u-1',
  source: 'threads_import',
  sampleCount: 25,
  styleFingerprint: MOCK_STYLE_FINGERPRINT,
  referenceSamples: [],
  createdAt: '2026-04-15T00:00:00.000Z',
  updatedAt: '2026-04-15T00:00:00.000Z',
};

const CHILDREN_TEXT = 'Protected post-draft UI';

function renderGate() {
  return render(
    <PostFlowVoiceGate>
      <div>{CHILDREN_TEXT}</div>
    </PostFlowVoiceGate>,
  );
}

describe('PostFlowVoiceGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseThreadsConnectionStatus();
    mockUseVoiceProfile();
    mockUseImportVoice();
  });

  describe('loading state', () => {
    it('renders a busy skeleton section when connection is loading', () => {
      mockUseThreadsConnectionStatus({ data: undefined, isLoading: true });
      const { container } = renderGate();

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-busy', 'true');
      expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('renders a busy skeleton section when profile is loading', () => {
      mockUseVoiceProfile({ isLoading: true });
      const { container } = renderGate();

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-busy', 'true');
    });

    it('does not render children while loading', () => {
      mockUseThreadsConnectionStatus({ data: undefined, isLoading: true });
      renderGate();

      expect(screen.queryByText(CHILDREN_TEXT)).not.toBeInTheDocument();
    });

    it('does not render the integrations link or import button while loading', () => {
      mockUseVoiceProfile({ isLoading: true });
      renderGate();

      expect(
        screen.queryByRole('link', { name: /go to integrations/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /import voice from threads/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders the generic error alert when connection query fails', () => {
      mockUseThreadsConnectionStatus({
        data: undefined,
        error: new Error('Network down'),
      });
      renderGate();

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to load voice setup. Please refresh the page.',
      );
    });

    it('renders the generic error alert when profile query fails', () => {
      mockUseVoiceProfile({ error: new Error('Profile fetch failed') });
      renderGate();

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to load voice setup. Please refresh the page.',
      );
    });

    it('does not render children when an error is present', () => {
      mockUseVoiceProfile({ error: new Error('boom') });
      renderGate();

      expect(screen.queryByText(CHILDREN_TEXT)).not.toBeInTheDocument();
    });

    it('does not leak the underlying error message to the user', () => {
      mockUseThreadsConnectionStatus({
        data: undefined,
        error: new Error('Very specific internal error'),
      });
      renderGate();

      expect(
        screen.queryByText(/very specific internal error/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('threads not connected', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: false,
          username: null,
        } satisfies ThreadsConnectionResponse,
      });
    });

    it('renders the Connect Threads first heading', () => {
      renderGate();

      expect(
        screen.getByRole('heading', { name: /connect threads first/i }),
      ).toBeInTheDocument();
    });

    it('renders the integrations link pointing to /integrations', () => {
      renderGate();

      const link = screen.getByRole('link', { name: /go to integrations/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/integrations');
    });

    it('also renders this state when the connection query returns undefined data', () => {
      mockUseThreadsConnectionStatus({ data: undefined });
      renderGate();

      expect(
        screen.getByRole('link', { name: /go to integrations/i }),
      ).toBeInTheDocument();
    });

    it('does not render the import button or children', () => {
      renderGate();

      expect(
        screen.queryByRole('button', { name: /import voice from threads/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(CHILDREN_TEXT)).not.toBeInTheDocument();
    });
  });

  describe('connected but no voice profile', () => {
    beforeEach(() => {
      mockUseVoiceProfile({ data: null });
    });

    it('renders the Import your voice heading and guidance copy', () => {
      renderGate();

      expect(
        screen.getByRole('heading', { name: /import your voice/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /one-time step\. we read your recent threads posts so the hooks we suggest sound like you\./i,
        ),
      ).toBeInTheDocument();
    });

    it('renders the Import voice from Threads button', () => {
      renderGate();

      expect(
        screen.getByRole('button', { name: /import voice from threads/i }),
      ).toBeInTheDocument();
    });

    it('calls importMutation.mutate when the Import voice button is clicked', async () => {
      renderGate();

      await userEvent.click(
        screen.getByRole('button', { name: /import voice from threads/i }),
      );

      expect(mockImportMutate).toHaveBeenCalledTimes(1);
    });

    it('shows Importing... loading text and disables the button while pending', () => {
      mockUseImportVoice({ isPending: true });
      renderGate();

      const button = screen.getByRole('button', { name: /importing/i });
      expect(button).toBeDisabled();
    });

    it('displays the import error message when the mutation has errored', () => {
      mockUseImportVoice({
        isError: true,
        error: new Error('Threads API rejected the request'),
      });
      renderGate();

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Threads API rejected the request',
      );
    });

    it('does not render children in this state', () => {
      renderGate();

      expect(screen.queryByText(CHILDREN_TEXT)).not.toBeInTheDocument();
    });

    it('does not render the integrations link', () => {
      renderGate();

      expect(
        screen.queryByRole('link', { name: /go to integrations/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('voice profile present', () => {
    beforeEach(() => {
      mockUseVoiceProfile({ data: MOCK_VOICE_PROFILE });
    });

    it('renders the provided children', () => {
      renderGate();

      expect(screen.getByText(CHILDREN_TEXT)).toBeInTheDocument();
    });

    it('does not render the integrations link or import button', () => {
      renderGate();

      expect(
        screen.queryByRole('link', { name: /go to integrations/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /import voice from threads/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render an error alert', () => {
      renderGate();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
