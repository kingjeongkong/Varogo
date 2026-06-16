import Image from 'next/image';
import type { ReactNode } from 'react';

interface AuthPageLayoutProps {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthPageLayout({ title, subtitle, footer, children }: AuthPageLayoutProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="w-full max-w-sm animate-slide-up relative">
        <div className="mb-10 text-center">
          <Image
            src="/logo.png"
            alt="Varogo"
            width={64}
            height={64}
            className="mx-auto mb-5 animate-glow"
            priority
          />
          <h1 className="text-2xl font-bold text-text-primary font-heading tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-base text-text-muted">{subtitle}</p>
        </div>
        <div className="glass-card p-8">
          {children}
          {footer && (
            <p className="mt-6 text-center text-base text-text-muted">{footer}</p>
          )}
        </div>
      </div>
    </main>
  );
}
