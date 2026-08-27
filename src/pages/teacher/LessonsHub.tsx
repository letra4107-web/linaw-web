import { useSearchParams } from 'react-router-dom';
import Lessons from './Lessons';
import PdfReading from './PdfReading';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';

const SUB_TABS = [
  { key: 'lessons', icon: '📚', label: 'Aralin' },
  { key: 'pdf', icon: '📄', label: 'PDF' },
] as const;

type TabKey = (typeof SUB_TABS)[number]['key'];

// Sub-tabs of one "Mga Aralin" page instead of separate sidebar entries,
// since they're both just different kinds of content a teacher assigns to
// students. (Pagsusulit / Landas ng Pagkatuto / Gawain were removed
// entirely, not merged in here.)
export default function LessonsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabKey) || 'lessons';

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sun', 8, 28)}>
        <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-warning-text)] uppercase">Learning content</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Mga Aralin at Assignment</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Gumawa, mag-upload, mag-assign, at subaybayan ang learning materials.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border)] bg-white/55 p-1.5" role="tablist">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSearchParams({ tab: tab.key })}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`min-h-12 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-[var(--color-primary)] text-white shadow-card'
                : 'hover:bg-white/70'
            }`}
          >
            <IconLabel icon={tab.icon} label={tab.label} />
          </button>
        ))}
      </div>

      {activeTab === 'lessons' && <Lessons />}
      {activeTab === 'pdf' && <PdfReading />}
    </div>
  );
}
