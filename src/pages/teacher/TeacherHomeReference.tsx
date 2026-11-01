import { useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, FileText, Heart, MessageSquare, Plus, Search, Star, Sun, TrendingUp, Upload, UsersRound, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import teacherBanner from '../../assets/teacher/home-classroom-banner.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';
import { TeacherHomeArt } from './TeacherHomeArt';
import './home-reference.css';

interface RosterItem { student_id: string; children: { id: string; name: string; grade_level: number } | null; }
interface ProgressItem { child_id: string; accuracy_sum: number; total_attempts: number; activities_completed: number; streak: number; }
interface Session { student_id: string; word?: string; accuracy_percentage: number; created_at: string; }
type StatusKey = 'roster' | 'progress' | 'recent' | 'assignments' | 'materials';
interface Props { roster?: RosterItem[]; progress?: ProgressItem[]; recent?: Session[]; pendingAssignments?: number; materialsCount?: number; loading: Record<StatusKey, boolean>; errors: Record<StatusKey, unknown>; onRetry: () => void; }

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Ngayon lang';
  if (minutes < 60) return `${minutes} min ang nakalipas`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} oras ang nakalipas`;
  return `${Math.floor(minutes / 1440)} araw ang nakalipas`;
}

function PanelHeading({ Icon, title, tone, to }: { Icon: ComponentType<{ 'aria-hidden'?: boolean }>; title: string; tone: string; to?: string }) {
  return <header className="th-panel-heading"><span className={`th-icon ${tone}`}><Icon aria-hidden /></span><h2>{title}</h2>{to && <Link to={to}>Tingnan Lahat <ChevronRight aria-hidden /></Link>}</header>;
}

export default function TeacherHomeReference({ roster, progress, recent, pendingAssignments, materialsCount, loading, errors, onRetry }: Props) {
  const { user, identity } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('7');
  const [today] = useState(() => new Date());
  const { data: profile } = useQuery({
    queryKey: ['teacher-profile-settings', user?.id], enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('teacher_profiles').select('grade_levels, avatar_url').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data as { grade_levels: number[]; avatar_url: string | null } | null;
    },
  });
  const studentIds = (roster ?? []).map((row) => row.student_id);
  const { data: chartSessions, error: chartError, isFetching: chartLoading, refetch: refetchChart } = useQuery({
    queryKey: ['teacher-home-period-progress', user?.id, studentIds, period], enabled: studentIds.length > 0 && period !== 'all',
    queryFn: async () => {
      const since = new Date(Date.now() - Number(period) * 86_400_000).toISOString();
      const result: Session[] = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase.from('pronunciation_practice_sessions').select('student_id, accuracy_percentage, created_at')
          .in('student_id', studentIds).gte('created_at', since).lte('created_at', new Date().toISOString())
          .order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + 499);
        if (error) throw error;
        result.push(...(data as Session[]));
        if (data.length < 500) return result;
      }
    },
  });
  const nameFor = (id: string) => roster?.find((row) => row.student_id === id)?.children?.name ?? 'Mag-aaral';
  const activeRows = (progress ?? []).filter((row) => row.total_attempts > 0).map((row) => ({ ...row, name: nameFor(row.child_id), accuracy: Math.round(row.accuracy_sum / row.total_attempts) }));
  const classAverage = activeRows.length ? Math.round(activeRows.reduce((sum, row) => sum + row.accuracy, 0) / activeRows.length) : 0;
  const needsAttention = activeRows.filter((row) => row.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy);
  const grouped = new Map<string, { sum: number; count: number }>();
  for (const session of chartSessions ?? []) {
    const value = grouped.get(session.student_id) ?? { sum: 0, count: 0 };
    value.sum += Number(session.accuracy_percentage); value.count++;
    grouped.set(session.student_id, value);
  }
  const chartRows = (period === 'all' ? activeRows.map((row) => ({ id: row.child_id, name: row.name, accuracy: row.accuracy })) :
    Array.from(grouped, ([id, value]) => ({ id, name: nameFor(id), accuracy: Math.round(value.sum / value.count) })))
    .sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  const displayName = identity?.displayName?.trim() || 'Guro';
  const teacherTitle = displayName.match(/^(teacher|guro)\b/i)?.[0] ?? 'Teacher';
  const teacherName = displayName.replace(/^(teacher|guro)\s+/i, '');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Manila' }).format(today));
  const greeting = hour < 12 ? 'Magandang Umaga,' : hour < 18 ? 'Magandang Hapon,' : 'Magandang Gabi,';
  const progressUnavailable = Boolean(errors.roster || errors.progress);
  const metric = (value: number | undefined, pending: boolean, error: unknown, suffix = '') => error ? '—' : pending ? '…' : `${value ?? 0}${suffix}`;
  const metrics = [
    { Icon: UsersRound, label: 'Aking mga Mag-aaral', value: metric(roster?.length, loading.roster, errors.roster), detail: 'Kasalukuyang klase', tone: 'purple', art: 0, to: '/teacher/students' },
    { Icon: BookOpen, label: 'Aktibong Aralin', value: metric(materialsCount, loading.materials, errors.materials), detail: 'Mga materyal na ginawa', tone: 'blue', art: 1, to: '/teacher/lessons' },
    { Icon: TrendingUp, label: 'Average Accuracy', value: metric(classAverage, loading.roster || loading.progress, progressUnavailable, '%'), detail: `${activeRows.length} mag-aaral na may aktibidad`, tone: 'green', art: 2, to: '/teacher/progress-reports' },
    { Icon: Star, label: 'Bukas na Gawain', value: metric(pendingAssignments, loading.assignments, errors.assignments), detail: 'Mga hindi pa nakukumpleto', tone: 'gold', art: 3, to: '/teacher/students' },
  ];

  return <div className="teacher-home-design">
    <section className="th-hero" aria-labelledby="th-welcome">
      <img className="th-hero-background" src={teacherBanner} alt="" aria-hidden="true" />
      <div className={`th-welcome ${teacherName.length > 16 ? 'is-long-name' : ''}`}><p><Sun aria-hidden />{greeting}</p><h1 id="th-welcome">{teacherTitle} <span>{teacherName}!</span></h1><p>Patuloy na gumagawa ng malaking pagkakaiba<br className="th-desktop-break" /> sa buhay ng iyong mga mag-aaral. <Heart aria-hidden /></p></div>
      <blockquote className="th-hero-note">“A clear lesson today can make a brighter reader tomorrow.” <Heart aria-hidden /></blockquote>
      <div className="th-hero-tools">
        <form className="th-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate(`/teacher/students${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`); }}>
          <Search aria-hidden /><label className="sr-only" htmlFor="th-search">Maghanap ng mag-aaral</label><input id="th-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Maghanap dito..." /><button type="submit" aria-label="Hanapin ang mag-aaral"><ChevronRight aria-hidden /></button>
        </form>
        <Link className="th-bell" to="/teacher/notifications" aria-label={`Mga Abiso${unreadCount ? `, ${unreadCount} hindi pa nababasa` : ''}`}><Bell aria-hidden />{unreadCount > 0 && <span>{unreadCount > 9 ? '9+' : unreadCount}</span>}</Link>
        <Link className="th-profile" to="/teacher/profile" aria-label="Aking Detalye"><img src={profile?.avatar_url || teacherIllustration} alt="" onError={(event) => { if (event.currentTarget.src !== new URL(teacherIllustration, window.location.href).href) event.currentTarget.src = teacherIllustration; }} /></Link>
      </div>
      <aside className="th-date"><div><span className="th-icon purple"><CalendarDays aria-hidden /></span><div><time dateTime={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(today)}>{new Intl.DateTimeFormat('fil-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(today)}</time><p>{new Intl.DateTimeFormat('fil-PH', { weekday: 'long', timeZone: 'Asia/Manila' }).format(today)}</p></div></div><p>“Gandang araw para<br /> maghasik ng kaalaman!”</p><span className="th-date-leaf" aria-hidden>🌱</span></aside>
    </section>

    <div className="th-body">
      <QueryErrorNotice error={errors.roster || errors.progress || errors.recent || errors.assignments || errors.materials || chartError} onRetry={() => { onRetry(); if (studentIds.length && period !== 'all') void refetchChart(); }} />
      <section aria-label="Buod ng klase" className="th-metrics">{metrics.map(({ Icon, label, value, detail, tone, art, to }) => <Link to={to} className={`th-metric ${tone}`} key={label}><span className={`th-icon ${tone}`}><Icon aria-hidden /></span><div><b>{value}</b><h2>{label}</h2><p>{detail}</p></div><TeacherHomeArt item={art} /><ChevronRight className="th-metric-arrow" aria-hidden /></Link>)}</section>
      <section className="th-middle">
        <article className="th-panel th-progress"><header className="th-panel-heading"><span className="th-icon purple"><BarChart3 aria-hidden /></span><div><h2>Pangkalahatang Progreso</h2><p>Reading accuracy ng iyong mga aktibong mag-aaral.</p></div><label className="sr-only" htmlFor="th-period">Panahon ng progreso</label><select id="th-period" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">Huling 7 araw</option><option value="30">Huling 30 araw</option><option value="all">Lahat ng panahon</option></select></header>
          <div className="th-chart-frame" aria-busy={chartLoading || loading.progress || loading.roster}>
            {loading.roster || chartLoading || (period === 'all' && loading.progress) ? <p className="th-status" role="status">Kinukuha ang progreso…</p> : (chartError && period !== 'all') || progressUnavailable ? <p className="th-status">Hindi makuha ang progreso. Subukan muli sa itaas.</p> : chartRows.length ? <div className="th-chart" role="list" aria-label="Average accuracy bawat mag-aaral">{chartRows.map((row, index) => <div className={`th-chart-column th-color-${index}`} key={row.id} role="listitem"><b>{row.accuracy}%</b><div><span style={{ '--bar-height': `${Math.max(2, Math.min(100, row.accuracy))}%` } as CSSProperties} /></div><small title={row.name}>{row.name}</small></div>)}</div> : <div className="th-progress-empty"><div className="th-ghost-bars" aria-hidden>{[30, 40, 60, 85, 55, 80, 88, 50, 35].map((height, index) => <i key={index} style={{ height }} />)}</div><TeacherHomeArt item={4} /><strong>{period === 'all' ? 'Magiging available ang progreso' : 'Wala pang progreso sa napiling panahon'}</strong><p>Makikita rito ang progreso pagkatapos ng mga reading activity.</p></div>}
          </div>
        </article>
        <article className="th-panel th-activity"><PanelHeading Icon={FileText} title="Kamakailang Aktibidad" tone="green" to="/teacher/progress-reports" />
          {loading.roster || loading.recent ? <p className="th-status" role="status">Kinukuha ang aktibidad…</p> : errors.recent || errors.roster ? <p className="th-status">Hindi makuha ang mga aktibidad. Subukan muli sa itaas.</p> : recent?.length ? <ul className="th-activity-list">{recent.slice(0, 5).map((session, index) => <li key={`${session.student_id}-${session.created_at}-${index}`}><span className={`th-icon ${session.accuracy_percentage >= 80 ? 'green' : 'blue'}`}>{session.accuracy_percentage >= 80 ? <CheckCircle2 aria-hidden /> : <BookOpen aria-hidden />}</span><div><b>{nameFor(session.student_id)}</b><p>Nag-practice: <strong>{session.word}</strong> · {session.accuracy_percentage}%</p><time dateTime={session.created_at}>{relativeTime(session.created_at)}</time></div></li>)}</ul> : <div className="th-empty th-activity-empty"><TeacherHomeArt item={5} /><strong>Wala pang naitalang aktibidad.</strong><p>Magsimula ng aralin, magbigay ng gawain, o mag-upload ng materyal upang makita ang aktibidad dito.</p><Link className="th-primary" to="/teacher/lessons"><Plus aria-hidden /> Gumawa ng Aralin</Link></div>}
        </article>
      </section>
      <section className="th-bottom">
        <article className="th-panel th-attention"><PanelHeading Icon={AlertTriangle} title="Mga Mag-aaral na Kailangan ng Atensyon" tone="pink" to="/teacher/progress-reports" />
          {loading.roster || loading.progress ? <p className="th-status" role="status">Sinusuri ang progreso…</p> : progressUnavailable ? <p className="th-status">Hindi makuha ang listahan. Subukan muli sa itaas.</p> : needsAttention.length ? <ul className="th-attention-list">{needsAttention.slice(0, 3).map((student) => <li key={student.child_id}><Link to={`/teacher/students?search=${encodeURIComponent(student.name)}`}><span>{student.name.slice(0, 1)}</span><div><b>{student.name}</b><small>{student.activities_completed} nakumpletong aktibidad</small></div><strong>{student.accuracy}%</strong><ChevronRight aria-hidden /></Link></li>)}</ul> : <div className="th-empty th-attention-empty"><TeacherHomeArt item={6} /><strong>Wala pang mag-aaral na nangangailangan ng atensyon.</strong><p>Kami ang mag-aabiso dito kapag may batang kailangan ng suporta.</p></div>}
        </article>
        <article className="th-panel th-tasks"><PanelHeading Icon={ClipboardList} title="Mga Gawain" tone="purple" to="/teacher/students" /><Link className="th-task-row" to="/teacher/students"><span className="th-icon gold"><ClipboardList aria-hidden /></span><div><b>{metric(pendingAssignments, loading.assignments, errors.assignments)} bukas na gawain</b><p>Sa lahat ng learning materials</p></div><ChevronRight aria-hidden /></Link><Link className="th-task-row" to="/teacher/progress-reports"><span className="th-icon green"><TrendingUp aria-hidden /></span><div><b>{metric(classAverage, loading.roster || loading.progress, progressUnavailable, '%')} class accuracy</b><p>Batay sa isinumiteng reading practice</p></div><ChevronRight aria-hidden /></Link><Link className="th-primary" to="/teacher/students">Tingnan ang mga Mag-aaral <ArrowRight aria-hidden /></Link></article>
        <nav aria-label="Mabilis na Aksyon" className="th-panel th-actions"><PanelHeading Icon={Zap} title="Mabilis na Aksyon" tone="gold" /><div><Link className="pink" to="/teacher/students"><span className="th-icon pink"><UsersRound aria-hidden /></span>Pamahalaan ang Mag-aaral</Link><Link className="blue" to="/teacher/lessons"><span className="th-icon blue"><BookOpen aria-hidden /></span>Gumawa ng Bagong Aralin</Link><Link className="green" to="/teacher/lessons"><span className="th-icon green"><Upload aria-hidden /></span>Mag-upload ng Materyal</Link><Link className="gold" to="/teacher/messages"><span className="th-icon gold"><MessageSquare aria-hidden /></span>Magpadala ng Mensahe</Link></div></nav>
      </section>
    </div>
  </div>;
}
