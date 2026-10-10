import { useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Gamepad2, Heart, Leaf, Lightbulb, Lock, Mic, Plus, Star, Sun, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { BADGE_CATALOG } from '../../lib/badges';
import parentBackground from '../../assets/parent/parent-bg.png';
import currentModuleArt from '../../assets/parent/current.png';
import noEnrolledChildArt from '../../assets/parent/no enrolled child.png';
import noActivitiesArt from '../../assets/parent/no activities.png';
import { formatPracticeTime, learningCategories, modulePercent, useParentChildren, useParentLearningData } from './parentLearningData';
import './parent-dashboard-reference.css';

interface ScheduledEvent { id: string; title: string; scheduled_date: string; start_time: string | null; activity_type: string }

function Icon({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={`parent-ref-icon ${tone}`} aria-hidden="true">{children}</span>;
}

function Heading({ icon, title, to, tone = 'blue' }: { icon: ReactNode; title: string; to: string; tone?: string }) {
  return <header className="ref-card-heading"><h2><Icon tone={tone}>{icon}</Icon>{title}</h2><Link to={to}>Tingnan Lahat <ArrowRight size={14} /></Link></header>;
}

function Metric({ tone, icon, title, value, detail, to = '/parent/progress' }: { tone: string; icon: ReactNode; title: string; value: string | number; detail: string; to?: string }) {
  return <Link to={to} className={`parent-ref-metric ${tone}`}><Icon tone={tone}>{icon}</Icon><span><b>{title}</b><strong>{value}</strong><small>{detail}</small></span><ChevronRight size={19} /></Link>;
}

export default function Dashboard() {
  const { user, identity } = useAuth();
  const [childId, setChildId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const childrenQuery = useParentChildren(user?.id);
  const children = childrenQuery.data?.children ?? [];
  const child = children.find((item) => item.id === childId) ?? children[0];
  const activeId = child?.id ?? null;
  const childLink = (to: string) => activeId ? `${to}${to.includes('?') ? '&' : '?'}child=${encodeURIComponent(activeId)}` : to;
  const learning = useParentLearningData(activeId);
  const today = new Date();
  const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const { data: events = [] } = useQuery({
    queryKey: ['parent-home-upcoming', activeId, dayKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('scheduled_activities')
        .select('id,title,scheduled_date,start_time,activity_type').eq('child_id', activeId!)
        .eq('status', 'scheduled').gte('scheduled_date', dayKey)
        .order('scheduled_date').order('start_time').limit(3);
      if (error) throw error;
      return data as ScheduledEvent[];
    },
    enabled: Boolean(activeId),
  });
  const profile = learning.profile.data?.profile;
  const completed = learning.path.data ? learning.completed : profile?.completedContentCount ?? 0;
  const percent = learning.total > 0 ? Math.min(100, Math.round(learning.completed / learning.total * 100)) : 0;
  const sessions = learning.practice.data ?? [];
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const weeklySessions = sessions.filter((session) => new Date(session.created_at) >= weekAgo);
  const categories = learningCategories(learning.modules, profile);
  const badges = [...BADGE_CATALOG.filter((badge) => learning.earned.includes(badge.id)), ...BADGE_CATALOG.filter((badge) => !learning.earned.includes(badge.id))].slice(0, 4);
  const monthStart = month.getDay();
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: Math.ceil((monthStart + monthEnd) / 7) * 7 }, (_, index) => index - monthStart + 1);

  if (childrenQuery.isLoading) return <div className="parent-home-reference"><div className="ref-loading" role="status">Inihahanda ang iyong dashboard...</div></div>;
  if (childrenQuery.error) return <div className="parent-home-reference"><div className="ref-loading" role="alert">Hindi ma-load ang dashboard. <button onClick={() => void childrenQuery.refetch()}>Subukan muli</button></div></div>;
  if (!children.length) return <div className="parent-home-reference"><section className="ref-welcome-empty"><img src={noEnrolledChildArt} alt="" /><h1>Maligayang pagdating sa LinawLetra!</h1><p>Idagdag ang iyong anak para masubaybayan ang kanyang paglalakbay sa pagbabasa.</p><Link to="/parent/children"><Plus size={18} /> Magdagdag ng Anak</Link></section></div>;

  return <div className="parent-home-reference">
    <header className="parent-ref-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(255,253,247,.96),rgba(255,253,247,.81) 30%,rgba(255,255,255,0) 57%),url("${parentBackground}")` }}>
      <div><p><Leaf size={20} /> Good day,</p><h1>{identity?.displayName || 'Magulang'}! <Sun className="ref-hero-sun" aria-hidden="true" /></h1><span>Patuloy nating suportahan si {child?.name} sa kanyang paglalakbay sa pagbabasa. Maliit na hakbang, malaking progreso!</span></div>
      <aside><Heart size={21} fill="currentColor" aria-hidden="true" />Kasama ka namin sa bawat pag-unlad!</aside>
    </header>

    <section className="parent-ref-child"><div><b>Piliin ang Anak</b><label><span aria-hidden="true">{child?.name[0]}</span><p><strong>{child?.name}</strong><small>Grade {child?.grade_level} · {learning.path.data?.effective_level ?? child?.level}</small></p><ChevronDown size={18} /><select aria-label="Piliin ang anak" value={activeId ?? ''} onChange={(event) => setChildId(event.target.value)}>{children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><Link to="/parent/children"><Plus size={18} /> Magdagdag ng Anak</Link></section>

    <section className="parent-ref-metrics" aria-label="Buod ng pag-aaral">
      <Metric tone="violet" icon={<BookOpen />} title="Kabuuang Aralin" value={completed} detail={learning.total ? `ng ${learning.total} aralin` : 'nakumpletong aralin'} to={childLink('/parent/progress')} />
      <Metric tone="green" icon={<BarChart3 />} title="Average Score" value={profile?.averageAccuracy == null ? '—' : `${profile.averageAccuracy}%`} detail={profile?.sessionCount ? `${profile.weeklyAccuracyTrendPoints > 0 ? '+' : ''}${profile.weeklyAccuracyTrendPoints} puntos ngayong linggo` : 'Wala pang practice score'} to={childLink('/parent/progress?tab=results')} />
      <Metric tone="gold" icon={<Clock3 />} title="Oras sa Pag-aaral" value={formatPracticeTime(weeklySessions)} detail="ngayong linggo" to={childLink('/parent/progress?tab=practice')} />
      <Metric tone="rose" icon={<Star />} title="Mga Badge" value={learning.earned.length} detail="natanggap" to={childLink('/parent/progress?tab=results')} />
    </section>

    <section className="parent-ref-grid">
      <div className="parent-ref-column">
      <article className="parent-ref-card ref-progress"><Heading icon={<BarChart3 />} title="Kabuuang Progreso" to={childLink('/parent/progress')} /><div className="ref-progress-body"><div className="ref-donut" style={{ '--value': `${percent * 3.6}deg` } as CSSProperties} role="img" aria-label={`${percent}% ng kasalukuyang learning path`}><div><b>{learning.total ? `${percent}%` : '—'}</b><small>{learning.total ? `${learning.completed} sa ${learning.total}` : 'Wala pang learning path'}<br />{learning.total ? 'aralin' : ''}</small></div></div><div className="ref-bars">{categories.map((category) => <div key={category.label} className={category.tone}><Icon tone={category.tone}>{category.tone === 'blue' ? <Mic size={16} /> : category.tone === 'rose' ? <FileText size={16} /> : <BookOpen size={16} />}</Icon><span>{category.label}</span><i><em style={{ width: `${category.value ?? 0}%` }} /></i><b title={category.value == null ? 'Wala pang naitalang datos sa kategoryang ito' : undefined}>{category.value == null ? '—' : `${category.value}%`}</b></div>)}</div></div></article>

      <article className="parent-ref-card ref-learning"><Heading icon={<BookOpen />} tone="green" title="Kasalukuyang Learning Path" to={childLink('/parent/progress')} /><div className="ref-learning-inner"><img src={currentModuleArt} alt="" /><div><h3>{learning.current?.title ?? 'Naghahanda ang learning path'}</h3><p>{learning.current ? `Modyul ${learning.current.module_number} · ${learning.path.data?.effective_level ?? child?.level}` : 'Mga araling naaayon sa antas ng iyong anak'}</p><span><i><em style={{ width: `${modulePercent(learning.current)}%` }} /></i><b>{learning.current ? `${learning.current.completed_content_item_count} / ${learning.current.content_item_count} aralin` : '—'}</b></span><Link to={childLink('/parent/progress')}>Tingnan ang Pag-aaral <ArrowRight size={16} /></Link></div></div></article>

      <article className="parent-ref-card ref-schedule"><Heading icon={<CalendarDays />} title="Iskedyul ng Aktibidad" to={childLink('/parent/schedule')} /><div className="ref-schedule-body"><div className="ref-calendar"><header><button type="button" aria-label="Nakaraang buwan" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><b>{month.toLocaleDateString('fil-PH', { month: 'long', year: 'numeric' })}</b><button type="button" aria-label="Susunod na buwan" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight size={16} /></button></header><div>{['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'].map((day) => <b key={day}>{day}</b>)}{days.map((day, index) => day < 1 || day > monthEnd ? <span key={`empty-${index}`} /> : <span className={day === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear() ? 'today' : ''} key={day}>{day}</span>)}</div></div><div className="ref-events">{events.length ? events.map((event, index) => <Link to={childLink(`/parent/schedule?date=${event.scheduled_date.slice(0, 10)}`)} key={event.id}><Icon tone={index === 1 ? 'blue' : index === 2 ? 'rose' : 'violet'}>{event.activity_type === 'practice' ? <Mic size={19} /> : <BookOpen size={19} />}</Icon><span><b>{event.title}</b><small>{new Date(`${event.scheduled_date.slice(0, 10)}T${event.start_time ?? '00:00'}`).toLocaleString('fil-PH', { month: 'short', day: 'numeric', ...(event.start_time ? { hour: 'numeric', minute: '2-digit' } : {}) })}</small></span><ChevronRight size={16} /></Link>) : <div className="ref-schedule-empty"><CalendarDays size={28} /><p>Wala pang naka-iskedyul na gawain.</p><Link to={childLink('/parent/schedule')}>Magplano ng aktibidad <ArrowRight size={14} /></Link></div>}</div></div></article>
      </div>
      <div className="parent-ref-column">
      <article className="parent-ref-card ref-activity"><Heading icon={<Star />} tone="gold" title="Kamakailang Aktibidad" to={childLink('/parent/progress?tab=activities')} />{sessions.length ? <div className="ref-activity-list">{sessions.slice(0, 4).map((session) => <Link to={childLink('/parent/progress?tab=activities')} key={session.id}><Icon tone={session.is_correct ? 'gold' : 'violet'}>{session.is_correct ? <CheckCircle2 size={21} /> : <Mic size={21} />}</Icon><span><b>{session.is_correct ? 'Nakumpleto ang pagsasanay' : 'Nag-practice sa Pagbigkas'}{session.word ? `: ${session.word}` : ''}</b><small>{new Date(session.created_at).toLocaleString('fil-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span><ChevronRight size={16} /></Link>)}</div> : <div className="ref-empty"><img src={noActivitiesArt} alt="" /><span>Wala pang aktibidad.<small>Dito lilitaw ang kanyang unang pagsasanay.</small></span></div>}</article>

      <article className="parent-ref-card ref-badges"><Heading icon={<Trophy />} tone="gold" title="Mga Nakuhang Badge" to={childLink('/parent/progress?tab=results')} /><div className="ref-badge-row">{badges.map((badge) => <div className={learning.earned.includes(badge.id) ? 'earned' : 'locked'} key={badge.id} title={badge.criteria}><span><img src={badge.image} alt="" />{!learning.earned.includes(badge.id) && <Lock size={22} aria-hidden="true" />}</span><b>{badge.title}</b></div>)}</div></article>

      <article className="parent-ref-card ref-recommendations"><Heading icon={<Lightbulb />} tone="gold" title="Mga Rekomendasyon" to={childLink('/parent/progress?tab=practice')} /><div>{[
        { icon: <BookOpen size={21} />, title: 'Karagdagang Pagsasanay sa Pagbasa', detail: profile?.recommendedHomePractice ?? 'Magbasa nang malakas nang 5 minuto kasama ang iyong anak.', tone: 'blue', to: '/parent/progress?tab=practice' },
        { icon: <Gamepad2 size={21} />, title: 'Mga Laro para sa Pagbigkas', detail: 'Balikan ang mga tunog at salitang kailangan pang sanayin.', tone: 'violet', to: '/parent/progress?tab=results' },
        { icon: <BookOpen size={21} />, title: 'Basahin ang Kuwento ngayong Linggo', detail: 'Pumili ng materyal na babasahin ninyo nang magkasama.', tone: 'gold', to: '/parent/materials' },
      ].map((recommendation) => <Link to={childLink(recommendation.to)} key={recommendation.title}><Icon tone={recommendation.tone}>{recommendation.icon}</Icon><span><b>{recommendation.title}</b><small>{recommendation.detail}</small></span><ChevronRight size={16} /></Link>)}</div></article>
      </div>
    </section>
  </div>;
}
