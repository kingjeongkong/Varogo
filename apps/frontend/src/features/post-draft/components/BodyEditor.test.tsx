import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BodyEditor } from './BodyEditor';
import type { PostDraftResponse } from '@/lib/types';

const mockPublishMutate = vi.fn();

vi.mock('../hooks/use-post-draft', () => ({
  usePublishPostDraft: vi.fn(),
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

import { usePublishPostDraft } from '../hooks/use-post-draft';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUsePublishPostDraft(overrides: Record<string, any> = {}) {
  vi.mocked(usePublishPostDraft).mockReturnValue({
    mutate: mockPublishMutate,
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const DRAFT: PostDraftResponse = {
  id: 'draft-1',
  productId: 'prod-1',
  todayInput: 'hit 1000 users',
  body: 'Initial draft body content.',
  status: 'draft',
  selectedOptionId: 'option-2',
  publishedAt: null,
  threadsMediaId: null,
  permalink: null,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  options: [
    {
      id: 'option-1',
      text: 'Data angle body text',
      angleLabel: 'Data',
      selected: false,
    },
    {
      id: 'option-2',
      text: 'Story angle body text',
      angleLabel: 'Story',
      selected: true,
    },
    {
      id: 'option-3',
      text: 'Contrarian angle body text',
      angleLabel: 'Contrarian',
      selected: false,
    },
  ],
};

describe('BodyEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePublishPostDraft();
  });

  it('renders the Review your post heading', () => {
    render(<BodyEditor draft={DRAFT} />);

    expect(
      screen.getByRole('heading', { name: /review your post/i }),
    ).toBeInTheDocument();
  });

  it('renders the angle label of the selected option', () => {
    render(<BodyEditor draft={DRAFT} />);

    expect(screen.getByText('Story')).toBeInTheDocument();
  });

  it('renders textarea pre-populated with draft.body', () => {
    render(<BodyEditor draft={DRAFT} />);

    const textarea = screen.getByLabelText(/post body/i) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Initial draft body content.');
  });

  it('character counter shows body.length / 500', () => {
    render(<BodyEditor draft={DRAFT} />);

    expect(
      screen.getByText(`${DRAFT.body.length} / 500`),
    ).toBeInTheDocument();
  });

  it('counter updates when user types', async () => {
    render(<BodyEditor draft={DRAFT} />);

    const textarea = screen.getByLabelText(/post body/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'hello');

    await waitFor(() => {
      expect(screen.getByText('5 / 500')).toBeInTheDocument();
    });
  });

  it('counter shows over-limit styling (text-red-400) when body exceeds 500 chars', async () => {
    render(<BodyEditor draft={DRAFT} />);

    const textarea = screen.getByLabelText(/post body/i) as HTMLTextAreaElement;
    const overLimitBody = 'a'.repeat(501);
    await userEvent.clear(textarea);
    // Direct assignment via fireEvent-like path via userEvent is slow for 501 chars;
    // use paste for performance and correctness.
    await userEvent.click(textarea);
    await userEvent.paste(overLimitBody);

    await waitFor(() => {
      const counter = screen.getByText('501 / 500');
      expect(counter).toHaveClass('text-red-400');
    });
  });

  it('Publish button is disabled when body is empty', async () => {
    render(<BodyEditor draft={DRAFT} />);

    const textarea = screen.getByLabelText(/post body/i);
    await userEvent.clear(textarea);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /publish to threads/i }),
      ).toBeDisabled();
    });
  });

  it('Publish button is disabled when body exceeds 500 chars', async () => {
    render(<BodyEditor draft={DRAFT} />);

    const textarea = screen.getByLabelText(/post body/i);
    await userEvent.clear(textarea);
    await userEvent.click(textarea);
    await userEvent.paste('a'.repeat(501));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /publish to threads/i }),
      ).toBeDisabled();
    });
  });

  it('Publish button is disabled when mutation is pending', () => {
    mockUsePublishPostDraft({ isPending: true });
    render(<BodyEditor draft={DRAFT} />);

    expect(
      screen.getByRole('button', { name: /publishing/i }),
    ).toBeDisabled();
  });

  it('clicking Publish calls mutation.mutate with the current body', async () => {
    render(<BodyEditor draft={DRAFT} />);

    const textarea = screen.getByLabelText(/post body/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Edited body');

    await userEvent.click(
      screen.getByRole('button', { name: /publish to threads/i }),
    );

    expect(mockPublishMutate).toHaveBeenCalledTimes(1);
    expect(mockPublishMutate).toHaveBeenCalledWith({ body: 'Edited body' });
  });

  it('renders Alert with error message when mutation.isError', () => {
    mockUsePublishPostDraft({
      isError: true,
      error: new Error('Failed to publish'),
    });
    render(<BodyEditor draft={DRAFT} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to publish');
  });

  it('renders the user-friendly 409 conflict message in Alert when client translated it', () => {
    mockUsePublishPostDraft({
      isError: true,
      error: new Error(
        'This post is already published. Please refresh to see the latest version.',
      ),
    });
    render(<BodyEditor draft={DRAFT} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/already published/i);
    expect(alert).toHaveTextContent(/refresh/i);
  });

  it('Back to product link points to /product/<productId>/analysis', () => {
    render(<BodyEditor draft={DRAFT} />);

    const link = screen.getByRole('link', { name: /back to product/i });
    expect(link).toHaveAttribute('href', '/product/prod-1/analysis');
  });
});
