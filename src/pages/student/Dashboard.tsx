import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, Check, Flame, Heart, Lightbulb, LockKeyhole, Mic, Play, Star, Sun, Target, Trophy, Volume2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { WordOfDayCard, type DailyWordStatus } from '../../components/WordOfDayCard';
import lessonBooks from '../../assets/students/home/lesson-books.png';
import './home-reference.css';

interface LearningModule {
  id: string; title: string; state: 'locked' | 'unlocked' | 'completed';
  content_item_count: number; completed_content_item_count: number;
}
interface LearningPath { configured: boolean; effective_level: string; modules: LearningModule[] }
interface Progress { xp: number; streak: number; longest_streak: number }
interface Assignment { id: string; status: string; due_date: string | null; pdf_materials: { title: string } | null }
const INITIAL_WORD_STATUS: DailyWordStatus = { available: false, listened: false, read: false, completed: false };

export default function Dashboard() {
  const { user, identity } = useAuth();
  const [wordStatus, setWordStatus] = useState(INITIAL_WORD_STATUS);
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
  const currentIndex = modules.findIndex(module => module.state === 'unlocked');
  const current = modules[currentIndex];
  const allCompleted = modules.length > 0 && completedModules === modules.length;
  const percentage = current ? Math.min(100, Math.max(0, Math.round(current.completed_content_item_count / Math.max(1, current.content_item_count) * 100))) : allCompleted ? 100 : 0;
  const firstName = child?.name?.trim().split(/\s+/)[0] || identity?.displayName?.trim().split(/\s+/)[0] || 'Mag-aaral';
  const number = (value: number | undefined) => progressError ? '—' : progressPending ? '…' : String(value ?? 0);
  const stats = [
    { label: 'Antas', value: childError ? '—' : child ? `Grade ${child.grade_level}` : '…', icon: BookOpen, tone: 'lilac' },
    { label: 'Kabuuang XP', value: number(progress?.xp), icon: Star, tone: 'gold' },
    { label: 'Kasalukuyang Streak', value: `${number(progress?.streak)}${progressError || progressPending ? '' : ' araw'}`, icon: Flame, tone: 'coral' },
    { label: 'Pinakamahabang Streak', value: `${number(progress?.longest_streak)}${progressError || progressPending ? '' : ' araw'}`, icon: Trophy, tone: 'sky' },
    { label: 'Mga Aralin Natatapos', value: pathError ? '—' : pathPending ? '…' : String(completedModules), icon: Target, tone: 'mint' },
  ];
  const tasks = [
    { title: 'Pakinggan ang Salita', detail: 'Makinig muna sa tamang bigkas.', icon: Volume2, action: 'listen', done: wordStatus.listened || wordStatus.completed, locked: !wordStatus.available, tone: 'blue' },
    { title: 'Basahin ang mga Pantig', detail: 'Dahan-dahang basahin ang salita.', icon: BookOpen, action: 'read', done: wordStatus.read || wordStatus.completed, locked: !wordStatus.available || !wordStatus.listened, tone: 'gold' },
    { title: 'Bigkasin ang Salita', detail: 'Ikaw naman! Sabihin nang malinaw.', icon: Mic, action: 'speak', done: wordStatus.completed, locked: !wordStatus.available || !wordStatus.read, tone: 'purple' },
  ];
  const completedTasks = tasks.filter(task => task.done).length;
  const startWordStep = (action: string) => {
    const target = document.querySelector<HTMLButtonElement>(`#salita-ngayon [data-word-action="${action}"]`);
    target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    target?.focus({ preventScroll: true }); target?.click();
  };

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
    <div className="home-daily-grid">
      <section className="home-daily-card home-panel" aria-labelledby="home-daily-title">
        <header className="home-daily-heading"><Sun className="home-sun" size={33} aria-hidden="true" /><div><h2 id="home-daily-title">Gawain Para sa Araw na Ito</h2><p>Maliit na gawain, malaking pag-unlad!</p></div></header>
        <div className="home-daily-progress" role="img" aria-label={`${completedTasks} sa 3 hakbang ang natapos`}><strong>{completedTasks}/3</strong><span aria-hidden="true">{tasks.map(task => <i key={task.action} data-complete={task.done} />)}</span></div>
        <ol className="home-task-list">{tasks.map(({ title, detail, icon: Icon, action, done, locked, tone }, index) => <li key={action} className={`home-task home-task-${tone}`}>
          <span className="home-task-icon"><Icon size={30} aria-hidden="true" /></span><div className="home-task-copy"><h3>{title}</h3><p>{detail}</p></div>
          {done ? <span className="home-task-done" role="img" aria-label="Tapos na"><Check size={23} aria-hidden="true" /></span> : locked ? <span className="home-task-lock" role="img" aria-label={index === 0 ? 'Inihahanda ang salita' : `Tapusin muna ang hakbang ${index}`}><LockKeyhole size={22} aria-hidden="true" /></span> : <button type="button" className="home-purple-button home-task-start" onClick={() => startWordStep(action)}>Simulan <ArrowRight size={15} aria-hidden="true" /></button>}
        </li>)}</ol>
        <div className="home-daily-footer">{wordStatus.completed ? 'Ang galing! Natapos mo ang salita ngayong araw.' : 'Makinig. Magbasa. Bigkasin. Kaya mo ito!'}</div>
        <img className="home-task-books" src={lessonBooks} alt="" aria-hidden="true" />
      </section>
      <aside className="home-encouragement" aria-label="Kaya mo ito"><h2>Kaya Mo Ito! <span aria-hidden="true">🌟</span></h2><p>“Magbasa,<br />Mag-isip,<br />Magpursigi,<br />Magtagumpay!” <Heart size={21} fill="currentColor" aria-hidden="true" /></p></aside>
    </div>
    <WordOfDayCard streak={progress?.streak ?? 0} onStatusChange={setWordStatus} />
    <div className="home-bottom-grid">
      <section className="home-lesson-card home-panel" aria-labelledby="home-lesson-title"><div className="home-bottom-heading"><span className="home-small-icon"><ChartNoAxesColumnIncreasing size={23} aria-hidden="true" /></span><div><h2 id="home-lesson-title">Pag-unlad ng Aralin</h2><p>{pathPending ? 'Inihahanda ang iyong aralin…' : pathError ? 'Hindi ma-load ang aralin ngayon.' : allCompleted ? 'Ang galing! Natapos mo ang lahat ng aralin.' : current ? `Aralin ${currentIndex + 1} ng ${modules.length} — ${current.title}` : 'Handa ka na ba sa unang aralin?'}</p></div></div>
        {!pathError && !pathPending && <div className="home-lesson-progress" role="progressbar" aria-label="Pag-unlad sa kasalukuyang aralin" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><div><span style={{ width: `${percentage}%` }} /></div><strong>{percentage}%</strong></div>}
        <Link to={current ? `/student/learn/module/${current.id}` : '/student/learn'} className="home-purple-button home-lesson-button">{allCompleted ? 'Balikan ang mga Aralin' : current && percentage > 0 ? 'Ipagpatuloy ang Aralin' : 'Simulan ang Aralin'} <ArrowRight size={17} aria-hidden="true" /></Link><img src={lessonBooks} alt="" aria-hidden="true" />
      </section>
      <aside className="home-reminder-card home-panel"><div className="home-bottom-heading"><Lightbulb className="home-lightbulb" size={30} aria-hidden="true" /><h2>Maliit na Paalala</h2></div><ul>{['Magpahinga kung napapagod.', 'Gawin ang mga gawain nang maayos.', 'Huwag matakot magkamali.', 'Mas magiging magaling ka pa!'].map(reminder => <li key={reminder}><span><Check size={12} strokeWidth={4} aria-hidden="true" /></span>{reminder}</li>)}</ul><Heart className="home-reminder-heart" size={26} fill="currentColor" aria-hidden="true" /></aside>
    </div>
    {Boolean(assignments?.length) && <section className="home-assignment-card home-panel" aria-labelledby="home-assignment-title"><h2 id="home-assignment-title">Mga Gawaing May Takdang Araw</h2><ul>{assignments!.map(assignment => <li key={assignment.id}><Link to="/student/learn"><BookOpen size={20} aria-hidden="true" /><span>{assignment.pdf_materials?.title || 'Gawain sa Pagbasa'}</span><time dateTime={assignment.due_date!}>{new Date(assignment.due_date!).toLocaleDateString('fil-PH', { month: 'long', day: 'numeric' })}</time><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul></section>}
  </div>;
}
