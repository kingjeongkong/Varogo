import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-text-primary text-sm tracking-tight">
            Varogo
          </span>
          <span className="text-xs text-text-muted">© 2026 Varogo</span>
        </div>
        <nav aria-label="Footer">
          <Link
            href="/privacy"
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
