import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  type RenderOptions,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { ThreadsTile } from './ThreadsTile';

function render(ui: React.ReactElement, options?: RenderOptions) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <RadixTooltip.Provider delayDuration={200}>
        {children}
      </RadixTooltip.Provider>
    ),
    ...options,
  });
}
import type {
  StyleFingerprint,
  ThreadsConnectionResponse,
  VoiceProfileResponse,
} from '@/lib/types';

const mockConnectMutate = vi.fn();
const mockDisconnectMutate = vi.fn();
const mockImportMutate = vi.fn();

vi.mock('@/features/threads', () => ({
  useThreadsConnectionStatus: vi.fn(),
  useThreadsConnect: vi.fn(),
  useThreadsDisconnect: vi.fn(),
}));

vi.mock('@/features/voice-profile', () => ({
  useVoiceProfile: vi.fn(),
  useImportVoice: vi.fn(),
}));

import {
  useThreadsConnect,
  useThreadsConnectionStatus,
  useThreadsDisconnect,
} from '@/features/threads';
import { useImportVoice, useVoiceProfile } from '@/features/voice-profile';

function mockUseThreadsConnectionStatus(
  overrides: Record<string, unknown> = {},
) {
  vi.mocked(useThreadsConnectionStatus).mockReturnValue({
    data: {
      connected: false,
      username: null,
    } satisfies ThreadsConnectionResponse,
    isLoading: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockUseThreadsConnect(overrides: Record<string, unknown> = {}) {
  vi.mocked(useThreadsConnect).mockReturnValue({
    mutate: mockConnectMutate,
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockUseThreadsDisconnect(overrides: Record<string, unknown> = {}) {
  vi.mocked(useThreadsDisconnect).mockReturnValue({
    mutate: mockDisconnectMutate,
    isPending: false,
    isError: false,
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

describe('ThreadsTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseThreadsConnectionStatus();
    mockUseThreadsConnect();
    mockUseThreadsDisconnect();
    mockUseVoiceProfile();
    mockUseImportVoice();
  });

  describe('loading state', () => {
    it('renders an aria-busy section with a skeleton when connection is loading', () => {
      mockUseThreadsConnectionStatus({ data: undefined, isLoading: true });
      const { container } = render(<ThreadsTile />);

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-busy', 'true');
      expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('does not render any Connect or Disconnect button while loading', () => {
      mockUseThreadsConnectionStatus({ data: undefined, isLoading: true });
      render(<ThreadsTile />);

      expect(
        screen.queryByRole('button', { name: /connect account/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /disconnect/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render the Voice section while loading', () => {
      mockUseThreadsConnectionStatus({ data: undefined, isLoading: true });
      render(<ThreadsTile />);

      expect(screen.queryByText('Voice')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /about voice/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('connection error', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: undefined,
        error: new Error('Network down'),
      });
    });

    it('renders an Alert asking the user to refresh the page', () => {
      render(<ThreadsTile />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to load connection status. Please refresh the page.',
      );
    });

    it('does not render the Voice section', () => {
      render(<ThreadsTile />);

      expect(screen.queryByText('Voice')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /about voice/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('threads not connected', () => {
    it('renders the Threads heading', () => {
      render(<ThreadsTile />);

      expect(
        screen.getByRole('heading', { name: /threads/i }),
      ).toBeInTheDocument();
    });

    it('renders the Connect Account button', () => {
      render(<ThreadsTile />);

      expect(
        screen.getByRole('button', { name: /connect account/i }),
      ).toBeInTheDocument();
    });

    it('calls connectMutation.mutate when Connect Account is clicked', async () => {
      render(<ThreadsTile />);

      await userEvent.click(
        screen.getByRole('button', { name: /connect account/i }),
      );

      expect(mockConnectMutate).toHaveBeenCalledTimes(1);
    });

    it('shows "Connecting..." loading text when the connect mutation is pending', () => {
      mockUseThreadsConnect({ isPending: true });
      render(<ThreadsTile />);

      const button = screen.getByRole('button', { name: /connecting/i });
      expect(button).toBeDisabled();
    });

    it('shows a connect-error Alert when the connect mutation has errored', () => {
      mockUseThreadsConnect({ isError: true });
      render(<ThreadsTile />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to connect account. Please try again.',
      );
    });

    it('does not render the Voice label or About Voice tooltip trigger', () => {
      render(<ThreadsTile />);

      expect(screen.queryByText('Voice')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /about voice/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render the Import voice button', () => {
      render(<ThreadsTile />);

      expect(
        screen.queryByRole('button', { name: /import voice/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('threads connected', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: true,
          username: 'alice',
        } satisfies ThreadsConnectionResponse,
      });
    });

    it('renders "@alice connected" when username is present', () => {
      render(<ThreadsTile />);

      expect(screen.getByText('@alice connected')).toBeInTheDocument();
    });

    it('falls back to "Connected" when username is null', () => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: true,
          username: null,
        } satisfies ThreadsConnectionResponse,
      });
      render(<ThreadsTile />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('renders the Disconnect button', () => {
      render(<ThreadsTile />);

      expect(
        screen.getByRole('button', { name: /^disconnect$/i }),
      ).toBeInTheDocument();
    });

    it('calls disconnectMutation.mutate when Disconnect is clicked', async () => {
      render(<ThreadsTile />);

      await userEvent.click(
        screen.getByRole('button', { name: /^disconnect$/i }),
      );

      expect(mockDisconnectMutate).toHaveBeenCalledTimes(1);
    });

    it('shows "Disconnecting..." loading text when the disconnect mutation is pending', () => {
      mockUseThreadsDisconnect({ isPending: true });
      render(<ThreadsTile />);

      const button = screen.getByRole('button', { name: /disconnecting/i });
      expect(button).toBeDisabled();
    });

    it('shows a disconnect-error Alert when the disconnect mutation has errored', () => {
      mockUseThreadsDisconnect({ isError: true });
      render(<ThreadsTile />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to disconnect account. Please try again.',
      );
    });

    it('renders the Voice label', () => {
      render(<ThreadsTile />);

      expect(screen.getByText('Voice')).toBeInTheDocument();
    });

    it('renders the About Voice tooltip trigger button', () => {
      render(<ThreadsTile />);

      expect(
        screen.getByRole('button', { name: /about voice/i }),
      ).toBeInTheDocument();
    });
  });

  describe('voice: no profile', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: true,
          username: 'alice',
        } satisfies ThreadsConnectionResponse,
      });
      mockUseVoiceProfile({ data: null });
    });

    it('renders the Import voice button', () => {
      render(<ThreadsTile />);

      expect(
        screen.getByRole('button', { name: /import voice/i }),
      ).toBeInTheDocument();
    });

    it('calls importMutation.mutate when Import voice is clicked', async () => {
      render(<ThreadsTile />);

      await userEvent.click(
        screen.getByRole('button', { name: /import voice/i }),
      );

      expect(mockImportMutate).toHaveBeenCalledTimes(1);
    });

    it('shows "Importing..." loading text when the import mutation is pending', () => {
      mockUseImportVoice({ isPending: true });
      render(<ThreadsTile />);

      const button = screen.getByRole('button', { name: /importing/i });
      expect(button).toBeDisabled();
    });

    it('renders an inline Alert with the error message when the import mutation has errored', () => {
      mockUseImportVoice({
        isError: true,
        error: new Error('Threads API rejected the request'),
      });
      render(<ThreadsTile />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Threads API rejected the request',
      );
    });

    it('does not render the "Imported" label', () => {
      render(<ThreadsTile />);

      expect(
        screen.queryByLabelText(/voice imported/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('voice: profile exists', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: true,
          username: 'alice',
        } satisfies ThreadsConnectionResponse,
      });
      mockUseVoiceProfile({ data: MOCK_VOICE_PROFILE });
    });

    it('renders the "Imported" label with accessible name "Voice imported"', () => {
      render(<ThreadsTile />);

      const imported = screen.getByLabelText('Voice imported');
      expect(imported).toBeInTheDocument();
      expect(imported).toHaveTextContent(/imported/i);
    });

    it('does not render the Import voice button', () => {
      render(<ThreadsTile />);

      expect(
        screen.queryByRole('button', { name: /import voice/i }),
      ).not.toBeInTheDocument();
    });

    it('does not display sampleCount or tonality details', () => {
      render(<ThreadsTile />);

      expect(screen.queryByText(/25 posts analyzed/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(MOCK_STYLE_FINGERPRINT.tonality),
      ).not.toBeInTheDocument();
    });
  });

  describe('voice: loading', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: true,
          username: 'alice',
        } satisfies ThreadsConnectionResponse,
      });
      mockUseVoiceProfile({ isLoading: true });
    });

    it('renders a skeleton inside the voice row', () => {
      const { container } = render(<ThreadsTile />);

      expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });

    it('does not render the Import voice button or Imported label', () => {
      render(<ThreadsTile />);

      expect(
        screen.queryByRole('button', { name: /import voice/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/voice imported/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('voice: error', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: true,
          username: 'alice',
        } satisfies ThreadsConnectionResponse,
      });
      mockUseVoiceProfile({ error: new Error('Profile fetch failed') });
    });

    it('renders an Alert asking the user to refresh the page', () => {
      render(<ThreadsTile />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to load voice profile. Please refresh the page.',
      );
    });

    it('does not render the Import voice button or Imported label', () => {
      render(<ThreadsTile />);

      expect(
        screen.queryByRole('button', { name: /import voice/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/voice imported/i),
      ).not.toBeInTheDocument();
    });
  });
});
