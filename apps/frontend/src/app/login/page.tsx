import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage() {
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
            Varogo
          </h1>
          <p className="mt-2 text-base text-text-muted">
            로그인하여 마케팅 전략을 시작하세요
          </p>
        </div>
        <div className="glass-card p-8">
          <LoginForm />
          <p className="mt-6 text-center text-base text-text-muted">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-primary hover:text-primary-hover font-medium"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
