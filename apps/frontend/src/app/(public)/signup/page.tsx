import Link from 'next/link';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { SignupForm } from '@/features/auth';

export default function SignupPage() {
  return (
    <AuthPageLayout
      title="Varogo"
      subtitle="Create an account to start your marketing strategy"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthPageLayout>
  );
}
