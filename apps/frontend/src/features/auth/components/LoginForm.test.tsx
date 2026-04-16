import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

const mockLoginMutate = vi.fn();

vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/use-auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUseAuth(overrides: Record<string, any> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    loginMutation: { mutate: mockLoginMutate, isPending: false, error: null },
    signupMutation: { mutate: vi.fn(), isPending: false, error: null },
    logoutMutation: { mutate: vi.fn(), isPending: false, error: null },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth();
  });

  describe('rendering', () => {
    it('renders email and password fields', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<LoginForm />);
      expect(
        screen.getByRole('button', { name: /log in/i }),
      ).toBeInTheDocument();
    });

    it('does not show validation errors on initial render', () => {
      render(<LoginForm />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows email validation error when submitting with no email', async () => {
      render(<LoginForm />);
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
      expect(
        await screen.findByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    it('shows email validation error when email format is invalid', async () => {
      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
      expect(
        await screen.findByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is too short', async () => {
      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText(/email/i), 'valid@email.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'short');
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
      expect(
        await screen.findByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is empty', async () => {
      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText(/email/i), 'valid@email.com');
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
      expect(
        await screen.findByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });

    it('does not call loginMutation when form is invalid', async () => {
      render(<LoginForm />);
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
      await screen.findByText(/please enter a valid email/i);
      expect(mockLoginMutate).not.toHaveBeenCalled();
    });
  });

  describe('valid submission', () => {
    it('calls loginMutation.mutate with email and password on valid submit', async () => {
      render(<LoginForm />);
      await userEvent.type(
        screen.getByLabelText(/email/i),
        'user@example.com',
      );
      await userEvent.type(screen.getByLabelText(/password/i), 'validpassword');
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));
      expect(mockLoginMutate).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'validpassword',
      });
    });
  });

  describe('loading state', () => {
    it('disables submit button while isPending is true', () => {
      mockUseAuth({
        loginMutation: {
          mutate: mockLoginMutate,
          isPending: true,
          error: null,
        },
      });
      render(<LoginForm />);
      expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
    });

    it('shows loading text while isPending is true', () => {
      mockUseAuth({
        loginMutation: {
          mutate: mockLoginMutate,
          isPending: true,
          error: null,
        },
      });
      render(<LoginForm />);
      expect(
        screen.getByRole('button', { name: /logging in/i }),
      ).toBeInTheDocument();
    });
  });

  describe('api error', () => {
    it('displays error message when mutation returns an error', () => {
      mockUseAuth({
        loginMutation: {
          mutate: mockLoginMutate,
          isPending: false,
          error: new Error('Invalid email or password'),
        },
      });
      render(<LoginForm />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid email or password',
      );
    });
  });
});
