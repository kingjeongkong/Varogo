import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from './SignupForm';

const mockSignupMutate = vi.fn();

vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/use-auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUseAuth(overrides: Record<string, any> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    loginMutation: { mutate: vi.fn(), isPending: false, error: null },
    signupMutation: { mutate: mockSignupMutate, isPending: false, error: null },
    logoutMutation: { mutate: vi.fn(), isPending: false, error: null },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth();
  });

  describe('rendering', () => {
    it('renders name, email and password fields', () => {
      render(<SignupForm />);
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<SignupForm />);
      expect(
        screen.getByRole('button', { name: /sign up/i }),
      ).toBeInTheDocument();
    });

    it('does not show validation errors on initial render', () => {
      render(<SignupForm />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows email validation error when submitting with no email', async () => {
      render(<SignupForm />);
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
      expect(
        await screen.findByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    it('shows email validation error when email format is invalid', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
      expect(
        await screen.findByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is too short', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/email/i), 'valid@email.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'short');
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
      expect(
        await screen.findByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is empty', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/email/i), 'valid@email.com');
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
      expect(
        await screen.findByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });

    it('does not call signupMutation when form is invalid', async () => {
      render(<SignupForm />);
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
      await screen.findByText(/please enter a valid email/i);
      expect(mockSignupMutate).not.toHaveBeenCalled();
    });
  });

  describe('valid submission', () => {
    it('calls signupMutation.mutate with email and password when name is omitted', async () => {
      render(<SignupForm />);
      await userEvent.type(
        screen.getByLabelText(/email/i),
        'newuser@example.com',
      );
      await userEvent.type(
        screen.getByLabelText(/password/i),
        'securepassword',
      );
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
      expect(mockSignupMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password: 'securepassword',
        }),
      );
    });

    it('calls signupMutation.mutate with name when name is provided', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/name/i), 'Alice');
      await userEvent.type(
        screen.getByLabelText(/email/i),
        'alice@example.com',
      );
      await userEvent.type(
        screen.getByLabelText(/password/i),
        'securepassword',
      );
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
      expect(mockSignupMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice',
          email: 'alice@example.com',
          password: 'securepassword',
        }),
      );
    });
  });

  describe('loading state', () => {
    it('disables submit button while isPending is true', () => {
      mockUseAuth({
        signupMutation: {
          mutate: mockSignupMutate,
          isPending: true,
          error: null,
        },
      });
      render(<SignupForm />);
      expect(screen.getByRole('button', { name: /signing up/i })).toBeDisabled();
    });

    it('shows loading text while isPending is true', () => {
      mockUseAuth({
        signupMutation: {
          mutate: mockSignupMutate,
          isPending: true,
          error: null,
        },
      });
      render(<SignupForm />);
      expect(
        screen.getByRole('button', { name: /signing up/i }),
      ).toBeInTheDocument();
    });
  });

  describe('api error', () => {
    it('displays error message when mutation returns an error', () => {
      mockUseAuth({
        signupMutation: {
          mutate: mockSignupMutate,
          isPending: false,
          error: new Error('Email already in use'),
        },
      });
      render(<SignupForm />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Email already in use',
      );
    });
  });
});
