import { Link } from 'react-router-dom';
import { AccessibilityBar } from '../components/a11y/AccessibilityBar';
import { TTSButton } from '../components/a11y/TTSButton';
import { IconLabel } from '../components/a11y/IconLabel';
import logo from '../assets/Logo.jpg';

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

const STATS = [
  { value: 'Grade 1–6', label: 'Saklaw na antas' },
  { value: '4', label: 'Uri ng user' },
  { value: '100%', label: 'Tagalog na UI' },
  { value: 'AI', label: 'Reading insights' },
];

const STEPS = [
  { n: '1', icon: '✍️', title: 'Mag-sign up', text: 'Gumawa ng account bilang magulang o guro sa loob ng ilang minuto.' },
  { n: '2', icon: '🧒', title: 'I-enroll ang bata', text: 'Idagdag ang anak o mag-aaral, awtomatikong mase-set ang reading level.' },
  { n: '3', icon: '📈', title: 'Subaybayan ang progreso', text: 'Makita ang bawat sesyon, badge, at insight habang umuunlad ang bata.' },
] as const;

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-2 sm:px-6">
          <img src={logo} alt="LinawLetra" className="h-16 w-auto justify-self-start rounded-lg sm:h-20" />
          <div className="hidden justify-self-center sm:block">
            <AccessibilityBar />
          </div>
          <div className="flex items-center gap-4 justify-self-end">
            <Link
              to="/login"
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:border-[var(--color-primary)]"
            >
              Mag-login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-raised"
            >
              Mag-sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-hero-from)] via-[var(--color-hero-via)] to-[var(--color-hero-to)] shadow-hero">
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-0 -bottom-32 h-96 w-96 translate-x-1/4 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <main className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1 text-sm font-medium text-white">
            Para sa Grade 1–6 · May dyslexia support
          </span>
          <h1 className="mt-6 text-4xl text-white sm:text-6xl">
            Tulong sa pagbasa ng Tagalog, para sa bawat bata.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">
            Ginawa ang LinawLetra para sa mga mag-aaral na may dyslexia, mula Grade 1 hanggang
            Grade 6 — kasama ang mga tool para sa magulang, guro, at admin.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TTSButton text="Tulong sa pagbasa ng Tagalog, para sa bawat bata. Ginawa ang LinawLetra para sa mga mag-aaral na may dyslexia." />
            <Link
              to="/signup"
              className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[var(--color-primary)] shadow-card transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-raised"
            >
              <IconLabel icon="🚀" label="Magsimula, libre" />
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {ROLES.map((r) => (
              <span
                key={r.label}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur"
              >
                <IconLabel icon={r.icon} label={r.label} />
              </span>
            ))}
          </div>

          <div className="mt-14 grid grid-cols-2 gap-6 border-t border-white/20 pt-8 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs text-white/70 sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </main>
      </section>

      <main id="paano-gumagana" className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl">Paano gumagana</h2>
          <p className="mx-auto mt-2 max-w-xl text-[var(--color-text-muted)]">
            Tatlong simpleng hakbang lang para makasimula.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-card"
            >
              <span className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white shadow-card">
                {s.n}
              </span>
              <div className="mt-3 mb-3 text-3xl" aria-hidden="true">
                {s.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{s.text}</p>
            </div>
          ))}
        </div>
      </main>

      <main id="ano-ang-makukuha" className="mx-auto max-w-4xl px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl">Ano ang makukuha ninyo</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised"
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
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-[var(--color-text-muted)]">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-hero-from)] via-[var(--color-hero-via)] to-[var(--color-hero-to)]">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl text-white sm:text-3xl">Handa na bang magsimula?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Sumali sa mga magulang, guro, at mag-aaral na gumagamit na ng LinawLetra araw-araw.
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-base font-semibold text-[var(--color-primary)] shadow-card transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-raised"
          >
            <IconLabel icon="🚀" label="Gumawa ng account" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <img src={logo} alt="LinawLetra" className="h-14 w-auto rounded-lg" />
              <p className="mt-4 max-w-xs text-sm text-[var(--color-text-muted)]">
                AI-assisted na Tagalog reading support para sa mga mag-aaral na may dyslexia, Grade
                1–6 — kasama ang mga tool para sa magulang, guro, at admin.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                Mabilisang Link
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                <li>
                  <a href="#paano-gumagana" className="hover:text-[var(--color-primary)] hover:underline">
                    Paano Gumagana
                  </a>
                </li>
                <li>
                  <a href="#ano-ang-makukuha" className="hover:text-[var(--color-primary)] hover:underline">
                    Mga Tampok
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-[var(--color-primary)] hover:underline">
                    Mag-login
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-[var(--color-primary)] hover:underline">
                    Mag-sign up
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                Para Kanino
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
                {ROLES.map((r) => (
                  <li key={r.label}>
                    <IconLabel icon={r.icon} label={r.label} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-2 border-t border-[var(--color-border)] pt-6 text-center text-sm text-[var(--color-text-muted)] sm:flex-row sm:justify-between sm:text-left">
            <p>© {new Date().getFullYear()} LinawLetra. Lahat ng karapatan ay nakalaan.</p>
            <p>Ginawa nang may pagmamahal para sa mga batang Pilipino.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
