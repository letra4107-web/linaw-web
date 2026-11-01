import type { CSSProperties, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Bell, BookOpen, Check, CheckCircle2, ChevronRight, Clock3, FileText, Heart, Leaf, Mic, Plus, Star, Sun, Target, Trophy, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { BADGE_CATALOG } from '../../lib/badges';
import { AchievementArtwork } from '../../components/student/AchievementArtwork';
import { ParentHomeArtwork } from './ParentHomeArtwork';
import readingBanner from '../../assets/parent/home-welcome-garden.png';
import booksArt from '../../assets/students/home/lesson-books.png';
import lessonArt from '../../assets/parent/current.png';
import noEnrolledChildArt from '../../assets/parent/no enrolled child.png';
import noActivitiesArt from '../../assets/parent/no activities.png';
import { formatPracticeTime, learningCategories, modulePercent, useParentChildren, useParentLearningData, type ParentPracticeSession } from './parentLearningData';
import { type ParentProgressTab } from './parentProgressNavigation';
import './parent-dashboard-reference.css';

function Icon({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={`parent-ref-icon ${tone}`} aria-hidden="true">{children}</span>;
}
function Heading({ icon, title, to, tone = 'blue' }: { icon: ReactNode; title: string; to: string; tone?: string }) {
  return <header className="ref-card-heading"><h2><Icon tone={tone}>{icon}</Icon>{title}</h2><Link to={to}>Tingnan Lahat <ArrowRight size={14} /></Link></header>;
}
function Metric({ tone, icon, title, value, detail, to, art }: { tone: string; icon: ReactNode; title: string; value: string; detail: string; to: string; art: ReactNode }) {
  return <Link to={to} className={`parent-ref-metric ${tone}`}><Icon tone={tone}>{icon}</Icon><div className="ref-metric-copy"><b>{title}</b><strong>{value}</strong><small>{detail}</small></div><ChevronRight className="ref-metric-chevron" size={20} aria-hidden="true" /><span className="ref-metric-art" aria-hidden="true">{art}</span></Link>;
}
function QueryState({ loading, error, retry, children }: { loading: boolean; error: unknown; retry: () => void; children: ReactNode }) {
  if (loading) return <p className="ref-data-state" role="status">Kinukuha ang datos...</p>;
  if (error) return <p className="ref-data-state" role="alert">Hindi makuha ang datos. <button type="button" onClick={retry}>Subukan muli</button></p>;
  return children;
}

export default function Dashboard() {
  const { user, identity } = useAuth();
  const [params, setParams] = useSearchParams();
  const childrenQuery = useParentChildren(user?.id);
  const children = childrenQuery.data?.children ?? [];
  const child = children.find((item) => item.id === params.get('child')) ?? children[0];
  const activeId = child?.id ?? null;
  const learning = useParentLearningData(activeId);
  const today = new Date();
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7);
  const sessions = learning.practice.data ?? [];
  const weeklySessions = sessions.filter((session) => new Date(session.created_at) >= weekStart && new Date(session.created_at) <= today);
  const profile = learning.profile.data?.profile;
  const percent = learning.total ? Math.min(100, Math.round(learning.completed / learning.total * 100)) : 0;
  const level = learning.path.data?.effective_level ?? child?.level ?? '—';
  const categories = learningCategories(learning.modules, profile);
  const badges = BADGE_CATALOG.filter((badge) => learning.earned.includes(badge.id)).slice(0, 5);
  const parentName = identity?.displayName?.trim().split(/\s+/)[0] || 'Magulang';
  const currentPreview = learning.current?.title.match(/^Hanay ng\s+([a-z]+)\b/i)?.[1] ?? (level === 'Beginner' && learning.current?.module_number === 1 ? 'Aa' : null);
  const scoreReady = !learning.profile.isLoading && !learning.profile.error;
  const pathReady = !learning.path.isLoading && !learning.path.error;
  const practiceReady = !learning.practice.isLoading && !learning.practice.error;
  const badgesReady = !learning.achievements.isLoading && !learning.achievements.error;
  const reportLink = (tab: ParentProgressTab = 'modules', moduleId?: string) => {
    const next = new URLSearchParams({ tab });
    if (activeId) next.set('child', activeId);
    if (moduleId) next.set('module', moduleId);
    return `/parent/progress?${next}`;
  };
  const sessionLink = (session: ParentPracticeSession) => {
    const next = new URLSearchParams({ tab: 'activities', session: session.id });
    if (activeId) next.set('child', activeId);
    const date = new Date(session.created_at);
    next.set('month', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    return `/parent/progress?${next}`;
  };

  if (childrenQuery.isLoading) return <div className="parent-home-reference"><div className="ref-loading" role="status">Inihahanda ang iyong dashboard...</div></div>;
  if (childrenQuery.error) return <div className="parent-home-reference"><div className="ref-loading" role="alert">Hindi ma-load ang dashboard. <button onClick={() => void childrenQuery.refetch()}>Subukan muli</button></div></div>;
  if (!children.length) return <div className="parent-home-reference"><section className="ref-welcome-empty"><img src={noEnrolledChildArt} alt="" /><h1>Maligayang pagdating sa LinawLetra!</h1><p>Idagdag ang iyong anak para masubaybayan ang kanyang paglalakbay sa pagbabasa.</p><Link to="/parent/children?enroll=1"><Plus size={18} /> Magdagdag ng Anak</Link></section></div>;

  return <div className="parent-home-reference">
    <header className="parent-ref-hero" style={{ backgroundImage: `url("${readingBanner}")` }}>
      <div className="ref-hero-copy"><Leaf className="ref-hero-leaf" aria-hidden="true" /><p>Magandang araw,</p><h1>{parentName}! <Sun className="ref-hero-sun" aria-hidden="true" /></h1><span>Salamat sa patuloy na pagsuporta<br className="ref-desktop-break" /> sa paglalakbay sa pagbasa ng inyong anak.</span></div>
      <aside className="ref-hero-note">Kaya natin ’to<br />para sa mas<br />maliwanag na<br />bukas! <Heart size={25} fill="currentColor" aria-hidden="true" /></aside>
      <div className="ref-hero-signpost" aria-hidden="true"><span>BASA</span><span>TIWALA</span><span>PAG-UNLAD</span><span>MAS MAGANDANG<br />BUKAS <Heart size={14} fill="currentColor" /></span></div>
    </header>

    <section className="parent-ref-child" aria-label="Mga anak">
      <div className="ref-children-group"><h2><Users size={24} aria-hidden="true" /> Aking mga Anak</h2><div className="ref-child-options">{children.map((item, index) => <button key={item.id} type="button" className={`ref-child-option ${item.id === activeId ? 'selected' : ''}`} aria-pressed={item.id === activeId} onClick={() => { const next = new URLSearchParams(params); next.set('child', item.id); setParams(next, { replace: true }); }}><span className={`ref-child-avatar avatar-${index % 3}`} aria-hidden="true"><ParentHomeArtwork kind={index % 2 ? 'girl' : 'boy'} />{item.id === activeId && <Check size={16} />}</span><span><strong>{item.name}</strong><small>{item.grade_level === 0 ? 'Kindergarten' : `Grade ${item.grade_level}`} · {item.id === activeId ? level : item.level}</small></span></button>)}<Link className="ref-add-child" to="/parent/children?enroll=1"><span><Plus size={30} /></span>Magdagdag<br />ng Anak</Link></div></div>
      <Link className="ref-manage-children" to="/parent/children"><Users size={22} aria-hidden="true" /> I-manage ang mga Anak <ChevronRight size={20} aria-hidden="true" /></Link>
    </section>

    <section className="parent-ref-metrics" aria-label="Buod ng pag-aaral">
      <Metric tone="violet" icon={<BookOpen />} title="Kabuuang Aralin" value={pathReady ? `${learning.completed}` : '—'} detail={pathReady && learning.total ? `ng ${learning.total} aralin` : 'nakumpletong aralin'} to={reportLink()} art={<img src={booksArt} alt="" />} />
      <Metric tone="green" icon={<BarChart3 />} title="Average Score" value={scoreReady && profile?.averageAccuracy != null ? `${profile.averageAccuracy}%` : '—'} detail={scoreReady && profile?.sessionCount ? `${profile.weeklyAccuracyTrendPoints > 0 ? '+' : ''}${profile.weeklyAccuracyTrendPoints} puntos ngayong linggo` : 'Wala pang practice score'} to={reportLink('results')} art={<AchievementArtwork badge={BADGE_CATALOG.find((badge) => badge.id === 'kampeon_sa_pagbasa')!} />} />
      <Metric tone="gold" icon={<Clock3 />} title="Oras sa Pag-aaral" value={practiceReady ? formatPracticeTime(weeklySessions) : '—'} detail="ngayong linggo" to={reportLink('practice')} art={<ParentHomeArtwork kind="hourglass" />} />
      <Metric tone="rose" icon={<Star />} title="Mga Badge" value={badgesReady ? `${learning.earned.length}` : '—'} detail="natanggap" to={reportLink('results')} art={<ParentHomeArtwork kind="medal" />} />
    </section>

    <section className="parent-ref-grid">
      <article className="parent-ref-card ref-progress"><Heading icon={<Target />} tone="rose" title="Progreso ng Pagkatuto" to={reportLink()} /><QueryState loading={learning.path.isLoading} error={learning.path.error} retry={() => void learning.path.refetch()}><div className="ref-progress-body"><div className="ref-donut" style={{ '--value': `${percent * 3.6}deg` } as CSSProperties} role="img" aria-label={`${percent}% ng kasalukuyang learning path`}><div><b>{learning.total ? `${percent}%` : '—'}</b><small>{learning.total ? `${learning.completed} sa ${learning.total}` : 'Wala pang learning path'}<br />{learning.total ? 'aralin' : ''}</small></div></div><div className="ref-bars">{categories.map((category) => <div key={category.label} className={category.tone}><Icon tone={category.tone}>{category.tone === 'blue' ? <Mic size={19} /> : category.tone === 'rose' ? <FileText size={19} /> : <BookOpen size={19} />}</Icon><span>{category.label}</span><i><em style={{ width: `${category.value ?? 0}%` }} /></i><b>{category.value == null ? '—' : `${category.value}%`}</b></div>)}</div></div>{learning.profile.error && <p className="ref-inline-state" role="alert">Hindi makuha ang score sa pagbigkas. <button type="button" onClick={() => void learning.profile.refetch()}>Subukan muli</button></p>}</QueryState><span className="ref-progress-plants" aria-hidden="true" /></article>

      <article className="parent-ref-card ref-activity"><Heading icon={<Bell />} tone="gold" title="Kamakailang Aktibidad" to={reportLink('activities')} /><QueryState loading={learning.practice.isLoading} error={learning.practice.error} retry={() => void learning.practice.refetch()}>{sessions.length ? <div className="ref-activity-list">{sessions.slice(0, 4).map((session, index) => <Link key={session.id} to={sessionLink(session)}><Icon tone={session.is_correct ? index % 2 ? 'gold' : 'green' : 'violet'}>{session.is_correct ? <CheckCircle2 size={23} /> : <Mic size={23} />}</Icon><span><b>{session.is_correct ? 'Nakumpleto ang pagsasanay' : 'Nag-practice sa Pagbigkas'}{session.word ? `: ${session.word}` : ''}</b><small>{new Date(session.created_at).toLocaleString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span><ChevronRight size={16} aria-hidden="true" /></Link>)}</div> : <div className="ref-empty"><img src={noActivitiesArt} alt="" /><p>Wala pang aktibidad.<small>Dito lilitaw ang kanyang unang pagsasanay.</small></p></div>}</QueryState></article>

      <article className="parent-ref-card ref-learning"><Heading icon={<BookOpen />} tone="green" title="Kasalukuyang Aralin" to={reportLink()} /><QueryState loading={learning.path.isLoading} error={learning.path.error} retry={() => void learning.path.refetch()}>{learning.current ? <div className="ref-learning-inner"><div className="ref-lesson-art" aria-hidden="true"><img src={lessonArt} alt="" />{currentPreview && <span>{currentPreview}</span>}</div><div><h3>{learning.current.title}</h3><p>Modyul {learning.current.module_number} · {level}</p><span className="ref-current-progress"><i role="progressbar" aria-label={`Progreso sa ${learning.current.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={modulePercent(learning.current)}><em style={{ width: `${modulePercent(learning.current)}%` }} /></i><b>{learning.current.completed_content_item_count} / {learning.current.content_item_count} aralin</b></span><Link to={reportLink('modules', learning.current.id)}>Tingnan ang Pag-aaral <ArrowRight size={19} aria-hidden="true" /></Link></div></div> : <p className="ref-data-state">Wala pang nakahandang learning path para sa iyong anak.</p>}</QueryState></article>

      <article className="parent-ref-card ref-badges"><Heading icon={<Trophy />} tone="gold" title="Mga Nakuhang Badge" to={reportLink('results')} /><QueryState loading={learning.achievements.isLoading} error={learning.achievements.error} retry={() => void learning.achievements.refetch()}>{badges.length ? <div className="ref-badge-row">{badges.map((badge) => <Link key={badge.id} to={reportLink('results')} title={badge.criteria}><AchievementArtwork badge={badge} /><b>{badge.title}</b></Link>)}</div> : <div className="ref-no-badges"><Star size={36} aria-hidden="true" /><p>Dito lilitaw ang kanyang mga unang badge.</p></div>}</QueryState></article>
    </section>
  </div>;
}
