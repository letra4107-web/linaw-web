import { BookOpen, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import teacherHeroBackground from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';
import Lessons from './Lessons';
import PdfReading from './PdfReading';

const SUB_TABS = [
  { key: 'lessons', Icon: BookOpen, label: 'Aralin' },
  { key: 'pdf', Icon: FileText, label: 'PDF' },
] as const;

type TabKey = (typeof SUB_TABS)[number]['key'];

export default function LessonsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabKey) || 'lessons';

  return (
    <div className="teacher-lessons-reference min-w-0">
      <header className="teacher-lessons-hero">
        <img className="teacher-lessons-hero__background" src={teacherHeroBackground} alt="" aria-hidden="true" />
        <div className="teacher-lessons-hero__wash" aria-hidden="true" />
        <div className="teacher-lessons-hero__copy">
          <p>Mga aralin</p>
          <h1>Gumawa at Magbahagi ng Makabuluhang Aralin</h1>
          <span>Magdisenyo ng mga aktibidad na angkop sa pangangailangan ng iyong mga mag-aaral.</span>
        </div>
        <img className="teacher-lessons-hero__teacher" src={teacherIllustration} alt="" aria-hidden="true" />
      </header>

      <section className="teacher-lessons-shell" aria-label="Lesson workspace">
        <div className="teacher-lessons-shell__top">
          <div className="teacher-lessons-shell__title">
            <span className="teacher-lessons-shell__icon"><BookOpen aria-hidden="true" /></span>
            <div>
              <h2>{activeTab === 'lessons' ? 'Gumawa ng Bagong Aralin' : 'Mga PDF na Materyal'}</h2>
              <p>{activeTab === 'lessons' ? 'I-upload ang lesson PDF at ilagay ang mga detalye ng aralin.' : 'Mag-upload at magbahagi ng mga PDF para sa iyong mga mag-aaral.'}</p>
            </div>
          </div>

          <div className="teacher-lessons-tabs" role="tablist" aria-label="Uri ng learning material">
            {SUB_TABS.map(({ key, Icon, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setSearchParams({ tab: key })}
                className={activeTab === key ? 'is-active' : ''}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'lessons' ? <Lessons /> : <PdfReading />}
      </section>
    </div>
  );
}
