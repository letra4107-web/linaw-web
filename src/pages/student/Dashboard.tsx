import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Flame, Heart, Lightbulb, Play, Star, Target, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { WordOfDayCard } from '../../components/WordOfDayCard';
import './home-reference.css';

interface LearningModule {
  id: string; title: string; state: 'locked' | 'unlocked' | 'completed';
  content_item_count: number; completed_content_item_count: number;
}
interface LearningPath { configured: boolean; effective_level: string; modules: LearningModule[] }
interface Progress { xp: number; streak: number; longest_streak: number }
interface Assignment { id: string; status: string; due_date: string | null; pdf_materials: { title: string } | null }

export default function Dashboard() {
  const { user, identity } = useAuth();
  const { data: child, error: childError, refetch: refetchChild } = useQuery({
    queryKey: ['student-profile-details', user?.id], refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id, name, grade_level, username').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; grade_level: number; username: string } | null;
    }, enabled: Boolean(user),
  });
  const { data: progress, isPending: progressPending, error: progressError, refetch: refetchProgress } = useQuery({
    queryKey: ['student-progress', child?.id, 'home'], refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase.from('child_progress').select('xp, streak, longest_streak').eq('child_id', child!.id).maybeSingle();
      if (error) throw error;
      return data as Progress | null;
    }, enabled: Boolean(child?.id),
  });
  const { data: path, isPending: pathPending, error: pathError, refetch: refetchPath } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<LearningPath>('/student/learn/path', { auth: true }), enabled: Boolean(user),
  });
  const { data: assignments, error: assignmentsError, refetch: refetchAssignments } = useQuery({
    queryKey: ['student-pdf-deadlines', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('pdf_assignments').select('id, status, due_date, pdf_materials(title)').eq('student_id', child!.id).neq('status', 'completed').not('due_date', 'is', null).order('due_date', { ascending: true }).limit(3);
      if (error) throw error;
      return data as unknown as Assignment[];
    }, enabled: Boolean(child?.id),
  });
  const modules = path?.modules ?? [];
  const completedModules = modules.filter(module => module.state === 'completed').length;
  const firstName = child?.name?.trim().split(/\s+/)[0] || identity?.displayName?.trim().split(/\s+/)[0] || 'Mag-aaral';
  const number = (value: number | undefined) => progressError ? '—' : progressPending ? '…' : String(value ?? 0);
  const stats = [
    { label: 'Antas', value: childError ? '—' : child ? `Grade ${child.grade_level}` : '…', icon: BookOpen, tone: 'lilac' },
    { label: 'Kabuuang XP', value: number(progress?.xp), icon: Star, tone: 'gold' },
    { label: 'Kasalukuyang Streak', value: `${number(progress?.streak)}${progressError || progressPending ? '' : ' araw'}`, icon: Flame, tone: 'coral' },
    { label: 'Pinakamahabang Streak', value: `${number(progress?.longest_streak)}${progressError || progressPending ? '' : ' araw'}`, icon: Trophy, tone: 'sky' },
    { label: 'Mga Aralin Natatapos', value: pathError ? '—' : pathPending ? '…' : String(completedModules), icon: Target, tone: 'mint' },
  ];

  return <div className="student-home-reference">
    <QueryErrorNotice error={childError || progressError || pathError || assignmentsError} onRetry={() => { void refetchChild(); void refetchProgress(); void refetchPath(); void refetchAssignments(); }} />
    <section className="home-welcome" aria-labelledby="home-title">
      <div className="home-welcome-copy">
        <p>Magandang araw,</p>
        <h1 id="home-title">{firstName}! <span aria-hidden="true">🌟</span></h1>
        <div className="home-welcome-description">Handa ka na bang matuto today?<br /><span aria-hidden="true">⭐</span> Kaya mo ito!</div>
        <Link to="/student/practice" className="home-purple-button home-welcome-button"><span className="home-play-icon"><Play size={13} fill="currentColor" aria-hidden="true" /></span> Simulan ang Pagsasanay <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      <blockquote className="home-quote-board">“Bawat maliit<br />na hakbang<br />ay malaking<br />tagumpay!”<Heart aria-hidden="true" size={21} fill="currentColor" /></blockquote>
    </section>
    <section className="home-number-grid" aria-label="Aking mga numero">
      {stats.map(({ label, value, icon: Icon, tone }) => <article key={label} className={`home-number-card home-tone-${tone}`}><span className="home-number-icon"><Icon size={32} strokeWidth={2.3} aria-hidden="true" /></span><h2>{label}</h2><strong>{value}</strong></article>)}
    </section>
    <WordOfDayCard streak={progress?.streak ?? 0} />
    <aside className="home-reminder-card home-panel" aria-labelledby="home-reminder-title"><div className="home-bottom-heading"><Lightbulb className="home-lightbulb" size={30} aria-hidden="true" /><h2 id="home-reminder-title">Maliit na Paalala</h2></div><ul>{['Magpahinga kung napapagod.', 'Gawin ang mga gawain nang maayos.', 'Huwag matakot magkamali.', 'Mas magiging magaling ka pa!'].map(reminder => <li key={reminder}><span><Check size={12} strokeWidth={4} aria-hidden="true" /></span>{reminder}</li>)}</ul><Heart className="home-reminder-heart" size={26} fill="currentColor" aria-hidden="true" /></aside>
    {Boolean(assignments?.length) && <section className="home-assignment-card home-panel" aria-labelledby="home-assignment-title"><h2 id="home-assignment-title">Mga Gawaing May Takdang Araw</h2><ul>{assignments!.map(assignment => <li key={assignment.id}><Link to="/student/learn"><BookOpen size={20} aria-hidden="true" /><span>{assignment.pdf_materials?.title || 'Gawain sa Pagbasa'}</span><time dateTime={assignment.due_date!}>{new Date(assignment.due_date!).toLocaleDateString('fil-PH', { month: 'long', day: 'numeric' })}</time><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul></section>}
  </div>;
}
