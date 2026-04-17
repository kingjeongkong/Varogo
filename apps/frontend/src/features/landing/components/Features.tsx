import { Search, Compass, PenLine, Send } from 'lucide-react';

const features = [
  {
    Icon: Search,
    title: 'Deep product analysis',
    description:
      'AI reads your product and extracts positioning, target audience, and differentiators before writing anything.',
  },
  {
    Icon: Compass,
    title: 'Strategy, not just prompts',
    description:
      'A full plan — hook angle, campaign goal, content format, cadence. Drafts follow from it.',
  },
  {
    Icon: PenLine,
    title: 'Threads-native drafts',
    description:
      'Posts tuned for Threads — tone, length, and platform tips baked in.',
  },
  {
    Icon: Send,
    title: 'Connect and publish',
    description:
      'Connect your Threads account once. Review drafts and publish directly from Varogo.',
  },
];

export default function Features() {
  return (
    <section
      aria-labelledby="features-heading"
      className="max-w-5xl mx-auto px-6 py-24"
    >
      <div className="text-center mb-16">
        <h2
          id="features-heading"
          className="font-heading font-bold text-text-primary text-3xl sm:text-4xl"
        >
          Features
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          What makes Varogo different.
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map(({ Icon, title, description }) => (
          <li key={title} className="glass-card p-6">
            <Icon
              aria-hidden="true"
              className="w-6 h-6 text-primary"
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
      </ul>
    </section>
  );
}
