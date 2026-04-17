import Link from 'next/link';

export default function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="bg-surface-elevated border-y border-border"
    >
      <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        <h2
          id="final-cta-heading"
          className="font-heading font-bold text-text-primary text-3xl sm:text-4xl"
        >
          Stop shipping into silence.
        </h2>
        <p className="mt-3 text-base text-text-secondary max-w-xl">
          Start with a free product analysis.
        </p>

        <Link
          href="/signup"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium text-white bg-primary hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] transition-all duration-200"
        >
          Start free →
        </Link>

        <p className="mt-6 text-xs text-text-muted">
          Review every draft before it goes live. You&rsquo;re always in
          control.
        </p>
      </div>
    </section>
  );
}
