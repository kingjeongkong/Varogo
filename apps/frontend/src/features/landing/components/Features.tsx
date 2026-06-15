import { Mic2, Package, Globe, GitBranch } from 'lucide-react';

const features = [
  {
    Icon: Mic2,
    title: 'Writes in your voice',
    description: 'Learns from your Threads history. Every draft starts from how you actually write.',
  },
  {
    Icon: Package,
    title: 'Understands your product',
    description: 'Reads your landing page and product context before drafting anything.',
  },
  {
    Icon: Globe,
    title: 'Researches the web',
    description: 'An AI agent searches across the web for context around your product before every draft.',
  },
  {
    Icon: GitBranch,
    title: 'Multiple angles, every time',
    description: 'Get 3 different post directions per run — not the same template repeated.',
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
