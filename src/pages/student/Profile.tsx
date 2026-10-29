import { useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, CircleCheck, Flag, Flame, Info, LockKeyhole, Medal, Mic, Pencil, Star, Target, Trophy, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { TTSSpeedControl } from '../../components/a11y/TTSSpeedControl';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';
import { StudentProfileInsights } from '../../components/student/StudentProfileInsights';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { findBadge } from '../../lib/badges';
import { earnedStudentBadges, studentBadgeDate, studentJourneyLabel, studentLevelLabel } from '../../lib/studentProfile';
import wavingStudent from '../../assets/students/profile/waving-student.png';
import listeningStudent from '../../assets/students/profile/listening-student.png';
import owlMascot from '../../assets/students/mascot/owl-mascot.png';
import './profile-reference.css';

interface ChildRow {
  id: string;
  name: string;
  grade_level: number;
  username: string;
}

interface ChildProgress {
  level: string;
  xp: number;
  streak: number;
  longest_streak: number;
  activities_completed: number;
  achievements: unknown;
}

interface LearningPath {
  modules: { id: string; state: 'locked' | 'unlocked' | 'completed' }[];
}

function badgeLabel(id: string) {
  return id.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function Profile() {
  const { user, identity, refreshIdentity } = useAuth();
  const queryClient = useQueryClient();
  const editDialog = useRef<HTMLDialogElement>(null);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const { data: child, isPending: childPending, error: childError, refetch: refetchChild } = useQuery({
    queryKey: ['student-profile-details', user?.id],
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id, name, grade_level, username').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return data as ChildRow | null;
    },
    enabled: Boolean(user),
  });
  const { data: progress, isPending: progressPending, error: progressError, refetch: refetchProgress } = useQuery({
    queryKey: ['student-profile-progress', child?.id],
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase.from('child_progress').select('level, xp, streak, longest_streak, activities_completed, achievements').eq('child_id', child!.id).maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(child?.id),
  });
  const { data: readingProfile, isPending: insightsPending, error: insightsError, refetch: refetchInsights } = useQuery({
    queryKey: ['student-reading-profile', user?.id],
    queryFn: () => api<{ profile: ReadingProfile }>('/student/reading-profile', { auth: true }),
    enabled: Boolean(user),
  });
  const { data: path, isPending: pathPending, error: pathError, refetch: refetchPath } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<LearningPath>('/student/learn/path', { auth: true }),
    enabled: Boolean(user),
  });

  const profile = readingProfile?.profile;
  const badges = earnedStudentBadges(progress?.achievements);
  const displayName = child?.name || identity?.displayName || 'Mag-aaral';
  const modules = path?.modules ?? [];
  const completedModules = modules.filter((module) => module.state === 'completed').length;
  const journeyStage = modules.length ? Math.min(4, Math.floor(completedModules / modules.length * 4)) : 0;
  const journeyLabel = studentJourneyLabel(profile?.readingJourney);
  const stats = [
    { icon: BookOpen, tone: 'lavender', label: 'Antas', value: childPending || childError || !child ? '—' : `Grade ${child.grade_level}` },
    { icon: Star, tone: 'gold', label: 'Kabuuang XP', value: progressPending || progressError ? '—' : progress?.xp ?? 0 },
    { icon: Flame, tone: 'coral', label: 'Kasalukuyang Streak', value: progressPending || progressError ? '—' : `${progress?.streak ?? 0} araw` },
    { icon: Trophy, tone: 'sky', label: 'Pinakamahabang Streak', value: progressPending || progressError ? '—' : `${progress?.longest_streak ?? 0} araw` },
    { icon: Target, tone: 'mint', label: 'Mga Aralin Natatapos', value: pathPending || pathError ? '—' : completedModules },
    { icon: Check, tone: 'lilac', label: 'Mga Gawain Natatapos', value: progressPending || progressError ? '—' : progress?.activities_completed ?? 0 },
  ];

  const openEdit = () => {
    setDraftName(child?.name || displayName);
    setEditError(null);
    setSaveMessage('');
    editDialog.current?.showModal();
  };
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !user) return;
    setSaving(true);
    setEditError(null);
    try {
      const result = await api<{ success: boolean; child: ChildRow }>('/student/profile', { method: 'PATCH', auth: true, body: { name: draftName.trim() } });
      if (!result.success || !result.child?.id) throw new Error('Hindi pa nakumpirma ang pag-save. Subukan muli.');
      queryClient.setQueryData<ChildRow | null>(['student-profile-details', user.id], (previous) => ({ ...previous, ...result.child }));
      void queryClient.invalidateQueries({ queryKey: ['student-self'] });
      await refreshIdentity().catch(() => {});
      editDialog.current?.close();
      setSaveMessage('Na-save na ang iyong pangalan.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Hindi pa ma-save ang profile. Subukan muli.');
    } finally { setSaving(false); }
  };

  return (
    <div className="student-profile-reference">
      <QueryErrorNotice error={childError || progressError || insightsError || pathError} onRetry={() => { void refetchChild(); void refetchProgress(); void refetchInsights(); void refetchPath(); }} />
      {saveMessage && <p className="profile-save-message" role="status"><CircleCheck size={18} aria-hidden="true" />{saveMessage}</p>}
      <header className="profile-reference-hero">
        <img src={wavingStudent} alt="" aria-hidden="true" className="profile-waving-student" />
        <Star className="profile-hero-star profile-hero-star-one" aria-hidden="true" />
        <Star className="profile-hero-star profile-hero-star-two" aria-hidden="true" />
        <div className="profile-hero-copy">
          <p>Aking profile</p>
          <h1>{displayName}</h1>
          <div className="profile-hero-chips"><span>{child?.grade_level ? `Grade ${child.grade_level}` : 'Baitang: —'}</span><span>Mag-aaral</span><span>{studentLevelLabel(progress?.level)}</span></div>
        </div>
        <button type="button" className="profile-edit-button" onClick={openEdit} disabled={!child?.id}><Pencil size={15} aria-hidden="true" /> I-edit ang Profile</button>
      </header>

      <section className="profile-numbers-section" aria-labelledby="profile-numbers-title">
        <header className="profile-numbers-heading">
          <div><h2 id="profile-numbers-title">Aking mga Numero</h2><p>Tingnan ang iyong progreso sa pagkatuto!</p></div>
          <div className="profile-owl-cheer" aria-hidden="true"><p>Magaling!<br />Patuloy lang ang pagsasanay!</p><img src={owlMascot} alt="" /></div>
        </header>
        <div className="profile-number-grid">{stats.map((stat) => (
          <div key={stat.label} className={`profile-number-card tone-${stat.tone}`}>
            <span className="profile-number-icon"><stat.icon aria-hidden="true" /></span><p>{stat.label}</p><strong>{stat.value}</strong>
          </div>
        ))}</div>
      </section>

      <div className="profile-middle-grid">
        <StudentProfileInsights profile={profile} loading={insightsPending} />
        <div className="profile-side-column">
          <section className="profile-voice-card profile-panel" aria-labelledby="profile-voice-title">
            <div className="profile-voice-copy">
              <div className="profile-panel-heading"><span className="profile-voice-icon"><Mic size={23} aria-hidden="true" /></span><h2 id="profile-voice-title">Bilis ng Pagbasa ng Boses</h2><Info size={14} aria-hidden="true"><title>Ang bilis na pipiliin mo ay gagamitin sa pagbasa ng app.</title></Info></div>
              <p className="profile-panel-description">Piliin kung gaano mo gusto magbasa nang malakas.</p>
            </div>
            <img className="profile-listening-student" src={listeningStudent} alt="" aria-hidden="true" />
            <div className="profile-voice-controls"><TTSSpeedControl normalIcon="▶️" /></div>
          </section>
          <section className="profile-journey-card profile-panel" aria-labelledby="profile-journey-title">
            <div className="profile-panel-heading"><Flag className="profile-flag-icon" aria-hidden="true" /><h2 id="profile-journey-title">Ang Aking Paglalakbay</h2></div>
            <Link to="/student/learn" className="profile-journey-map" aria-label="Tingnan ang aking landas sa mga aralin">
              <svg viewBox="0 0 400 170" preserveAspectRatio="none" className="profile-journey-trail" aria-hidden="true"><path d="M 40 118 C 83 84 112 89 140 97 S 190 77 211 99 S 247 137 276 112 S 317 81 356 101" /></svg>
              {Array.from({ length: 5 }, (_, index) => <span key={index} className={`profile-journey-stop stop-${index} ${index === journeyStage ? 'is-current' : index < journeyStage ? 'is-complete' : ''}`} aria-hidden="true">{index === journeyStage ? <><img src={wavingStudent} alt="" /><span className="profile-pin-check"><Check size={11} /></span></> : index < journeyStage ? <Check size={17} /> : <LockKeyhole size={14} />}</span>)}
            </Link>
            <div className="profile-journey-caption"><h3>{journeyLabel}</h3><p>{journeyStage === 0 ? 'Nasa simula pa lang ng iyong paglalakbay. Kaya mo ito!' : journeyStage === 4 ? 'Natapos mo na ang iyong mga aralin. Ang galing mo!' : 'Bawat aralin ay isang hakbang pasulong. Ipagpatuloy mo!'}</p></div>
          </section>
        </div>
      </div>

      <section className="profile-badges-section profile-panel" aria-labelledby="profile-badges-title">
        <header className="profile-badges-heading">
          <div className="profile-panel-heading"><Trophy className="profile-trophy-icon" aria-hidden="true" /><div><h2 id="profile-badges-title">Mga Nakuhang Badge</h2><p>{progressPending ? 'Kinukuha ang iyong koleksyon...' : `${badges.length} badge ang nasa koleksyon mo.`}</p></div></div>
          <Link to="/student/achievements">Tingnan lahat <ArrowRight size={16} aria-hidden="true" /></Link>
        </header>
        {progressError ? <p className="profile-badges-empty">Hindi pa maipakita ang iyong mga badge. Subukan muli sa itaas.</p> : badges.length ? (
          <div className="profile-badge-grid">{badges.slice(-5).reverse().map((earned, index) => {
            const badge = findBadge(earned.id);
            const date = studentBadgeDate(earned.unlockedAt);
            return <article className={`profile-earned-badge badge-tone-${index}`} key={earned.id}>
              <span className="profile-badge-emblem">{badge ? <img src={badge.image} alt="" /> : <Medal className="profile-badge-fallback" aria-hidden="true" />}</span>
              <h3>{badge?.title || badgeLabel(earned.id)}</h3><p>{badge?.criteria || 'Parangal sa iyong pagkatuto.'}</p>{date && <time dateTime={earned.unlockedAt}>{date}</time>}
            </article>;
          })}</div>
        ) : <div className="profile-badges-empty"><Trophy size={35} aria-hidden="true" /><p>{progressPending ? 'Kinukuha ang iyong mga badge...' : 'Wala pang nakukuhang badge. Magpatuloy sa pagbasa—may unang parangal na naghihintay sa iyo!'}</p><Link to="/student/learn">Magpatuloy sa mga aralin <ArrowRight size={15} aria-hidden="true" /></Link></div>}
      </section>

      <dialog ref={editDialog} className="profile-edit-dialog" aria-labelledby="profile-edit-title" onCancel={(event) => { if (saving) event.preventDefault(); }}>
        <form onSubmit={saveProfile}>
          <header><h2 id="profile-edit-title">I-edit ang Profile</h2><button type="button" aria-label="Isara ang pag-edit ng profile" onClick={() => editDialog.current?.close()} disabled={saving}><X size={22} aria-hidden="true" /></button></header>
          <p>Gamitin ang pangalang gusto mong makita sa iyong profile.</p>
          <label htmlFor="student-profile-name">Pangalan<input id="student-profile-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} required disabled={saving} /></label>
          <dl><div><dt>Username</dt><dd>{child?.username || '—'}</dd></div><div><dt>Baitang</dt><dd>{child?.grade_level ? `Grade ${child.grade_level}` : '—'}</dd></div></dl>
          <p className="profile-edit-help">Ang baitang at username ay pinamamahalaan ng iyong magulang o guro.</p>
          {editError && <p role="alert" className="profile-edit-error">{editError}</p>}
          <footer><button type="button" onClick={() => editDialog.current?.close()} disabled={saving}>Kanselahin</button><button type="submit" disabled={saving || draftName.trim().length < 2}>{saving ? 'Sine-save...' : 'I-save ang Profile'}</button></footer>
        </form>
      </dialog>
    </div>
  );
}
