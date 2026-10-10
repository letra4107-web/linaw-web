import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Heart, KeyRound, Lightbulb, LockKeyhole, Mic, Pencil, Plus, ShieldCheck, Sparkles, Star, UsersRound, X } from 'lucide-react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { Toggle } from '../../components/a11y/Toggle';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';
import { paginateModules } from './parentModulePagination';
import parentBackground from '../../assets/parent/parent-bg.png';
import childArtwork from '../../assets/parent/current.png';
import owlArtwork from '../../assets/students/mascot/owl-mascot.png';
import quoteBackground from '../../assets/students/aralin/aralin-journey-background.png';
import noEnrolledChildArt from '../../assets/parent/no enrolled child.png';
import noActivitiesArt from '../../assets/parent/no activities.png';
import './children-reference.css';

type FontSize = 'small' | 'medium' | 'large';
interface StudentAccessibility { dyslexia_font: boolean; font_size: FontSize; high_contrast: boolean; reading_guide: boolean; tts_enabled: boolean; }
interface Child { id: string; name: string; grade_level: number; username: string; level: string; xp: number; streak: number; activities_completed: number; accuracy_sum: number; total_attempts: number; progress_updated_at: string | null; }
interface CredentialSecurity { childId: string; status: 'legacy' | 'rotated_pending' | 'secure' | 'fully_retired' | 'missing'; requiresRotation: boolean; }
interface ModuleSummary { id: string; module_number: number; title: string; state: 'locked' | 'unlocked' | 'completed'; content_item_count: number; completed_content_item_count: number; }
interface PathResponse { configured: boolean; effective_level: string; modules: ModuleSummary[]; }
interface PracticeSession { id: string; word: string; accuracy_percentage: number; is_correct: boolean; created_at: string; }

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Maliit' }, { value: 'medium', label: 'Karaniwan' }, { value: 'large', label: 'Malaki' },
];
const ACCESSIBILITY_OPTIONS = [
  { key: 'dyslexia_font' as const, label: 'Madaling Basahing Font', description: 'Font na dinisenyo para sa dyslexia.' },
  { key: 'high_contrast' as const, label: 'Mataas na Contrast', description: 'Mas malinaw na kulay at hangganan.' },
  { key: 'reading_guide' as const, label: 'Gabay sa Pagbasa', description: 'Guide line habang nagbabasa.' },
  { key: 'tts_enabled' as const, label: 'Text-to-Speech', description: 'Pakinggan ang teksto sa app.' },
];

function percentage(completed: number, total: number) { return total > 0 ? Math.min(100, Math.round(completed / total * 100)) : 0; }
function ChildAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`kid-avatar${large ? ' kid-avatar-large' : ''}`} aria-label={name}><img src={childArtwork} alt="" /><span>{name.charAt(0).toUpperCase()}</span></span>;
}
function CardHeading({ icon, title, href }: { icon: ReactNode; title: string; href?: string }) {
  return <div className="kid-card-heading"><span>{icon}</span><h2>{title}</h2>{href && <Link to={href}>Tingnan Lahat <ArrowRight size={14} /></Link>}</div>;
}
function ProgressBar({ value }: { value: number }) { return <span className="kid-progress-track"><span style={{ width: `${value}%` }} /></span>; }

