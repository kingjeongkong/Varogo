import { Link2, Mic2, CalendarDays, Send } from 'lucide-react';

const steps = [
  {
    number: '01',
    Icon: Link2,
    title: 'Add your product',
    description: 'Paste a URL. Varogo reads what you built.',
  },
  {
    number: '02',
    Icon: Mic2,
    title: 'Build your voice',
    description: 'Varogo learns how you write from your Threads posts.',
  },
  {
    number: '03',
    Icon: CalendarDays,
    title: "Tell it what's happening today",
    description: 'A launch, a fix, a lesson — give it context.',
  },
  {
    number: '04',
    Icon: Send,
    title: 'Review and publish',
    description: '3 drafts. Edit or publish straight to Threads.',
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

      <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
