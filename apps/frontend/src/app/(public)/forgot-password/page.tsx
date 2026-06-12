import Link from 'next/link';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { ForgotPasswordForm } from '@/features/auth';

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout
      title="Forgot password?"
      subtitle="Enter your email to receive a reset link"
      footer={
        <>
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
            Log in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthPageLayout>
  );
}
