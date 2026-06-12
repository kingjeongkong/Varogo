import Link from 'next/link';
import { Suspense } from 'react';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { ResetPasswordForm } from '@/features/auth';

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout
      title="Reset password"
      subtitle="Enter your new password"
      footer={
        <>
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
            Log in
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageLayout>
  );
}
