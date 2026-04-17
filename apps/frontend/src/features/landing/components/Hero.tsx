import Link from 'next/link';

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden"
    >
      {/* Gradient glow overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% 0%, var(--pri-glow), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, var(--acc-dim), transparent 60%)',
        }}
      />

      <div className="max-w-5xl mx-auto px-6 min-h-[80vh] flex flex-col items-center justify-center text-center py-24">
        <h1
          id="hero-heading"
          className="font-heading font-bold text-text-primary text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight"
        >
          You shipped it.
          <br />
          Now the feed is silent.
        </h1>

        <p className="mt-6 text-lg text-text-secondary max-w-2xl">
          Marketing strategy and post drafts, built for indie developers on
          Threads.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-medium text-white bg-primary hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] transition-all duration-200"
          >
            Start free →
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-medium text-text-secondary border border-border bg-surface-elevated hover:border-border-hover hover:bg-surface-hover hover:text-text-primary active:scale-[0.97] transition-all duration-200"
          >
            See how it works
          </Link>
        </div>
      </div>
    </section>
  );
}
