import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardPlus, Clock3, FileText, Heart, Leaf, Lightbulb, List, Lock, Mic, PlayCircle, Plus, Star, Sun, Trophy, TrendingUp } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { StudentBadgeSummary } from '../../components/StudentBadgeSummary';
import { BADGE_CATALOG } from '../../lib/badges';
import parentBackground from '../../assets/parent/progress-reading-banner.png';
import booksArt from '../../assets/students/home/lesson-books.png';
import clockArt from '../../assets/parent/progress-pink-clock.png';
import { AchievementArtwork } from '../../components/student/AchievementArtwork';
import { ParentHomeArtwork } from './ParentHomeArtwork';
import noActivitiesArt from '../../assets/parent/no activities.png';
import { formatPracticeTime, learningCategories, modulePercent, useParentChildren, useParentLearningData, type ParentModule, type ParentPracticeSession } from './parentLearningData';
import { progressMonth, progressNavigation, type ParentProgressTab } from './parentProgressNavigation';
import './progress-reference-layout.css';
import './progress-overview-reference.css';

const TABS = [
  { id: 'modules', label: 'Pag-unlad sa Modyul', icon: BookOpen },
  { id: 'activities', label: 'Mga Aktibidad', icon: List },
  { id: 'results', label: 'Mga Nakuhang Resulta', icon: Trophy },
  { id: 'practice', label: 'Mga Tala sa Pagsasanay', icon: FileText },
] as const;

