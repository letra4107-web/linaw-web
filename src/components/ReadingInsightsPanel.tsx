import { IconLabel } from './a11y/IconLabel';
import { cardStyle } from '../lib/cardStyle';

export interface ReadingProfile {
  sessionCount: number;
  averageAccuracy: number | null;
  confidenceScore: number;
  confidenceLabel: string;
  weeklyAccuracyTrendPoints: number;
  weeklyPracticeDays: number;
  strongSounds: { unit: string; score: number }[];
  weakSounds: { unit: string; score: number }[];
  weakWords: { word: string; score: number }[];
  recommendedHomePractice: string;
  insights: string[];
  needsIntervention: boolean;
  readingJourney: string;
  completedContentCount: number;
}

const JOURNEY_LABEL: Record<string, string> = {
  'Beginner Reader': 'Baguhang Mambabasa',
  'Intermediate Reader': 'Katamtamang Mambabasa',
  'Advanced Reader': 'Bihasang Mambabasa',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  'Confident Reader': 'Tiwala sa Sarili',
  'Developing Confidence': 'Umuunlad ang Tiwala',
  'Needs More Practice': 'Kailangan pa ng Pagsasanay',
};

export function ReadingInsightsPanel({ profile }: { profile: ReadingProfile }) {
  if (profile.sessionCount === 0) {
    return (
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-violet')}>
        <h2 className="mb-2 text-lg font-semibold">
          <IconLabel icon="🧠" label="Kaalaman sa Pagbasa" />
        </h2>
        <p className="text-[var(--color-text-muted)]">Wala pang sapat na datos. Magsanay muna sa pagbigkas.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-6" style={cardStyle('--color-brand-violet')}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          <IconLabel icon="🧠" label="Kaalaman sa Pagbasa" />
        </h2>
        {profile.needsIntervention && (
          <span className="rounded-full bg-[var(--color-danger)] px-3 py-1 text-xs font-medium text-white">
            Kailangan ng suporta
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">{profile.confidenceScore}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {CONFIDENCE_LABEL[profile.confidenceLabel] ?? profile.confidenceLabel}
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">{profile.averageAccuracy ?? '-'}%</p>
          <p className="text-sm text-[var(--color-text-muted)]">Karaniwang Accuracy</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">{profile.weeklyPracticeDays}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Araw ng Pagsasanay (7 araw)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">
            {JOURNEY_LABEL[profile.readingJourney] ?? profile.readingJourney}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Antas ng Paglalakbay</p>
        </div>
      </div>

      {profile.insights.length > 0 && (
        <ul className="flex flex-col gap-1">
          {profile.insights.map((insight, i) => (
            <li key={i} className="text-sm">
              <IconLabel icon="💡" label={insight} />
            </li>
          ))}
        </ul>
      )}

      {profile.weakSounds.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Mga Tunog na Kailangan Pagbutihin</p>
          <div className="flex flex-wrap gap-2">
            {profile.weakSounds.map((s) => (
              <span key={s.unit} className="rounded-full border border-[var(--color-danger)] px-3 py-1 text-sm text-[var(--color-danger)]">
                {s.unit.toUpperCase()} · {s.score}%
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.strongSounds.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Mga Tunog na Malakas</p>
          <div className="flex flex-wrap gap-2">
            {profile.strongSounds.map((s) => (
              <span key={s.unit} className="rounded-full border border-[var(--color-primary)] px-3 py-1 text-sm text-[var(--color-primary)]">
                {s.unit.toUpperCase()} · {s.score}%
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.weakWords.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Mga Salitang Dapat Ulitin</p>
          <div className="flex flex-wrap gap-2">
            {profile.weakWords.map((w) => (
              <span key={w.word} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm">
                {w.word} · {w.score}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-[var(--color-primary-soft)] p-3">
        <p className="text-sm">
          <IconLabel icon="🏠" label={`Iminumungkahing gawain: ${profile.recommendedHomePractice}`} />
        </p>
      </div>
    </div>
  );
}
