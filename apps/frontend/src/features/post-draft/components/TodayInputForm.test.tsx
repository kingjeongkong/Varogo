import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayInputForm } from './TodayInputForm';
import type { PostDraftResponse } from '@/lib/types';

const mockCreateMutate = vi.fn();

vi.mock('../hooks/use-post-draft', () => ({
  useCreatePostDraft: vi.fn(),
}));

import { useCreatePostDraft } from '../hooks/use-post-draft';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUseCreatePostDraft(overrides: Record<string, any> = {}) {
  vi.mocked(useCreatePostDraft).mockReturnValue({
    mutate: mockCreateMutate,
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const FIXTURE_DRAFT: PostDraftResponse = {
  id: 'draft-1',
  productId: 'prod-1',
  todayInput: 'hit 1000 users',
  body: '',
  status: 'draft',
  selectedHookId: null,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  hooks: [
    { id: 'hook-1', text: 'Story hook', angleLabel: 'Story', selected: false },
    { id: 'hook-2', text: 'Data hook', angleLabel: 'Data', selected: false },
    {
      id: 'hook-3',
      text: 'Contrarian hook',
      angleLabel: 'Contrarian',
      selected: false,
    },
  ],
};

describe('TodayInputForm', () => {
  const onCreated = vi.fn();
  const confirmSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreatePostDraft();
    confirmSpy.mockReturnValue(true);
    window.confirm = confirmSpy;
  });

  describe('rendering', () => {
    it('renders the heading, textarea, and submit button', () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      expect(
        screen.getByRole('heading', {
          name: /what do you want to share today/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/today's context/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /generate hooks/i }),
      ).toBeInTheDocument();
    });

    it('renders the initial character counter as 0 / 500', () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      expect(screen.getByText('0 / 500')).toBeInTheDocument();
    });

    it('does not show an alert on initial render', () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('character counter', () => {
    it('updates as the user types', async () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.type(
        screen.getByLabelText(/today's context/i),
        'hello',
      );

      expect(screen.getByText('5 / 500')).toBeInTheDocument();
    });
  });

  describe('submit with content', () => {
    it('does not call window.confirm when todayInput has text', async () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.type(
        screen.getByLabelText(/today's context/i),
        'hit 1000 users',
      );
      await userEvent.click(
        screen.getByRole('button', { name: /generate hooks/i }),
      );

      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('calls mutate with productId and trimmed todayInput', async () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.type(
        screen.getByLabelText(/today's context/i),
        '  hit 1000 users  ',
      );
      await userEvent.click(
        screen.getByRole('button', { name: /generate hooks/i }),
      );

      expect(mockCreateMutate).toHaveBeenCalledTimes(1);
      expect(mockCreateMutate).toHaveBeenCalledWith(
        { productId: 'prod-1', todayInput: 'hit 1000 users' },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('invokes onCreated with the draft when mutate onSuccess fires', async () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.type(
        screen.getByLabelText(/today's context/i),
        'hit 1000 users',
      );
      await userEvent.click(
        screen.getByRole('button', { name: /generate hooks/i }),
      );

      const [, options] = mockCreateMutate.mock.calls[0];
      options.onSuccess(FIXTURE_DRAFT);

      expect(onCreated).toHaveBeenCalledWith(FIXTURE_DRAFT);
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
  });

  describe('submit with empty input (confirm flow)', () => {
    it('calls window.confirm when todayInput is empty', async () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.click(
        screen.getByRole('button', { name: /generate hooks/i }),
      );

      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });

    it('calls window.confirm when todayInput is whitespace-only', async () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.type(
        screen.getByLabelText(/today's context/i),
        '   ',
      );
      await userEvent.click(
        screen.getByRole('button', { name: /generate hooks/i }),
      );

      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });

    it('does not call mutate when user cancels the confirm dialog', async () => {
      confirmSpy.mockReturnValue(false);
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.click(
        screen.getByRole('button', { name: /generate hooks/i }),
      );

      expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it('calls mutate with undefined todayInput when user accepts the confirm dialog', async () => {
      confirmSpy.mockReturnValue(true);
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      await userEvent.click(
        screen.getByRole('button', { name: /generate hooks/i }),
      );

      expect(mockCreateMutate).toHaveBeenCalledTimes(1);
      expect(mockCreateMutate).toHaveBeenCalledWith(
        { productId: 'prod-1', todayInput: undefined },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });

  describe('loading state', () => {
    it('disables the submit button and shows loading text while pending', () => {
      mockUseCreatePostDraft({ isPending: true });
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      const button = screen.getByRole('button', {
        name: /generating hooks/i,
      });
      expect(button).toBeDisabled();
    });
  });

  describe('api error', () => {
    it('renders an alert with the mutation error message', () => {
      mockUseCreatePostDraft({
        isError: true,
        error: new Error('Hook generation failed'),
      });
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Hook generation failed',
      );
    });

    it('does not render an alert when there is no error', () => {
      render(<TodayInputForm productId="prod-1" onCreated={onCreated} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
