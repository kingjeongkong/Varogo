import Link from 'next/link';

export default function LandingHeader() {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
            <span className="text-primary font-heading font-bold text-sm">
              V
            </span>
          </div>
          <span className="font-heading font-bold text-text-primary text-lg tracking-tight">
            Varogo
          </span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Primary">
          <Link
            href="/login"
            className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
