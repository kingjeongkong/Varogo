import Link from 'next/link';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/features/auth';

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm animate-slide-up relative">
        <div className="mb-10 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center animate-glow">
            <span className="text-primary font-heading font-bold text-xl">
              V
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-heading tracking-tight">
            Reset password
          </h1>
          <p className="mt-2 text-base text-text-muted">
            Enter your new password
          </p>
        </div>
        <div className="glass-card p-8">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
          <p className="mt-6 text-center text-base text-text-muted">
            Remember your password?{' '}
            <Link
              href="/login"
              className="text-primary hover:text-primary-hover font-medium"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
