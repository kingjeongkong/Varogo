import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceProfileSummary } from './VoiceProfileSummary';
import type {
  StyleFingerprint,
  ThreadsConnectionResponse,
  VoiceProfileResponse,
} from '@/lib/types';

const mockImportMutate = vi.fn();

vi.mock('@/hooks/use-threads-connection', () => ({
  useThreadsConnectionStatus: vi.fn(),
}));

vi.mock('../hooks/use-voice-profile', () => ({
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
import { useImportVoice, useVoiceProfile } from '../hooks/use-voice-profile';

function mockUseThreadsConnectionStatus(overrides: Record<string, unknown> = {}) {
  vi.mocked(useThreadsConnectionStatus).mockReturnValue({
    data: { connected: true, username: 'alice' } satisfies ThreadsConnectionResponse,
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

describe('VoiceProfileSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseThreadsConnectionStatus();
    mockUseVoiceProfile();
    mockUseImportVoice();
  });

  describe('loading state', () => {
    it('renders a busy skeleton section when connection is loading', () => {
      mockUseThreadsConnectionStatus({ data: undefined, isLoading: true });
      const { container } = render(<VoiceProfileSummary />);

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-busy', 'true');
      expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('renders a busy skeleton section when profile is loading', () => {
      mockUseVoiceProfile({ isLoading: true });
      const { container } = render(<VoiceProfileSummary />);

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-busy', 'true');
      expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('does not render the Connect Threads link or Import button while loading', () => {
      mockUseThreadsConnectionStatus({ data: undefined, isLoading: true });
      render(<VoiceProfileSummary />);

      expect(
        screen.queryByRole('link', { name: /connect threads/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /import voice/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders the generic error alert when connection query fails', () => {
      mockUseThreadsConnectionStatus({
        data: undefined,
        error: new Error('Network down'),
      });
      render(<VoiceProfileSummary />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to load voice profile. Please refresh the page.',
      );
    });

    it('renders the generic error alert when profile query fails', () => {
      mockUseVoiceProfile({ error: new Error('Profile fetch failed') });
      render(<VoiceProfileSummary />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to load voice profile. Please refresh the page.',
      );
    });

    it('does not leak the underlying error message to the user', () => {
      mockUseThreadsConnectionStatus({
        data: undefined,
        error: new Error('Very specific internal error'),
      });
      render(<VoiceProfileSummary />);

      expect(
        screen.queryByText(/very specific internal error/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('threads not connected', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: { connected: false, username: null } satisfies ThreadsConnectionResponse,
      });
    });

    it('renders the Connect Threads link pointing to /integrations', () => {
      render(<VoiceProfileSummary />);

      const link = screen.getByRole('link', { name: /connect threads/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/integrations');
    });

    it('shows the connect-your-Threads guidance copy', () => {
      render(<VoiceProfileSummary />);

      expect(
        screen.getByText(/connect your threads account to import your voice/i),
      ).toBeInTheDocument();
    });

    it('also renders this state when the connection query returns undefined data', () => {
      mockUseThreadsConnectionStatus({ data: undefined });
      render(<VoiceProfileSummary />);

      expect(
        screen.getByRole('link', { name: /connect threads/i }),
      ).toBeInTheDocument();
    });

    it('does not render the Import voice button', () => {
      render(<VoiceProfileSummary />);

      expect(
        screen.queryByRole('button', { name: /import voice/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('connected but no voice profile', () => {
    beforeEach(() => {
      mockUseVoiceProfile({ data: null });
    });

    it('renders the Import voice button and guidance copy', () => {
      render(<VoiceProfileSummary />);

      expect(
        screen.getByRole('button', { name: /import voice/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /import your voice from recent threads posts so drafts sound like you/i,
        ),
      ).toBeInTheDocument();
    });

    it('calls importMutation.mutate when the Import voice button is clicked', async () => {
      render(<VoiceProfileSummary />);

      await userEvent.click(
        screen.getByRole('button', { name: /import voice/i }),
      );

      expect(mockImportMutate).toHaveBeenCalledTimes(1);
    });

    it('shows "Importing..." loading text while the import mutation is pending', () => {
      mockUseImportVoice({ isPending: true });
      render(<VoiceProfileSummary />);

      const button = screen.getByRole('button', { name: /importing/i });
      expect(button).toBeDisabled();
    });

    it('displays the import error message when the mutation has errored', () => {
      mockUseImportVoice({
        isError: true,
        error: new Error('Threads API rejected the request'),
      });
      render(<VoiceProfileSummary />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Threads API rejected the request',
      );
    });

    it('does not render the error alert when no import error is present', () => {
      render(<VoiceProfileSummary />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not render the Connect Threads link', () => {
      render(<VoiceProfileSummary />);

      expect(
        screen.queryByRole('link', { name: /connect threads/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('voice profile present', () => {
    beforeEach(() => {
      mockUseVoiceProfile({ data: MOCK_VOICE_PROFILE });
    });

    it('renders the sample count summary', () => {
      render(<VoiceProfileSummary />);

      expect(screen.getByText('25 posts analyzed')).toBeInTheDocument();
    });

    it('renders the tonality from the style fingerprint', () => {
      render(<VoiceProfileSummary />);

      expect(
        screen.getByText('Direct, first-person, casual but analytical.'),
      ).toBeInTheDocument();
    });

    it('renders the "Your Voice" heading', () => {
      render(<VoiceProfileSummary />);

      expect(
        screen.getByRole('heading', { name: /your voice/i }),
      ).toBeInTheDocument();
    });

    it('does not render the Import voice button or Connect Threads link', () => {
      render(<VoiceProfileSummary />);

      expect(
        screen.queryByRole('button', { name: /import voice/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /connect threads/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render an error alert', () => {
      render(<VoiceProfileSummary />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
