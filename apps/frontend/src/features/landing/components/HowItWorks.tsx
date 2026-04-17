import { Sparkles, Target, Send } from 'lucide-react';

const steps = [
  {
    number: '01',
    Icon: Sparkles,
    title: 'Analyze',
    description:
      "Paste your product URL. AI reads what you built and who it's for.",
  },
  {
    number: '02',
    Icon: Target,
    title: 'Strategize',
    description:
      'Get a Threads marketing plan — tone, angles, posting cadence.',
  },
  {
    number: '03',
    Icon: Send,
    title: 'Draft & Ship',
    description:
      'Generate post drafts that match your strategy. Review, then publish.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="max-w-5xl mx-auto px-6 py-24 scroll-mt-20"
    >
      <div className="text-center mb-16">
        <h2
          id="how-it-works-heading"
          className="font-heading font-bold text-text-primary text-3xl sm:text-4xl"
        >
          How it works
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          From product URL to published post.
        </p>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map(({ number, Icon, title, description }) => (
          <li key={number} className="glass-card p-6">
            <div
              className="font-heading font-bold text-5xl text-primary/30"
              aria-hidden="true"
            >
              {number}
            </div>
            <Icon
              aria-hidden="true"
              className="mt-4 w-6 h-6 text-primary"
              strokeWidth={2}
            />
            <h3 className="mt-4 font-heading font-bold text-text-primary text-lg">
              {title}
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
