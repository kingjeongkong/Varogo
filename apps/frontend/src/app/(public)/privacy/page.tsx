import type { Metadata } from 'next';
import LandingHeader from '@/components/layout/LandingHeader';

export const metadata: Metadata = {
  title: 'Privacy Policy | Varogo',
  description:
    'Privacy policy describing how Varogo collects, uses, and protects user data, including data obtained through the Threads API.',
};

const LAST_UPDATED = 'April 15, 2026';
const CONTACT_EMAIL = 'wjdqls9223@gmail.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-2 mb-10">
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            Privacy Policy
          </h1>
          <p className="text-sm text-text-muted">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="glass-card p-8 space-y-8 text-sm text-text-primary leading-relaxed">
          <section className="space-y-3">
            <p>
              Varogo (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a marketing
              strategy service for indie developers. This policy explains what
              data we collect when you connect your Threads account to Varogo,
              how we use it, and how you can delete it. By using Varogo, you
              agree to the practices described below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              1. Data We Collect
            </h2>
            <p>
              When you sign up for Varogo, we collect the email address and
              password you provide. When you connect your Threads account
              through Meta&rsquo;s OAuth flow, we additionally receive and
              store:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-text-muted">
              <li>Your Threads user ID</li>
              <li>Your Threads username</li>
              <li>
                An OAuth access token issued by Meta, along with its expiry
                timestamp
              </li>
            </ul>
            <p>
              We do not collect your Threads password, private messages,
              follower lists, or any other profile data beyond what is listed
              above.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              2. How We Use Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-text-muted">
              <li>
                <span className="text-text-primary">Authentication:</span>{' '}
                identifying your Threads account and showing your connection
                status inside Varogo.
              </li>
              <li>
                <span className="text-text-primary">
                  Publishing on your behalf:
                </span>{' '}
                posting content you have explicitly reviewed and chosen to
                publish to your own Threads account.
              </li>
            </ul>
            <p>
              We do not post, like, follow, or take any other action on your
              Threads account without an explicit request initiated by you in
              the Varogo interface.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              3. How We Store and Protect Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-text-muted">
              <li>
                Threads access tokens are encrypted at rest using AES-256-GCM
                before being written to our database. Plaintext tokens are
                never persisted.
              </li>
              <li>
                All traffic between your browser, Varogo, and the Meta / Threads
                API is transmitted over HTTPS.
              </li>
              <li>
                Access to our production database is restricted to authorized
                maintainers.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              4. Data Sharing
            </h2>
            <p>
              We do not sell, rent, or share your personal data or your Threads
              data with third parties for their own marketing or analytical
              purposes. Your Threads access token is used exclusively by Varogo
              to call the official Meta / Threads API on your behalf.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              5. Data Retention and Deletion
            </h2>
            <ul className="list-disc pl-6 space-y-1 text-text-muted">
              <li>
                When you disconnect Threads from the{' '}
                <span className="text-text-primary">Integrations</span> page,
                your Threads user ID, username, and access token are
                immediately and permanently deleted from our database.
              </li>
              <li>
                When you delete your Varogo account, all associated data &mdash;
                including any Threads connection &mdash; is removed.
              </li>
              <li>
                You may also request deletion of your data at any time by
                emailing us at the address below. We will process verified
                requests within 30 days.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              6. Contact
            </h2>
            <p>
              For privacy questions or data deletion requests, contact us at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-accent underline hover:no-underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