export function EnrollModal({ open, onClose, name, setName, grade, setGrade, onSubmit, pending, error }: { open: boolean; onClose: () => void; name: string; setName: (value: string) => void; grade: string; setGrade: (value: string) => void; onSubmit: () => void; pending: boolean; error?: string | null }) {
  const [step, setStep] = useState(1);
  useEffect(() => { if (open) setStep(1); }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose, pending]);
  if (!open) return null;
  return <div className="kid-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section className="kid-enroll-modal" role="dialog" aria-modal="true" aria-labelledby="kid-enroll-title">
      <button className="kid-modal-close" type="button" onClick={onClose} aria-label="Isara" disabled={pending}><X size={21} /></button>
      <header><span><UsersRound size={27} /></span><div><h2 id="kid-enroll-title">I-enroll ang Anak</h2><p>Simulan ang kanyang paglalakbay sa pagbasa.</p></div></header>
      <ol className="kid-enroll-steps">{['Impormasyon', 'Baitang', 'Kumpirmasyon'].map((label, index) => <li className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} key={label}><b>{step > index + 1 ? <CheckCircle2 size={17} /> : index + 1}</b>{label}</li>)}</ol>
      <form onSubmit={(event) => { event.preventDefault(); if (pending || !name.trim()) return; if (step < 3) setStep(step + 1); else onSubmit(); }}>
        <div className="kid-enroll-content"><div>
          {step === 1 ? <label>Buong Pangalan ng Anak<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Hal. Juan Dela Cruz" required /></label> : step === 2 ? <label>Baitang<select autoFocus value={grade} onChange={(event) => setGrade(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>Grade {item}</option>)}</select><small>Magsisimula siya sa Beginner reading level.</small></label> : <div className="kid-enroll-confirm"><ShieldCheck size={30} /><h3>{name}</h3><p>Grade {grade} · Beginner</p><p>Gagawa ng student account at temporary password para sa iyong anak.</p></div>}
        </div><aside><img src={noEnrolledChildArt} alt="" /><strong>Sama-sama sa bawat hakbang.</strong><p>May sariling reading activities, progreso, at reading support ang iyong anak.</p></aside></div>
        {error && <p className="kid-enroll-error" role="alert">{error}</p>}
        <footer><button type="button" onClick={() => step > 1 ? setStep(step - 1) : onClose()} disabled={pending}>{step > 1 ? 'Bumalik' : 'Kanselahin'}</button><button type="submit" className="kid-primary-button" disabled={pending || !name.trim()}>{pending ? 'Ini-enroll...' : step < 3 ? 'Susunod' : 'I-enroll ang Anak'}<ArrowRight size={16} /></button></footer>
      </form>
    </section>
  </div>;
}

