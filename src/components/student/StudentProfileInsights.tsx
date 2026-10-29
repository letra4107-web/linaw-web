import { useId, useState } from 'react';
import { BookOpen, ChartNoAxesColumnIncreasing, Hand, Info, Lightbulb, Target, Zap } from 'lucide-react';
import type { ReadingProfile } from '../ReadingInsightsPanel';
import { studentJourneyLabel } from '../../lib/studentProfile';

const CONFIDENCE_LABEL: Record<string, string> = {
  'Confident Reader': 'Tiwala sa Sarili',
  'Developing Confidence': 'Umuunlad ang Tiwala',
  'Needs More Practice': 'Kailangan pa ng Pagsasanay',
};

export function StudentProfileInsights({ profile, loading }: { profile?: ReadingProfile; loading: boolean }) {
  const [showInfo, setShowInfo] = useState(false);
  const infoId = useId();
  const hasData = Boolean(profile && profile.sessionCount > 0);
  const metrics = [
    { icon: Hand, tone: 'pink', value: hasData ? profile!.confidenceScore : '—', label: hasData ? CONFIDENCE_LABEL[profile!.confidenceLabel] ?? profile!.confidenceLabel : 'Kumpiyansa sa Pagbasa' },
    { icon: Target, tone: 'violet', value: hasData && profile!.averageAccuracy !== null ? `${profile!.averageAccuracy}%` : '—', label: 'Karaniwang Accuracy' },
    { icon: Zap, tone: 'blue', value: hasData ? profile!.weeklyPracticeDays : '—', label: 'Araw ng Pagsasanay (7 araw)' },
    { icon: ChartNoAxesColumnIncreasing, tone: 'green', value: hasData ? studentJourneyLabel(profile!.readingJourney) : '—', label: 'Antas ng Paglalakbay', journey: true },
  ];
  const groups = [
    { title: 'Mga Tunog na Kailangang Pagbutihin', tone: 'weak', items: (profile?.weakSounds ?? []).map((sound) => ({ text: sound.unit.toUpperCase(), score: sound.score })), empty: 'Wala pang tunog na kailangang balikan sa iyong tala.' },
    { title: 'Mga Tunog na Malakas', tone: 'strong', items: (profile?.strongSounds ?? []).map((sound) => ({ text: sound.unit.toUpperCase(), score: sound.score })), empty: 'Makikita rito ang mga tunog na nahahasa mo.' },
    { title: 'Mga Salitang Dapat Ulitin', tone: 'words', items: (profile?.weakWords ?? []).map((word) => ({ text: word.word, score: word.score })), empty: 'Wala pang salitang kailangang ulitin sa iyong tala.' },
  ];

  return (
    <section className="profile-reading-card profile-panel" aria-labelledby="profile-reading-title" aria-busy={loading}>
      <header className="profile-reading-heading">
        <div className="profile-panel-heading">
          <BookOpen className="profile-book-icon" aria-hidden="true" />
          <h2 id="profile-reading-title">Kaalaman sa Pagbasa</h2>
          <button type="button" className="profile-info-button" aria-label="Tungkol sa mga tala sa pagbasa" aria-expanded={showInfo} aria-controls={showInfo ? infoId : undefined} onClick={() => setShowInfo((value) => !value)}><Info size={15} aria-hidden="true" /></button>
        </div>
        <span className={`profile-support-label ${profile?.needsIntervention ? 'needs-support' : hasData ? 'developing' : ''}`}>{profile?.needsIntervention ? 'Kailangan ng Suporta' : hasData ? 'Patuloy na Umunlad' : 'Wala pang datos'}</span>
      </header>
      <p className="profile-panel-description">Ito ang iyong kasalukuyang kahusayan sa iba’t ibang bahagi ng pagbasa.</p>
      {showInfo && <p id={infoId} className="profile-reading-note">Batay ang mga tala sa iyong na-save na pagsasanay at mga nakilalang salita. Gabay ang mga ito sa pagpili ng susunod na pagsasanay.</p>}
      <div className="profile-reading-metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className={`profile-reading-metric tone-${metric.tone}`}>
            <span className="profile-metric-icon"><metric.icon size={21} aria-hidden="true" /></span>
            <strong className={metric.journey ? 'profile-journey-metric' : undefined}>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      {!hasData && <p className="profile-reading-note" role="status">{loading ? 'Kinukuha ang iyong mga tala sa pagbasa...' : 'Magsanay muna sa pagbigkas para makita ang iyong mga tala rito.'}</p>}
      <div className="profile-reading-groups">
        {groups.map((group) => (
          <section key={group.title} className={`profile-sound-group profile-sound-${group.tone}`}>
            <h3>{group.title}</h3>
            {hasData && group.items.length > 0 ? <ul>{group.items.map((item) => <li key={item.text}>{item.text} <span aria-hidden="true">-</span> {item.score}%</li>)}</ul> : <p>{group.empty}</p>}
          </section>
        ))}
      </div>
      <div className="profile-reading-tip"><Lightbulb aria-hidden="true" /><p>{profile?.recommendedHomePractice || 'Magsimula sa isang salita. Pakinggan muna, saka bigkasin nang dahan-dahan.'}</p></div>
    </section>
  );
}
