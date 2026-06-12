import Link from 'next/link';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return (
    <AuthPageLayout
      title="Varogo"
      subtitle="Log in to start your marketing strategy"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:text-primary-hover font-medium">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthPageLayout>
  );
}