export default function MyChildren() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [childName, setChildName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accessOpenId, setAccessOpenId] = useState<string | null>(null);
  const [temporaryCredential, setTemporaryCredential] = useState<{ username: string; password: string } | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [modulePage, setModulePage] = useState(1);
  const [modulesPerPage, setModulesPerPage] = useState(5);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const enrollRequestPending = useRef(false);
  const accessRequestPending = useRef(false);

  const { data: children, isLoading, isFetching: childrenFetching, error: childrenError, refetch: refetchChildren } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const result = await api<{ children: Child[] }>('/parent/children', { auth: true });
      return result.children.map((child) => ({ ...child, xp: Number(child.xp) || 0, streak: Number(child.streak) || 0, activities_completed: Number(child.activities_completed) || 0, accuracy_sum: Number(child.accuracy_sum) || 0, total_attempts: Number(child.total_attempts) || 0, level: child.level || 'Beginner' }));
    },
    enabled: Boolean(user),
  });
  const { data: credentialSecurity } = useQuery({
    queryKey: ['parent-credential-security', user?.id],
    queryFn: () => api<{ children: CredentialSecurity[] }>('/parent/children/credential-security', { auth: true }),
    enabled: Boolean(user),
  });
  const enrollChild = useMutation({
    mutationFn: (details: { childName: string; gradeLevel: number }) => api<{ success: boolean; username: string; temporaryPassword: string; level: string }>('/parent/children', { method: 'POST', auth: true, body: details }),
    onSuccess: (result, details) => {
      setSuccessMsg(`Nai-enroll si ${details.childName} bilang ${result.username} (${result.level} level).`);
      setTemporaryCredential({ username: result.username, password: result.temporaryPassword });
      setChildName(''); setGradeLevel('1'); setShowEnrollModal(false); setError(null);
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      queryClient.invalidateQueries({ queryKey: ['parent-credential-security'] });
    },
    onError: (err: Error) => setError(err.message),
    onSettled: () => { enrollRequestPending.current = false; },
  });
  const submitEnrollment = () => {
    if (enrollRequestPending.current || enrollChild.isPending || !childName.trim()) return;
    enrollRequestPending.current = true;
    setError(null);
    enrollChild.mutate({ childName: childName.trim(), gradeLevel: Number(gradeLevel) });
  };
  const { data: accessSettings, isLoading: accessLoading, isFetching: accessFetching, error: accessError, refetch: refetchAccess } = useQuery({
    queryKey: ['child-accessibility', accessOpenId],
    queryFn: () => api<{ settings: StudentAccessibility }>(`/parent/children/${accessOpenId}/settings`, { auth: true }),
    enabled: Boolean(accessOpenId),
  });
  const updateAccess = useMutation({
    mutationFn: ({ childId: targetChildId, patch }: { childId: string; patch: Partial<StudentAccessibility> }) => api(`/parent/children/${targetChildId}/settings`, { method: 'PATCH', auth: true, body: patch }),
    onSuccess: (_result, { childId: targetChildId }) => queryClient.invalidateQueries({ queryKey: ['child-accessibility', targetChildId] }),
    onError: (err: Error) => setError(err.message),
    onSettled: () => { accessRequestPending.current = false; },
  });
  const submitAccessPatch = (targetChildId: string, patch: Partial<StudentAccessibility>) => {
    if (accessRequestPending.current || updateAccess.isPending) return;
    accessRequestPending.current = true;
    setError(null);
    updateAccess.mutate({ childId: targetChildId, patch });
  };
  const resetPassword = useMutation({
    mutationFn: (childId: string) => api<{ username: string; temporaryPassword: string }>(`/parent/children/${childId}/reset-password`, { method: 'POST', auth: true }),
    onSuccess: (result) => { setTemporaryCredential({ username: result.username, password: result.temporaryPassword }); setError(null); queryClient.invalidateQueries({ queryKey: ['parent-credential-security'] }); },
    onError: (err: Error) => setError(err.message),
  });
  const selectedChild = children?.find((child) => child.id === params.get('child')) ?? children?.[0];
  const childId = selectedChild?.id;
  const { data: readingProfile } = useQuery({
    queryKey: ['parent-reading-profile', childId],
    queryFn: () => api<{ profile: ReadingProfile }>(`/parent/children/${childId}/reading-profile`, { auth: true }),
    enabled: Boolean(childId),
  });
  const { data: learningPath, isLoading: pathLoading, error: pathError, refetch: refetchPath } = useQuery({
    queryKey: ['parent-learning-path', childId],
    queryFn: () => api<PathResponse>(`/parent/children/${childId}/learning-path`, { auth: true }),
    enabled: Boolean(childId),
  });
  const { data: sessions, error: sessionsError } = useQuery({
    queryKey: ['parent-children-recent-sessions', childId],
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from('pronunciation_practice_sessions').select('id,word,accuracy_percentage,is_correct,created_at').eq('student_id', childId!).order('created_at', { ascending: false }).limit(4);
      if (queryError) throw queryError;
      return data as PracticeSession[];
    },
    enabled: Boolean(childId),
  });
  const modules = learningPath?.modules ?? [];
  const { page: currentModulePage, pageCount: modulePageCount, startIndex: firstModuleIndex, start: firstVisibleModule, end: lastVisibleModule, rows: visibleModules, pages: modulePages } = paginateModules(modules, modulePage, modulesPerPage);
  useEffect(() => { setModulePage(1); setExpandedModuleId(null); }, [childId]);
  useEffect(() => { setModulePage((page) => Math.min(page, modulePageCount)); }, [modulePageCount]);
  const changeModulePage = (page: number) => {
    setModulePage(Math.max(1, Math.min(page, modulePageCount)));
    setExpandedModuleId(null);
  };
  const totalActivities = modules.reduce((sum, module) => sum + module.content_item_count, 0);
  const completedActivities = modules.length ? modules.reduce((sum, module) => sum + module.completed_content_item_count, 0) : readingProfile?.profile.completedContentCount ?? selectedChild?.activities_completed ?? 0;
  const completedModules = modules.filter((module) => module.state === 'completed').length;
  const averageScore = readingProfile?.profile.averageAccuracy ?? (selectedChild?.total_attempts ? Math.round(selectedChild.accuracy_sum / selectedChild.total_attempts) : null);
  const currentModule = modules.find((module) => module.state === 'unlocked') ?? modules.find((module) => module.state !== 'completed') ?? modules.at(-1);
  const currentProgress = currentModule ? percentage(currentModule.completed_content_item_count, currentModule.content_item_count) : 0;
  const credential = credentialSecurity?.children.find((item) => item.childId === childId);
  const progressLink = `/parent/progress${childId ? `?child=${childId}` : ''}`;
  const currentModuleTitle = currentModule?.title ?? 'Unang reading activity';

  return <div className="children-portal">
    <header className="kid-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(255,251,229,.94),rgba(255,251,229,.85) 33%,rgba(255,255,255,0) 61%),url(${parentBackground})` }}>
      <div className="kid-hero-copy"><h1><UsersRound aria-hidden="true" />Mga Anak Ko</h1><p>Tingnan ang progreso, aktibidad, at reading support ng bawat anak. Sama-sama tayo sa kanilang paglalakbay sa pagbasa!</p></div>
      <div className="kid-hero-note">Bawat maliit<br />na progreso ay<br />malaking panalo!<Heart size={22} fill="currentColor" aria-hidden="true" /></div>
    </header>

    {error && <div className="kid-feedback kid-feedback-error" role="alert">{error}<button type="button" onClick={() => setError(null)} aria-label="Isara ang mensahe"><X size={17} /></button></div>}
    {childrenError && <div className="kid-feedback kid-feedback-error" role="alert">Hindi makuha ang mga account. {childrenError.message}<button type="button" disabled={childrenFetching} style={{ width: 'auto', height: 'auto', padding: '7px 10px', flexShrink: 0, whiteSpace: 'nowrap' }} onClick={() => void refetchChildren()}>{childrenFetching ? 'Kinukuha...' : 'Subukan muli'}</button></div>}
    {successMsg && <div className="kid-feedback kid-feedback-success" role="status"><CheckCircle2 size={19} />{successMsg}<button type="button" onClick={() => setSuccessMsg(null)} aria-label="Isara ang mensahe"><X size={17} /></button></div>}
    {temporaryCredential && <section className="kid-temporary-credential" role="status"><KeyRound size={23} /><div><h2>Isulat ang temporary credential ngayon.</h2><p>Username: <strong>{temporaryCredential.username}</strong> · Password: <strong>{temporaryCredential.password}</strong></p><small>Hindi na ito maipapakita muli. Naipadala rin ito sa iyong email kung available.</small></div><button type="button" onClick={() => setTemporaryCredential(null)}>Naitala ko na</button></section>}

    <div className="kid-page-grid">
      <aside className="kid-roster-column">
        <section className="kid-roster kid-panel">
          <div className="kid-roster-heading"><h2>Aking mga Anak</h2><button type="button" className="kid-primary-button" onClick={() => setShowEnrollModal(true)}><Plus size={15} />Magdagdag ng Anak</button></div>
          <div className="kid-roster-list">{isLoading ? <p className="kid-empty-text">Kinukuha ang mga account...</p> : children?.length ? children.map((child) => <button type="button" className={`kid-roster-item${child.id === childId ? ' selected' : ''}`} aria-pressed={child.id === childId} onClick={() => { const next = new URLSearchParams(params); next.set('child', child.id); setParams(next, { replace: true }); setEditingId(null); setAccessOpenId(null); }} key={child.id}>
            <ChildAvatar name={child.name} /><span><strong>{child.name}</strong><small>Grade {child.grade_level} · {child.level}</small></span><ChevronRight size={18} />
          </button>) : <div className="kid-roster-empty"><img src={noEnrolledChildArt} alt="" /><p>Wala ka pang naka-enroll na anak.</p><small>Idagdag ang iyong anak para masubaybayan ang kanyang pag-unlad.</small></div>}</div>
        </section>
        <section className="kid-quote" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,250,229,.2),rgba(255,250,229,.05)),url(${quoteBackground})` }} aria-label="Paalala sa magulang">
          <Sparkles size={26} className="kid-quote-sparkle" aria-hidden="true" /><blockquote>“Ang tuloy-tuloy<br />na gabay ngayon,<br />mas maliwanag<br />na pagbabasa<br />bukas.” <Heart size={21} fill="currentColor" aria-hidden="true" /></blockquote><img src={owlArtwork} alt="" />
        </section>
      </aside>

      {selectedChild ? <div className="kid-main-column">
        <section className="kid-profile-card kid-panel">
          <div className="kid-profile-heading"><ChildAvatar name={selectedChild.name} large /><div><div className="kid-profile-name"><h2>{selectedChild.name}</h2><span>Naka-enroll</span></div><p>Grade {selectedChild.grade_level} · {selectedChild.level}</p><small>Huling update: {selectedChild.progress_updated_at ? new Date(selectedChild.progress_updated_at).toLocaleString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Wala pang reading activity'}</small></div><button type="button" className="kid-edit-button" aria-expanded={editingId === childId} onClick={() => setEditingId(editingId === childId ? null : childId!)}><Pencil size={16} />I-edit ang Reading Support</button></div>
          <div className="kid-metrics">
            <article className="kid-metric violet"><BookOpen aria-hidden="true" /><div><strong>{completedModules} / {modules.length || '—'}</strong><small>Mga Modyul</small></div><ProgressBar value={percentage(completedModules, modules.length)} /><b>{percentage(completedModules, modules.length)}%</b></article>
            <article className="kid-metric mint"><ClipboardCheck aria-hidden="true" /><div><strong>{completedActivities}</strong><small>Mga Aktibidad</small></div><ProgressBar value={percentage(completedActivities, totalActivities)} /><b>{percentage(completedActivities, totalActivities)}%</b></article>
            <article className="kid-metric gold"><Star fill="currentColor" aria-hidden="true" /><div><strong>{averageScore === null ? '—' : `${Math.round(averageScore)}%`}</strong><small>Average Score</small></div><ProgressBar value={averageScore ?? 0} /></article>
            <article className="kid-metric rose"><BarChart3 aria-hidden="true" /><div><strong>{selectedChild.level}</strong><small>Kasalukuyang Level</small></div><span className="kid-level-caption">{selectedChild.xp} XP · {selectedChild.streak} araw na streak</span></article>
          </div>
        </section>

        {editingId === childId && <section className="kid-account-panel kid-panel">
          <CardHeading icon={<ShieldCheck size={21} />} title="Account at Reading Support" />
          <div className="kid-account-info"><span>@{selectedChild.username}</span><span className={credential?.requiresRotation ? 'needs-update' : ''}>{credential?.requiresRotation ? 'Kailangang i-update ang password' : credential && credential.status !== 'missing' ? 'Ligtas ang password' : 'Student account'}</span></div>
          <div className="kid-automatic-level"><BookOpen size={20} /><div><strong>Reading level: {selectedChild.level}</strong><p>Awtomatikong maa-unlock ang susunod na level kapag nakumpleto ang mga modyul at naabot ang passing score.</p></div></div>
          <div className="kid-account-actions"><button type="button" onClick={() => setAccessOpenId(accessOpenId === childId ? null : childId!)} aria-expanded={accessOpenId === childId}><BookOpen size={17} />Reading Support</button><button type="button" disabled={resetPassword.isPending} onClick={() => { if (window.confirm(`Gumawa ng bagong password para kay ${selectedChild.name}? Hindi na gagana ang lumang password.`)) resetPassword.mutate(selectedChild.id); }}><KeyRound size={17} />{resetPassword.isPending ? 'Gumagawa...' : 'Bagong Password'}</button></div>
        </section>}

        {accessOpenId === childId && <section className="kid-accessibility-panel kid-panel"><CardHeading icon={<BookOpen size={21} />} title={`Reading Support ni ${selectedChild.name}`} /><p>Awtomatikong lalabas sa student dashboard ang mga pagbabago.</p>{accessLoading ? <p>Kinukuha ang settings...</p> : accessError ? <div role="alert"><p>Hindi makuha ang reading support settings. {accessError.message}</p><button type="button" className="kid-module-retry" disabled={accessFetching} onClick={() => void refetchAccess()}>{accessFetching ? 'Kinukuha...' : 'Subukan muli'}</button></div> : accessSettings && <fieldset className="kid-accessibility-grid" disabled={updateAccess.isPending} aria-busy={updateAccess.isPending} aria-label={`Reading support settings ni ${selectedChild.name}`} style={{ margin: 0, marginTop: 15, padding: 0, border: 0, minWidth: 0 }}>{ACCESSIBILITY_OPTIONS.map((setting) => <div key={setting.key}><span><strong>{setting.label}</strong><small>{setting.description}</small></span><Toggle on={accessSettings.settings[setting.key]} onClick={() => submitAccessPatch(selectedChild.id, { [setting.key]: !accessSettings.settings[setting.key] })} label={setting.label} /></div>)}<div className="kid-font-setting"><strong>Laki ng Teksto</strong><span>{FONT_SIZE_OPTIONS.map((option) => <button key={option.value} type="button" disabled={updateAccess.isPending} aria-pressed={accessSettings.settings.font_size === option.value} className={accessSettings.settings.font_size === option.value ? 'selected' : ''} onClick={() => submitAccessPatch(selectedChild.id, { font_size: option.value })}>{option.label}</button>)}</span></div></fieldset>}</section>}

        <div className="kid-detail-grid">
          <section className="kid-modules kid-panel"><CardHeading icon={<BookOpen size={24} />} title="Progreso sa Bawat Modyul" href={progressLink} /><p className="kid-panel-description">Tingnan ang kumpletong listahan ng modyul at progreso ni {selectedChild.name}.</p>
            {pathLoading ? <div className="kid-module-loading" role="status">Kinukuha ang mga modyul...</div> : pathError ? <div className="kid-empty-text" role="alert"><p>Hindi makuha ang mga modyul sa ngayon.</p><button type="button" className="kid-module-retry" onClick={() => void refetchPath()}>Subukan muli</button></div> : modules.length ? <>
              <div className="kid-module-table-controls"><label>Mga row bawat pahina<select value={modulesPerPage} onChange={(event) => { setModulesPerPage(Number(event.target.value)); setModulePage(1); setExpandedModuleId(null); }} aria-label="Mga modyul bawat pahina">{[5, 10, 20].map((count) => <option key={count} value={count}>{count}</option>)}</select></label><span>{modules.length} modyul</span></div>
              <div className="kid-module-table-scroll" tabIndex={0} role="region" aria-label={`Talaan ng progreso ng mga modyul ni ${selectedChild.name}`}>
                <table className="kid-module-table"><caption className="sr-only">Progreso sa Bawat Modyul ni {selectedChild.name}</caption><thead><tr><th scope="col">#</th><th scope="col">Modyul</th><th scope="col">Aktibidad</th><th scope="col">Status</th><th scope="col">Progreso</th><th scope="col">Detalye</th></tr></thead><tbody>{visibleModules.map((module, index) => {
                  const value = percentage(module.completed_content_item_count, module.content_item_count);
                  const done = module.state === 'completed'; const locked = module.state === 'locked';
                  const status = done ? 'Tapos na' : locked ? 'Naka-lock' : module.completed_content_item_count > 0 ? 'Isinasagawa' : 'Hindi Pa Nagsisimula';
                  const expanded = expandedModuleId === module.id;
                  return <Fragment key={module.id}><tr className={`kid-module-row tone-${(firstModuleIndex + index) % 5}`}><td><span className="kid-module-number">{module.module_number}</span></td><th scope="row">{module.title}</th><td className="kid-module-count">{module.completed_content_item_count} / {module.content_item_count}</td><td><span className={`kid-module-status ${done ? 'done' : locked ? 'locked' : module.completed_content_item_count > 0 ? 'started' : 'ready'}`}>{done ? <CheckCircle2 size={12} /> : locked ? <LockKeyhole size={11} /> : module.completed_content_item_count > 0 ? <Sparkles size={12} /> : null}{status}</span></td><td><div className="kid-module-progress"><ProgressBar value={value} /><b>{value}%</b></div></td><td><button type="button" className="kid-module-details-button" aria-label={`${expanded ? 'Isara' : 'Tingnan'} ang detalye ng ${module.title}`} aria-expanded={expanded} aria-controls={`kid-module-details-${module.id}`} onClick={() => setExpandedModuleId(expanded ? null : module.id)}>{expanded ? 'Isara' : 'Tingnan'}{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></td></tr>{expanded && <tr id={`kid-module-details-${module.id}`} className="kid-module-details-row"><td colSpan={6}><div><BookOpen size={19} aria-hidden="true" /><span><strong>Modyul {module.module_number}: {module.title}</strong><p>{module.completed_content_item_count} sa {module.content_item_count} aktibidad ang nakumpleto · {value}% progreso.</p><p>{done ? 'Nakumpleto na ang modyul na ito.' : locked ? 'Kumpletuhin ang mga naunang modyul at abutin ang passing score upang ma-unlock ito.' : 'Available ang modyul na ito sa student account ng iyong anak.'}</p></span></div></td></tr>}</Fragment>;
                })}</tbody></table>
              </div>
              <footer className="kid-module-pagination"><p role="status" aria-live="polite">{firstVisibleModule}–{lastVisibleModule} sa {modules.length} modyul</p><nav aria-label="Mga pahina ng modyul"><button type="button" aria-label="Nakaraang pahina ng mga modyul" disabled={currentModulePage === 1} onClick={() => changeModulePage(currentModulePage - 1)}><ChevronLeft size={16} /></button>{modulePages.map((page, index) => <Fragment key={page}>{index > 0 && page - modulePages[index - 1] > 1 && <span className="kid-page-ellipsis" aria-hidden="true">…</span>}<button type="button" aria-label={`Pahina ${page} ng mga modyul`} aria-current={page === currentModulePage ? 'page' : undefined} onClick={() => changeModulePage(page)}>{page}</button></Fragment>)}<button type="button" aria-label="Susunod na pahina ng mga modyul" disabled={currentModulePage === modulePageCount} onClick={() => changeModulePage(currentModulePage + 1)}><ChevronRight size={16} /></button></nav></footer>
            </> : <div className="kid-no-modules"><img src={noActivitiesArt} alt="" /><p>Wala pang nakaayos na modyul para sa antas na ito.</p></div>}
          </section>
          <aside className="kid-detail-side">
            <section className="kid-current-module kid-panel"><CardHeading icon={<BookOpen size={22} />} title="Kasalukuyang Modyul" /><div className="kid-current-content"><img src={childArtwork} alt="" /><div><strong>{currentModuleTitle}</strong><small>{currentModule ? `Modyul ${currentModule.module_number} · ${currentModule.completed_content_item_count} / ${currentModule.content_item_count} aktibidad` : 'Ihahanda ang iyong reading path.'}</small><div className="kid-current-progress"><ProgressBar value={currentProgress} /><b>{currentProgress}%</b></div><Link className="kid-primary-button" to={progressLink}>Tingnan ang Progreso <ArrowRight size={14} /></Link></div></div></section>
            <section className="kid-recent kid-panel"><CardHeading icon={<ClipboardCheck size={22} />} title="Kamakailang Aktibidad" href={`${progressLink}&tab=activities`} /><div className="kid-recent-list">{sessions?.length ? sessions.map((session, index) => <Link key={session.id} to={`${progressLink}&tab=activities`} className={`kid-recent-item tone-${index % 4}`}><span>{session.is_correct ? <CheckCircle2 size={20} /> : <Mic size={20} />}</span><div><strong>{session.is_correct ? 'Nakumpleto ang Pagsasanay' : 'Nag-practice sa Pagbigkas'}{session.word ? `: ${session.word}` : ''}</strong><small>{new Date(session.created_at).toLocaleString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></div><ChevronRight size={16} /></Link>) : <div className="kid-recent-empty"><img src={noActivitiesArt} alt="" /><p>{sessionsError ? 'Hindi makuha ang mga aktibidad ngayon.' : 'Dito makikita ang mga unang tagumpay niya sa pagbasa.'}</p></div>}</div></section>
            <section className="kid-recommendations kid-panel"><CardHeading icon={<Lightbulb size={23} />} title="Mga Rekomendasyon" href={progressLink} /><Link to={progressLink}><span><Lightbulb size={23} /></span><div><strong>{currentModule ? `Magpatuloy sa ${currentModule.title}` : 'Simulan ang reading journey'}</strong><small>{readingProfile?.profile.recommendedHomePractice || 'Maglaan ng ilang minuto sa pagbabasa nang magkasama.'}</small></div><ChevronRight size={16} /></Link></section>
          </aside>
        </div>
      </div> : <section className="kid-start-panel kid-panel"><img src={noEnrolledChildArt} alt="" /><h2>{isLoading ? 'Kinukuha ang mga account...' : 'Simulan ang paglalakbay ng iyong anak'}</h2><p>Mag-enroll ng anak upang makita ang kanyang mga modyul, gawain, at progreso sa pagbasa.</p><button type="button" className="kid-primary-button" onClick={() => setShowEnrollModal(true)}><Plus size={18} />Magdagdag ng Anak</button></section>}
    </div>
    <EnrollModal open={showEnrollModal} onClose={() => setShowEnrollModal(false)} name={childName} setName={setChildName} grade={gradeLevel} setGrade={setGradeLevel} pending={enrollChild.isPending} error={error} onSubmit={submitEnrollment} />
  </div>;
}
