import { Link } from 'react-router-dom';
import { AccessibilityBar } from '../components/a11y/AccessibilityBar';
import { TTSButton } from '../components/a11y/TTSButton';
import { IconLabel } from '../components/a11y/IconLabel';

const FEATURES = [
  {
    icon: '🗣️',
    title: 'Sanayan sa Pagbasa',
    text: 'Nagbabasa ang bata nang malakas, at sinusuri kaagad kung tama ang bigkas.',
    tint: 'primary',
  },
  {
    icon: '🏅',
    title: 'Mga Badge at Parangal',
    text: 'Nakakakuha ng badge ang bata sa bawat tagumpay upang lumaki ang tiwala nila sa sarili.',
    tint: 'accent',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Para sa Magulang',
    text: 'Nakikita ng magulang ang progreso ng anak at nagse-schedule ng mga sesyon ng pagbasa.',
    tint: 'primary',
  },
  {
    icon: '🧑‍🏫',
    title: 'Para sa Guro',
    text: 'Nagbibigay ang guro ng aralin, PDF na babasahin, at pagsusulit na angkop sa bawat mag-aaral.',
    tint: 'accent',
  },
] as const;

const ROLES = [
  { icon: '🧒', label: 'Mag-aaral' },
  { icon: '👨‍👩‍👧', label: 'Magulang' },
  { icon: '🧑‍🏫', label: 'Guro' },
  { icon: '🛠️', label: 'Admin' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <span className="text-xl font-semibold text-[var(--color-primary)]">LinawLetra</span>
        <div className="flex items-center gap-4">
          <AccessibilityBar />
          <Link to="/login" className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-primary)]">
            Mag-login
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
          >
            Mag-sign up
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[var(--color-hero-from)] via-[var(--color-hero-via)] to-[var(--color-hero-to)] shadow-hero">
        <main className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1 text-sm font-medium text-white">
            Para sa Grade 1–6 · May dyslexia support
          </span>
          <h1 className="mt-5 text-4xl text-white sm:text-5xl">
            Tulong sa pagbasa ng Tagalog, para sa bawat bata.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
            Ginawa ang LinawLetra para sa mga mag-aaral na may dyslexia, mula Grade 1 hanggang
            Grade 6 — kasama ang mga tool para sa magulang, guro, at admin.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <TTSButton text="Tulong sa pagbasa ng Tagalog, para sa bawat bata. Ginawa ang LinawLetra para sa mga mag-aaral na may dyslexia." />
            <Link
              to="/signup"
              className="rounded-full bg-white px-6 py-3 text-base font-medium text-[var(--color-primary)] shadow-sm hover:bg-white/90"
            >
              <IconLabel icon="🚀" label="Magsimula" />
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {ROLES.map((r) => (
              <span
                key={r.label}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm"
              >
                <IconLabel icon={r.icon} label={r.label} />
              </span>
            ))}
          </div>
        </main>
      </section>

      <main className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
            >
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{
                  background: f.tint === 'primary' ? 'var(--color-primary-soft)' : 'var(--color-accent-soft)',
                }}
                aria-hidden="true"
              >
                {f.icon}
              </div>
              <h2 className="mb-2 text-lg font-semibold">{f.title}</h2>
              <p className="text-[var(--color-text-muted)]">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[var(--color-border)] px-6 py-6 text-center text-sm text-[var(--color-text-muted)]">
        LinawLetra — AI-assisted na Tagalog reading support para sa mga mag-aaral na may dyslexia.
      </footer>
    </div>
  );
}
