import { useSearchParams } from 'react-router-dom';
import Lessons from './Lessons';
import PdfReading from './PdfReading';
import Assessments from './Assessments';
import LearningPaths from './LearningPaths';
import Activities from './Activities';
import { IconLabel } from '../../components/a11y/IconLabel';

const SUB_TABS = [
  { key: 'lessons', icon: '📚', label: 'Aralin' },
  { key: 'pdf', icon: '📄', label: 'PDF' },
  { key: 'assessments', icon: '📝', label: 'Pagsusulit' },
  { key: 'paths', icon: '🧭', label: 'Landas ng Pagkatuto' },
  { key: 'activities', icon: '🗂️', label: 'Gawain' },
] as const;

type TabKey = (typeof SUB_TABS)[number]['key'];

// Consolidates what used to be 4 separate sidebar tabs (Pagbasa ng PDF, Mga
// Pagsusulit, Landas ng Pagkatuto, Mga Gawain) into sub-tabs of one "Mga
// Aralin" page, since they're all just different kinds of content a teacher
// assigns to students. Each sub-page keeps its own component/logic untouched
// -- this only changes how they're navigated to.
export default function LessonsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabKey) || 'lessons';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mga Aralin</h1>
        <p className="text-[var(--color-text-muted)]">
          Lahat ng nilalamang maia-assign sa mga mag-aaral mo — aralin, PDF, pagsusulit, landas ng pagkatuto, at gawain.
        </p>
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
      {activeTab === 'assessments' && <Assessments />}
      {activeTab === 'paths' && <LearningPaths />}
      {activeTab === 'activities' && <Activities />}
    </div>
  );
}
