import { ArrowRight, ArrowDown, Check } from 'lucide-react';

const pastPosts = [
  "I thought this would take a day. It took a week.",
  "Shipping is easy. Maintenance is hard.",
];

const voiceTraits = [
  'Reflective',
  'Builder-focused',
  'Short sentences',
  'Shares lessons learned',
];

const newDraftStanzas = [
  ["I finally shipped CSV export today."],
  ["I thought it would take an afternoon.", "It ended up taking most of the week."],
  ["Software always finds new edge cases."],
  ["It's live now."],
];

export default function VoiceProfile() {
  return (
    <section
      aria-labelledby="voice-profile-heading"
      className="bg-surface-elevated border-y border-border"
    >
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2
            id="voice-profile-heading"
            className="font-heading font-bold text-text-primary text-3xl sm:text-4xl"
          >
            Sounds like you.{' '}
            <span className="text-text-muted">Not AI.</span>
          </h2>
          <p className="mt-3 text-base text-text-secondary max-w-xl mx-auto">
            Varogo learns from your past posts to capture your voice — so every
            draft sounds like something you&rsquo;d actually write.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-3">
          {/* Step 1: Past posts */}
          <div className="glass-card p-6 flex-1">
            <p className="text-xs font-medium text-text-muted mb-4 uppercase tracking-wide">
              Your past posts
            </p>
            <ul className="flex flex-col gap-3">
              {pastPosts.map((post) => (
                <li
                  key={post}
                  className="text-sm text-text-secondary border-l-2 border-border pl-3 leading-relaxed"
                >
                  {post}
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center lg:mt-12 shrink-0">
            <ArrowDown aria-hidden="true" className="lg:hidden w-5 h-5 text-text-muted" />
            <ArrowRight aria-hidden="true" className="hidden lg:block w-5 h-5 text-text-muted" />
          </div>

          {/* Step 2: Voice profile */}
          <div className="glass-card p-6 flex-1">
            <p className="text-xs font-medium text-text-muted mb-4 uppercase tracking-wide">
              Voice profile
            </p>
            <ul className="flex flex-col gap-2.5">
              {voiceTraits.map((trait) => (
                <li key={trait} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />
                  {trait}
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center lg:mt-12 shrink-0">
            <ArrowDown aria-hidden="true" className="lg:hidden w-5 h-5 text-text-muted" />
            <ArrowRight aria-hidden="true" className="hidden lg:block w-5 h-5 text-text-muted" />
          </div>

          {/* Step 3: New draft */}
          <div className="glass-card p-6 flex-1 border-primary/30">
            <p className="text-xs font-medium text-primary mb-4 uppercase tracking-wide">
              New draft
            </p>
            <div className="flex flex-col gap-2">
              {newDraftStanzas.map((stanza, i) => (
                <p key={i} className="text-sm text-text-primary leading-snug">
                  {stanza.map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < stanza.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-text-muted text-center">
          No Threads posts yet? You can describe your style manually to get started.
        </p>
      </div>
    </section>
  );
}