function Icon({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={`progress-ref-icon ${tone}`} aria-hidden="true">{children}</span>;
}

function Heading({ icon, title, action, actionLabel = 'Tingnan Lahat', tone = 'blue' }: { icon: ReactNode; title: string; action?: () => void; actionLabel?: string; tone?: string }) {
  return <header className="progress-ref-card-heading"><h2><Icon tone={tone}>{icon}</Icon>{title}</h2>{action && <button type="button" onClick={action}>{actionLabel} <ArrowRight size={14} /></button>}</header>;
}

function Metric({ icon, tone, title, value, detail, children, art }: { icon: ReactNode; tone: string; title: string; value: string; detail?: string; children?: ReactNode; art?: ReactNode }) {
  return <article className={tone}><Icon tone={tone}>{icon}</Icon><div><b>{title}</b><strong className={value.length > 12 ? 'compact' : ''}>{value}</strong>{detail && <small>{detail}</small>}{children}</div>{art && <span className="progress-metric-art" aria-hidden="true">{art}</span>}</article>;
}

function SessionRows({ sessions, selectedSession }: { sessions: ParentPracticeSession[]; selectedSession?: string | null }) {
  return <div className="progress-session-list">{sessions.map((session) => <div key={session.id} className={selectedSession === session.id ? 'selected' : undefined}><Icon tone={session.is_correct ? 'green' : 'violet'}>{session.is_correct ? <CheckCircle2 size={19} /> : <Mic size={19} />}</Icon><span><b>{session.word || 'Pagsasanay sa pagbigkas'}</b><small>{new Date(session.created_at).toLocaleString('fil-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{selectedSession === session.id && ' · Napiling practice record'}</small></span><strong className={session.accuracy_percentage >= 80 ? 'good' : ''}>{Math.round(session.accuracy_percentage)}%</strong></div>)}</div>;
}

function ModuleDetails({ module, childName, onBack, onPractice }: { module: ParentModule; childName: string; onBack: () => void; onPractice: () => void }) {
  const state = module.state === 'completed' ? 'Tapos na' : module.state === 'locked' ? 'Naka-lock' : module.completed_content_item_count > 0 ? 'Isinasagawa' : 'Hindi Pa Nagsisimula';
  const percent = modulePercent(module);
  return <div className="progress-ref-module-detail">
    <button type="button" className="progress-ref-detail-back" onClick={onBack}><ArrowLeft size={16} /> Bumalik sa mga modyul</button>
    <Heading icon={<BookOpen />} title={module.title} />
    <p className="progress-ref-intro">Modyul {module.module_number} · Progreso ni {childName}</p>
    <span className={`progress-ref-detail-state ${module.state}`}>{module.state === 'locked' ? <Lock size={15} /> : module.state === 'completed' ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{state}</span>
    <p className="progress-ref-detail-description">{module.description?.trim() || 'Wala pang paglalarawan para sa modyul na ito.'}</p>
    <div className="progress-ref-detail-counts"><div><strong>{module.completed_content_item_count}</strong><span>Nakumpletong aktibidad</span></div><div><strong>{module.content_item_count}</strong><span>Kabuuang aktibidad</span></div><div><strong>{percent}%</strong><span>Progreso sa modyul</span></div></div>
    <div className="progress-ref-detail-bar" role="progressbar" aria-label={`Progreso sa ${module.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div>
    <p className="progress-ref-detail-note">{module.state === 'locked' ? 'Naka-lock pa ang modyul na ito sa learning path. Dito ay makikita lamang ang naitalang progreso; sa student account binubuksan ang mga aralin.' : module.state === 'completed' ? 'Nakumpleto na ang modyul na ito. Sa student account maaaring balikan ng iyong anak ang mga aralin.' : 'Sa student account maaaring ipagpatuloy ng iyong anak ang mga aralin. Read-only ang ulat na ito para sa magulang.'}</p>
    <button type="button" className="progress-ref-detail-records" onClick={onPractice}>Mga practice record ni {childName} <ArrowRight size={16} /></button>
    <small className="progress-ref-detail-note">Ang mga practice record ay para sa buong anak, hindi nakatali sa modyul na ito.</small>
  </div>;
}

export default function ProgressReference() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeTab = TABS.find((tab) => tab.id === params.get('tab'))?.id ?? 'modules';
  const selectedId = params.get('child');
  const [showAllModules, setShowAllModules] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [reportFocusVersion, setReportFocusVersion] = useState(0);
  useEffect(() => {
    if (!reportFocusVersion) return;
    const panel = document.getElementById('progress-report-panel');
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [reportFocusVersion]);
  const now = new Date();
  const month = progressMonth(params, now);
  const childrenQuery = useParentChildren(user?.id);
  const children = childrenQuery.data?.children ?? [];
  const childId = children.some((item) => item.id === selectedId) ? selectedId : children[0]?.id ?? null;
  const child = children.find((item) => item.id === childId);
  const learning = useParentLearningData(childId);
  const pathReady = !learning.path.isLoading && !learning.path.error;
  const practiceReady = !learning.practice.isLoading && !learning.practice.error;
  const currentMonth = month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const selectedModule = learning.modules.find((module) => module.id === params.get('module'));
  const selectedSession = params.get('session');
  const selectTab = (tab: ParentProgressTab, focusReport = true) => {
    setParams(progressNavigation(params, tab, undefined, childId), { replace: true });
    if (focusReport) setReportFocusVersion((value) => value + 1);
  };
  const openModule = (module: ParentModule) => {
    setParams(progressNavigation(params, 'modules', { module: module.id }, childId));
    setReportFocusVersion((value) => value + 1);
  };
  const [year, monthNumber] = month.split('-').map(Number);
  const rangeStart = new Date(year, monthNumber - 1, 1);
  const rangeEnd = new Date(year, monthNumber, 1);
  const previousStart = new Date(year, monthNumber - 2, 1);
  const sessions = (learning.practice.data ?? []).filter((session) => new Date(session.created_at) >= rangeStart && new Date(session.created_at) < rangeEnd);
  const previousSessions = (learning.practice.data ?? []).filter((session) => new Date(session.created_at) >= previousStart && new Date(session.created_at) < rangeStart);
  const average = (rows: ParentPracticeSession[]) => rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.accuracy_percentage || 0), 0) / rows.length) : null;
  const score = average(sessions);
  const previousScore = average(previousSessions);
  const trend = score != null && previousScore != null ? score - previousScore : null;
  const profile = learning.profile.data?.profile;
  const percent = learning.total ? Math.round(learning.completed / learning.total * 100) : 0;
  const level = learning.path.data?.effective_level ?? child?.level ?? '—';
  const categories = learningCategories(learning.modules, profile);
  const visibleModules = showAllModules ? learning.modules : learning.modules.slice(0, 6);
  const selectedRecord = sessions.find((session) => session.id === selectedSession);
  const recentSessions = sessions.slice(0, 12);
  const visibleSessions = showAllSessions ? sessions : selectedRecord && !recentSessions.includes(selectedRecord) ? [selectedRecord, ...recentSessions] : recentSessions;
  const weekAnchor = year === now.getFullYear() && monthNumber === now.getMonth() + 1 ? now : new Date(year, monthNumber, 0);
  const weekStart = new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), weekAnchor.getDate() - (weekAnchor.getDay() + 6) % 7);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
    return { date, practiced: (learning.practice.data ?? []).some((session) => new Date(session.created_at).toDateString() === date.toDateString()) };
  });
  const badges = [...BADGE_CATALOG.filter((badge) => learning.earned.includes(badge.id)), ...BADGE_CATALOG.filter((badge) => !learning.earned.includes(badge.id))];
  const noSessions = <div className="progress-ref-empty"><img src={noActivitiesArt} alt="" /><b>Wala pang pagsasanay sa napiling buwan.</b><p>Dito lilitaw ang mga aktibidad at resulta ng iyong anak.</p></div>;
  const sessionState = learning.practice.isLoading ? <p className="progress-ref-state" role="status">Kinukuha ang mga practice record...</p> : learning.practice.error ? <p className="progress-ref-state" role="alert">Hindi makuha ang mga practice record. <button type="button" onClick={() => void learning.practice.refetch()}>Subukan muli</button></p> : null;

  if (childrenQuery.isLoading) return <div className="progress-ref"><p className="progress-ref-state" role="status">Inihahanda ang ulat ng progreso...</p></div>;
  if (childrenQuery.error) return <div className="progress-ref"><p className="progress-ref-state" role="alert">Hindi ma-load ang ulat. <button onClick={() => void childrenQuery.refetch()}>Subukan muli</button></p></div>;
  if (!children.length) return <div className="progress-ref"><div className="progress-ref-empty"><BookOpen size={48} /><h1>Simulan ang inyong paglalakbay</h1><p>Magdagdag muna ng anak para makita ang kanyang progreso.</p><Link to="/parent/children?enroll=1">Magdagdag ng Anak <ArrowRight size={16} /></Link></div></div>;

  return <div className="progress-ref">
    <header className="progress-ref-hero" style={{ backgroundImage: `url("${parentBackground}")` }}><div><b><BarChart3 size={26} aria-hidden="true" /> PROGRESS</b><div className="progress-hero-title"><Leaf aria-hidden="true" /><h1 aria-label={`Pag-unlad ni ${child?.name}`}><span>Pag-unlad ni</span><strong>{child?.name.trim().split(/\s+/)[0]}!</strong></h1><Sun className="progress-hero-sun" aria-hidden="true" /></div><p>Masayang makita ang bawat pag-unlad<br />ng kanyang paglalakbay sa pagbasa!</p></div><aside><Heart size={24} fill="currentColor" aria-hidden="true" />Patuloy lang,<br />{child?.name.trim().split(/\s+/)[0]}!<br />Kaya mo ’yan!<span aria-hidden="true">💛</span></aside></header>

    <section className="progress-ref-picker" aria-label="Anak at panahon ng ulat"><div className="progress-children-group"><h2><ClipboardPlus size={18} aria-hidden="true" /> Piliin ang Anak</h2><div className="progress-child-options">{children.map((item,index) => <button key={item.id} type="button" className={`progress-child-option ${item.id === childId ? 'selected' : ''}`} aria-pressed={item.id === childId} onClick={() => { setShowAllModules(false); setShowAllSessions(false); setParams(progressNavigation(params, activeTab, undefined, item.id), { replace: true }); }}><span className="progress-child-avatar" aria-hidden="true"><ParentHomeArtwork kind={index % 2 ? 'girl' : 'boy'} />{item.id === childId && <Check size={16} />}</span><span><strong>{item.name}</strong><small>{item.grade_level === 0 ? 'Kindergarten' : `Grade ${item.grade_level}`} · {item.id === childId ? level : item.level}</small></span></button>)}<Link className="progress-add-child" to="/parent/children?enroll=1"><span><Plus size={30} /></span>Magdagdag<br />ng Anak</Link></div></div><label className="progress-ref-date"><CalendarDays size={20} /><span>{rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – {new Date(year, monthNumber, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><ChevronDown size={17} /><input type="month" aria-label="Buwan ng mga practice record" value={month} onChange={(event) => { if (event.target.value) { const next = new URLSearchParams(params); next.set('month', event.target.value); next.delete('session'); setShowAllSessions(false); setParams(next, { replace: true }); } }} /></label></section>

    <section className="progress-ref-metrics" aria-label="Buod ng progreso">
      <Metric icon={<BookOpen />} tone="violet" title="Nakumpletong Aktibidad" value={pathReady ? learning.total ? `${learning.completed} / ${learning.total}` : profile?.completedContentCount == null ? '—' : String(profile.completedContentCount) : '—'} art={<img src={booksArt} alt="" />}><span className="progress-ref-metric-bar"><i><u style={{ width: `${percent}%` }} /></i><b>{pathReady && learning.total ? `${percent}%` : '—'}</b></span></Metric>
      <Metric icon={<Star />} tone="green" title="Average Score" value={practiceReady && score != null ? `${score}%` : '—'} detail={trend == null ? 'sa napiling buwan' : undefined} art={<TrendingUp />}>{practiceReady && trend != null && <span className={`progress-ref-trend ${trend < 0 ? 'down' : ''}`}>{trend > 0 ? '+' : ''}{trend} puntos mula noong nakaraang buwan</span>}</Metric>
      <Metric icon={<BarChart3 />} tone="gold" title="Kasalukuyang Level" value={level} detail={learning.current?.title ?? 'Antas ng pagbabasa'} art={<AchievementArtwork badge={BADGE_CATALOG.find((badge) => badge.id === 'alamat_ng_pagbasa')!} />} />
      <Metric icon={<Clock3 />} tone="rose" title="Kabuuang Oras" value={practiceReady ? formatPracticeTime(sessions) : '—'} detail="sa napiling buwan" art={<img src={clockArt} alt="" />} />
    </section>

    <nav className="progress-ref-tabs" role="tablist" aria-label="Mga ulat ng progreso">{TABS.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`progress-tab-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} aria-selected={activeTab === tab.id} aria-controls="progress-report-panel" className={activeTab === tab.id ? 'active' : ''} onClick={() => selectTab(tab.id, false)} onKeyDown={(event) => { const target = event.key === 'ArrowRight' ? TABS[(index + 1) % TABS.length] : event.key === 'ArrowLeft' ? TABS[(index + TABS.length - 1) % TABS.length] : event.key === 'Home' ? TABS[0] : event.key === 'End' ? TABS[TABS.length - 1] : null; if (target) { event.preventDefault(); selectTab(target.id, false); document.getElementById(`progress-tab-${target.id}`)?.focus(); } }}><tab.icon size={22} />{tab.label}</button>)}</nav>

    <section className="progress-ref-main">
      <article className="progress-ref-modules" role="tabpanel" id="progress-report-panel" tabIndex={-1} aria-labelledby={`progress-tab-${activeTab}`}>
        {activeTab === 'modules' && (learning.path.isLoading ? <p className="progress-ref-state" role="status">Inihahanda ang mga modyul...</p> : learning.path.error ? <p className="progress-ref-state" role="alert">Hindi ma-load ang learning path. <button type="button" onClick={() => void learning.path.refetch()}>Subukan muli</button></p> : selectedModule ? <ModuleDetails module={selectedModule} childName={child?.name ?? 'iyong anak'} onBack={() => selectTab('modules')} onPractice={() => selectTab('activities')} /> : <>
          <Heading icon={<BookOpen />} title="Pag-unlad sa Bawat Modyul" action={learning.modules.length > 6 && !showAllModules ? () => setShowAllModules(true) : undefined} />
          <p className="progress-ref-intro">Tingnan ang kumpletong listahan ng modyul at ang progreso ni {child?.name}.</p>
          {params.get('module') && <p className="progress-ref-state" role="status">Hindi kasama ang napiling modyul sa kasalukuyang learning path ng anak na ito. <button type="button" onClick={() => selectTab('modules')}>Bumalik sa listahan</button></p>}
          {visibleModules.length ? <div className="progress-ref-module-list">{visibleModules.map((module, index) => <button type="button" className={`progress-ref-module tone-${index % 6}`} key={module.id} aria-label={`Tingnan ang detalye ng ${module.title}${module.state === 'locked' ? ' (naka-lock)' : ''}`} onClick={() => openModule(module)}><span className="progress-module-number">{module.module_number}</span><span className="progress-module-preview" aria-hidden="true">{module.title.match(/^Hanay ng\s+([a-z]+)\b/i)?.[1] ?? (level === 'Beginner' && module.module_number === 1 ? 'Aa' : <BookOpen size={27} />)}</span><div><b>{module.title}</b><small>{module.completed_content_item_count} / {module.content_item_count} aktibidad</small></div><em className={module.state === 'completed' ? 'done' : module.state === 'locked' ? 'locked' : 'started'}>{module.state === 'completed' ? <><CheckCircle2 size={12} /> Tapos na</> : module.state === 'locked' ? <><Lock size={12} /> Naka-lock</> : module.completed_content_item_count ? <><Star size={12} fill="currentColor" /> Isinasagawa</> : <><PlayCircle size={14} /> Hindi Pa Nagsisimula</>}</em><i><u style={{ width: `${modulePercent(module)}%` }} /></i><strong>{modulePercent(module)}%</strong><ChevronRight size={17} /></button>)}</div> : <div className="progress-ref-empty"><BookOpen size={38} /><p>Wala pang nakahandang modyul para sa antas na ito.</p></div>}
          {showAllModules && learning.modules.length > 6 && <button type="button" className="progress-ref-more" onClick={() => setShowAllModules((value) => !value)}>{showAllModules ? 'Ipakita ang unang 6 na modyul' : `Tingnan ang lahat ng ${learning.modules.length} modyul`} <ChevronDown size={15} /></button>}
        </>)}

        {activeTab === 'activities' && <><Heading icon={<List />} title="Mga Aktibidad" /><p className="progress-ref-intro">Mga practice record ni {child?.name} sa napiling buwan.</p>{sessionState ?? (sessions.length ? <><SessionRows sessions={visibleSessions} selectedSession={selectedSession} />{selectedSession && <button type="button" className="progress-ref-more" onClick={() => selectTab('activities')}>I-clear ang napiling practice record</button>}{sessions.length > 12 && !selectedSession && <button type="button" className="progress-ref-more" onClick={() => setShowAllSessions((value) => !value)}>{showAllSessions ? 'Ipakita ang unang 12' : `Tingnan ang lahat ng ${sessions.length} aktibidad`}</button>}</> : noSessions)}</>}

        {activeTab === 'results' && <><Heading icon={<Trophy />} tone="gold" title="Mga Nakuhang Resulta" /><p className="progress-ref-intro">Aktuwal na score sa practice at mga badge na nakamit ni {child?.name}.</p>{sessionState ?? (sessions.length ? <div className="progress-ref-result-summary"><div><strong>{score}%</strong><span>Average sa napiling buwan</span></div><div><strong>{sessions.filter((session) => session.accuracy_percentage >= 80).length}</strong><span>Practice na may 80% pataas</span></div><div><strong>{Math.max(...sessions.map((session) => session.accuracy_percentage))}%</strong><span>Pinakamataas na score</span></div></div> : <p className="progress-ref-state">Wala pang score sa napiling buwan.</p>)}{learning.achievements.error ? <p className="progress-ref-state" role="alert">Hindi makuha ang mga badge. <button type="button" onClick={() => void learning.achievements.refetch()}>Subukan muli</button></p> : learning.achievements.isLoading ? <p className="progress-ref-state" role="status">Kinukuha ang mga badge...</p> : <div className="progress-ref-badge-catalog">{badges.map((badge) => <div className={learning.earned.includes(badge.id) ? 'earned' : 'locked'} key={badge.id} title={badge.criteria}><img src={badge.image} alt="" /><span><b>{badge.title}</b><small>{learning.earned.includes(badge.id) ? 'Nakamit' : badge.criteria}</small></span>{!learning.earned.includes(badge.id) && <Lock size={14} />}</div>)}</div>}</>}

        {activeTab === 'practice' && <><Heading icon={<FileText />} tone="violet" title="Mga Tala sa Pagsasanay" /><p className="progress-ref-intro">Gabayan ang iyong anak gamit ang kanyang kasalukuyang reading profile.</p>{learning.profile.error && <p className="progress-ref-state" role="alert">Hindi makuha ang reading profile. <button type="button" onClick={() => void learning.profile.refetch()}>Subukan muli</button></p>}<div className="progress-ref-practice-note"><Icon tone="gold"><Lightbulb size={25} /></Icon><div><h3>Gawin sa bahay</h3><p>{profile?.recommendedHomePractice ?? 'Magbasa nang malakas nang 5 minuto kasama ang iyong anak.'}</p></div></div>{profile?.weakSounds.length ? <div className="progress-ref-sound-list"><h3>Mga tunog na kailangan pang sanayin</h3>{profile.weakSounds.map((sound) => <span key={sound.unit}><b>{sound.unit.toUpperCase()}</b>{sound.score}%</span>)}</div> : <p className="progress-ref-state">Magpatuloy sa pagsasanay para matukoy ang mga tunog na dapat pagtuunan.</p>}{profile?.insights.length ? <ul className="progress-ref-insights">{profile.insights.map((insight) => <li key={insight}><CheckCircle2 size={17} />{insight}</li>)}</ul> : null}<h3 className="progress-ref-record-heading">Huling mga practice record sa napiling buwan</h3>{sessionState ?? (sessions.length ? <SessionRows sessions={sessions.slice(0, 5)} /> : noSessions)}</>}
      </article>

      <article className="progress-ref-overview"><Heading icon={<BarChart3 />} title="Kabuuang Progreso" action={() => selectTab('modules')} />{learning.path.isLoading ? <p className="progress-ref-state" role="status">Kinukuha ang progreso...</p> : learning.path.error ? <p className="progress-ref-state" role="alert">Hindi makuha ang progreso. <button type="button" onClick={() => void learning.path.refetch()}>Subukan muli</button></p> : <div className="progress-ref-overview-body"><div className="progress-ref-donut" style={{ '--p': `${percent * 3.6}deg` } as CSSProperties} role="img" aria-label={`${percent}% ng learning path`}><b>{learning.total ? `${percent}%` : '—'}<small>{learning.total ? `${learning.completed} sa ${learning.total}` : 'Wala pang path'}<br />{learning.total ? 'aktibidad' : ''}</small></b></div><div className="progress-ref-categories">{categories.map((category) => <div key={category.label} className={category.tone}><Icon tone={category.tone}>{category.tone === 'blue' ? <Mic size={17} /> : category.tone === 'rose' ? <FileText size={17} /> : <BookOpen size={17} />}</Icon><b>{category.label}</b><i><u style={{ width: `${category.value ?? 0}%` }} /></i><strong title={category.value == null ? 'Wala pang naitalang datos' : undefined}>{category.value == null ? '—' : `${category.value}%`}</strong></div>)}</div></div>}<span className="progress-overview-garden" aria-hidden="true" /></article>

      <article className="progress-ref-week-card"><Heading icon={<CalendarDays />} title={currentMonth ? 'Pagsasanay ngayong Linggo' : 'Pagsasanay sa Huling Linggo'} action={() => selectTab('practice')} />{learning.practice.isLoading ? <p className="progress-ref-state" role="status">Kinukuha ang pagsasanay...</p> : learning.practice.error ? sessionState : <div className="progress-ref-week">{week.map(({ date, practiced }) => <Link className={practiced ? 'yes' : ''} key={date.toDateString()} to={`/parent/schedule?${new URLSearchParams({ child: childId ?? '', date: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` })}`} aria-label={`${date.toLocaleDateString('fil-PH', { month: 'long', day: 'numeric' })}: ${practiced ? 'may practice' : 'walang practice'}`}><small>{date.toLocaleDateString('fil-PH', { weekday: 'short' })}</small><span>{practiced ? <CheckCircle2 size={24} fill="currentColor" /> : <i />}</span></Link>)}</div>}</article>

      <article className="progress-ref-badges-card">{learning.achievements.isLoading ? <p className="progress-ref-state" role="status">Kinukuha ang mga badge...</p> : learning.achievements.error ? <p className="progress-ref-state" role="alert">Hindi makuha ang mga badge. <button type="button" onClick={() => void learning.achievements.refetch()}>Subukan muli</button></p> : <StudentBadgeSummary key={childId} achievements={learning.achievements.data?.achievements} badges={learning.achievements.data?.badges} name={child?.name} />}</article>

      <article className="progress-ref-recommendations-card"><Heading icon={<Lightbulb />} tone="gold" title="Mga Rekomendasyon" action={() => selectTab('practice')} /><button type="button" className="progress-ref-recommendation" onClick={() => learning.current ? openModule(learning.current) : selectTab('modules')}><Icon><BookOpen size={20} /></Icon><span><b>{learning.current ? `Tingnan ang ${learning.current.title}` : 'Balikan ang learning path'}</b><small>{learning.current ? `${Math.max(0, learning.current.content_item_count - learning.current.completed_content_item_count)} aktibidad ang maaari pang tapusin.` : 'Tingnan ang mga aralin para sa iyong anak.'}</small></span><ChevronRight size={16} /></button><button type="button" className="progress-ref-recommendation" onClick={() => selectTab('practice')}><Icon tone="violet"><Mic size={20} /></Icon><span><b>Gabay sa Pagsasanay ng Pagbigkas</b><small>{profile?.recommendedHomePractice ?? 'Magbasa nang malakas nang 5 minuto.'}</small></span><ChevronRight size={16} /></button><button type="button" className="progress-ref-recommendation" onClick={() => selectTab('practice')}><Icon tone="gold"><Star size={20} /></Icon><span><b>Dagdagang Pagsasanay</b><small>Balikan ang mga tunog at salitang kailangan pang sanayin.</small></span><ChevronRight size={16} /></button></article>
    </section>
  </div>;
}
