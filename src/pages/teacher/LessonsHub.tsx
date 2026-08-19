import { useSearchParams } from 'react-router-dom';
import Lessons from './Lessons';
import PdfReading from './PdfReading';
import { IconLabel } from '../../components/a11y/IconLabel';

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mga Aralin</h1>
        <p className="text-[var(--color-text-muted)]">Lahat ng nilalamang maia-assign sa mga mag-aaral mo — aralin at PDF.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSearchParams({ tab: tab.key })}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] hover:border-[var(--color-primary)]'
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
