import { useId, useState } from 'react';
import { BookOpen, ChartNoAxesColumnIncreasing, Check, Gamepad2, Grid2X2, Heart, LockKeyhole, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { BADGE_CATALOG, BADGE_CATEGORY_LABEL, type BadgeCategory } from '../../lib/badges';
import { earnedStudentBadges } from '../../lib/studentProfile';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { AchievementArtwork } from '../../components/student/AchievementArtwork';
import celebrationGarden from '../../assets/students/achievements/celebration-garden.png';
import celebrationFallback from '../../assets/students/learn-reference/trophy-garden.png';
import './achievements-reference.css';

interface ChildProgress {
  activities_completed: number;
  achievements: unknown;
}

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Lahat', icon: Grid2X2 },
  { value: 'reading', label: BADGE_CATEGORY_LABEL.reading, icon: BookOpen },
  { value: 'practice', label: BADGE_CATEGORY_LABEL.practice, icon: Gamepad2 },
  { value: 'progress', label: BADGE_CATEGORY_LABEL.progress, icon: ChartNoAxesColumnIncreasing },
  { value: 'consistency', label: BADGE_CATEGORY_LABEL.consistency, icon: Heart },
  { value: 'meta', label: BADGE_CATEGORY_LABEL.meta, icon: Star },
] as const;

function awardDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('fil-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Achievements() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<BadgeCategory | 'all'>('all');
  const collectionId = useId();
  const { data: child, isPending: childPending, error: childError, refetch: refetchChild } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
    enabled: Boolean(user),
  });
  const { data: progress, isPending: progressPending, error: progressError, refetch: refetchProgress } = useQuery({
    queryKey: ['student-progress', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('child_progress').select('activities_completed, achievements').eq('child_id', child!.id).maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(child?.id),
  });
  const loading = childPending || (Boolean(child?.id) && progressPending);
  const error = childError || progressError;
  const ready = !loading && !error && Boolean(child?.id);
  const unlocked = new Map(earnedStudentBadges(progress?.achievements).map((badge) => [badge.id, badge.unlockedAt]));
  const badges = filter === 'all' ? BADGE_CATALOG : BADGE_CATALOG.filter((badge) => badge.category === filter);
  const unlockedCount = BADGE_CATALOG.filter((badge) => unlocked.has(badge.id)).length;
  const collectionPct = Math.round((unlockedCount / BADGE_CATALOG.length) * 100);
  const activitiesCompleted = Math.max(0, progress?.activities_completed ?? 0);

  return (
    <div className="student-achievements-reference">
      <header className="achievements-hero">
        <img
          className="achievements-hero-art"
          src={celebrationGarden}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={(event) => {
            const image = event.currentTarget;
            if (image.getAttribute('src') !== celebrationFallback) image.src = celebrationFallback;
          }}
        />
        <div className="achievements-hero-copy">
          <p>Iyong koleksyon</p>
          <h1>Parangal</h1>
          <p>Bawat badge ay tanda ng iyong<br className="achievements-desktop-break" /> pagsisikap at tagumpay!</p>
        </div>
        <div className="achievements-total" aria-label={ready ? `${unlockedCount} sa ${BADGE_CATALOG.length} badge ang nakuha na` : 'Kinukuha ang koleksyon'}>
          <Star aria-hidden="true" className="achievements-total-star" />
          <strong>{ready ? `${unlockedCount}/${BADGE_CATALOG.length}` : '—'}</strong>
          <span>Nakuha na</span>
        </div>
        <div className="achievements-collection-progress" role="progressbar" aria-label="Progreso sa koleksyon ng badge" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready ? collectionPct : undefined} aria-valuetext={ready ? `${collectionPct}% — ${unlockedCount} sa ${BADGE_CATALOG.length} badge` : 'Kinukuha ang koleksyon'}>
          <span><i style={{ width: ready ? `${collectionPct}%` : '0%' }} /></span>
          <strong>{ready ? `${collectionPct}%` : '—'}</strong>
        </div>
      </header>
      <div className="achievements-filters" role="group" aria-label="Salain ang mga parangal">
        {CATEGORY_FILTERS.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} aria-controls={collectionId} data-category={value}>
            <Icon aria-hidden="true" size={19} /><span>{label}</span>
          </button>
        ))}
      </div>
      <QueryErrorNotice error={error} onRetry={() => { if (childError) void refetchChild(); else void refetchProgress(); }} message="Hindi ma-load ang iyong mga parangal. Pakisubukang muli." />
      {loading && !error && <p className="achievements-notice" role="status">Kinukuha ang iyong mga parangal…</p>}
      {!loading && !error && !child && <p className="achievements-notice">Walang naka-link na mag-aaral sa account na ito.</p>}
      <section id={collectionId} className="achievements-collection" aria-label={`${filter === 'all' ? 'Lahat ng parangal' : BADGE_CATEGORY_LABEL[filter]} na mga badge`} aria-busy={loading}>
        <p className="sr-only" role="status">{ready ? `${badges.length} badge ang ipinapakita. ${unlockedCount} sa ${BADGE_CATALOG.length} ang nakuha na sa buong koleksyon.` : ''}</p>
        {ready && badges.map((badge) => {
          const isUnlocked = unlocked.has(badge.id);
          const unlockedAt = unlocked.get(badge.id);
          const date = awardDate(unlockedAt);
          // Award records remain authoritative; this bar only presents the existing reading counter.
          const count = badge.threshold === undefined ? null : Math.min(activitiesCompleted, badge.threshold);
          const badgePct = badge.threshold ? Math.round(((count ?? 0) / badge.threshold) * 100) : 0;
          return (
            <article key={badge.id} className={`achievement-card ${isUnlocked ? 'is-earned' : 'is-locked'}`} data-badge-id={badge.id} data-category={badge.category}>
              {isUnlocked && <span className="achievement-earned-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
              <AchievementArtwork badge={badge} />
              <h2>{badge.title}</h2>
              {badge.category === 'reading' ? <>
                <p className="achievement-description">{badge.criteria}</p>
                <span className="achievement-xp">+{badge.xp} XP</span>
              </> : <>
                <p className="achievement-meta">{BADGE_CATEGORY_LABEL[badge.category]} · +{badge.xp} XP</p>
                <p className={`achievement-description ${isUnlocked ? 'achievement-celebration' : ''}`}>{isUnlocked ? 'Mahusay! Iyo na ito.' : badge.criteria}</p>
              </>}
              <div className="achievement-card-bottom">
                {badge.threshold !== undefined && count !== null && <div className="achievement-progress" role="progressbar" aria-label={`Progreso para sa ${badge.title}`} aria-valuemin={0} aria-valuemax={badge.threshold} aria-valuenow={count} aria-valuetext={`${count} sa ${badge.threshold} gawain`}>
                  <span><i style={{ width: `${badgePct}%` }} /></span><b>{count}/{badge.threshold}</b>
                </div>}
                <div className="achievement-status">
                  <span>{isUnlocked ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : <LockKeyhole aria-hidden="true" size={16} />}<strong>{isUnlocked ? 'Nakuha na' : 'Naka-lock'}</strong></span>
                  {isUnlocked && date && <time dateTime={unlockedAt}>{date}</time>}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
