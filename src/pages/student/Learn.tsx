import { useRef, useState, type KeyboardEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronDown, FileText, Heart, LockKeyhole, Target } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { PdfReadingAssistant } from '../../components/PdfReadingAssistant';
import { PdfDrillPractice } from '../../components/PdfDrillPractice';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import { compactModuleDescription, groupLearnModules, learnModuleArt, learnModulePercent, type LearnModule } from '../../lib/learnPresentation';
import lessonBooks from '../../assets/students/home/lesson-books.png';
import alphabetBlocks from '../../assets/students/learn-reference/alphabet-blocks.png';
import readingStar from '../../assets/badges/Aking Unang Tagumpay.png';
import tagalogModuleIcons from '../../assets/students/learn-reference/tagalog-module-icons.png';
import './learn-reference.css';
import './learn-modules.css';

interface PathResponse { configured: boolean; effective_level: string; modules: LearnModule[] }
interface PdfAssignment {
  id: string; status: string; due_date: string | null;
  pdf_materials: { id: string; title: string; extracted_text: string | null; file_url: string; drill_status: string | null } | null;
}
const PDF_STATUS_LABEL: Record<string, { icon: string; label: string }> = {
  assigned: { icon: '✨', label: 'Bago' }, in_progress: { icon: '⏳', label: 'Ginagawa' }, completed: { icon: '✓', label: 'Tapos na' },
};
type Tab = 'modules' | 'pdf';

function ModulePicture({ module, alphabet }: { module: LearnModule; alphabet: boolean }) {
  const art = learnModuleArt(module);
  return <div className={`learn-ref-module-art learn-ref-art-${art.color}`} aria-hidden={alphabet || !art.exampleWord ? true : undefined}>
    {alphabet || !art.exampleWord ? <img src={alphabet ? alphabetBlocks : readingStar} alt="" /> : <>
      <span className="learn-ref-example-picture">
        <svg className="learn-ref-art-emoji" data-sprite={art.sprite} viewBox={art.pictureViewBox ?? undefined} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><image href={tagalogModuleIcons} width="1619" height="972" /></svg>
        <span className="learn-ref-example-word"><span className="sr-only">Halimbawa: </span>{art.exampleWord}</span>
      </span>
      <strong aria-hidden="true">{art.syllable}</strong>
    </>}
  </div>;
}

const MODULE_CONTENT_LABELS: Record<string, string> = {
  phonetic: 'Mga tunog at pantig', syllable: 'Pagbasa ng mga pantig',
  word: 'Pagbasa ng mga salita', phrase: 'Pagbasa ng mga parirala',
  sentence: 'Pagbasa ng mga pangungusap', paragraph: 'Pagbasa at pag-unawa', story: 'Pagbasa ng kuwento',
};

function ModuleCard({ module, modules, alphabet, current, expanded, onToggle }: {
  module: LearnModule; modules: LearnModule[]; alphabet: boolean;
  current: boolean; expanded: boolean; onToggle: () => void;
}) {
  const percent = learnModulePercent(module);
  const locked = module.state === 'locked';
  const completed = module.state === 'completed';
  const previous = [...modules].sort((a, b) => a.module_number - b.module_number).find(item => item.module_number < module.module_number && item.state !== 'completed');
  const titleId = `learn-module-title-${module.id}`;
  const detailId = `learn-module-details-${module.id}`;
  const count = Math.max(0, module.content_item_count);
  const done = Math.min(count, Math.max(0, module.completed_content_item_count));
  const description = compactModuleDescription(module.description, module.instructional_content_type);
  const typeLabel = MODULE_CONTENT_LABELS[module.instructional_content_type] ?? 'Gawain sa pagbasa';
  const status = completed ? 'Natapos na' : locked ? 'Naka-lock' : current ? 'Kasalukuyang modyul' : 'Handa nang simulan';

  return <article id={`learn-module-${module.id}`} className={`learn-ref-module learn-ref-module-${module.state} learn-course-module`} data-current={current} aria-current={current ? 'step' : undefined} aria-labelledby={titleId}>
    <div className="learn-course-header">
      <span className="learn-course-number" role="img" aria-label={`Modyul ${module.module_number}${completed ? ', tapos na' : ''}`}>{completed ? <Check size={23} aria-hidden="true" /> : String(module.module_number).padStart(2, '0')}</span>
      <div className="learn-course-picture"><ModulePicture module={module} alphabet={alphabet} /></div>
      <div className="learn-course-summary">
        <p className="learn-course-type">Modyul {module.module_number} · {typeLabel}</p>
        <h3 id={titleId}><button type="button" className="learn-course-toggle" aria-expanded={expanded} aria-controls={detailId} onClick={onToggle}><span>{module.title}</span><ChevronDown size={19} aria-hidden="true" /></button></h3>
        <p className="learn-course-preview">{description || 'Basahin, pakinggan, at bigkasin ang mga gawain sa araling ito.'}</p>
        <span className="learn-course-details-hint">{expanded ? 'Nabuksan ang detalye' : 'Pindutin ang pamagat para sa detalye'}</span>
      </div>
      <div className="learn-course-actions">
        <span className="learn-course-status">{completed ? <Check size={14} aria-hidden="true" /> : locked ? <LockKeyhole size={13} aria-hidden="true" /> : <BookOpen size={13} aria-hidden="true" />}{status}</span>
        <div className="learn-course-completion"><span>{done}/{count} gawain</span><strong>{percent}%</strong></div>
        <div className="learn-ref-module-progress" role="progressbar" aria-label={`Progreso sa ${module.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span><i style={{ width: `${percent}%` }} /></span></div>
        {locked ? <span className="learn-course-lock-hint"><LockKeyhole size={14} aria-hidden="true" />{previous ? `Tapusin muna ang Modyul ${previous.module_number}.` : 'Hindi pa bukas ang modyul.'}</span> :
          <Link className="learn-ref-start learn-module-open" to={`/student/learn/module/${module.id}`} aria-label={`${completed ? 'Balikan' : percent > 0 ? 'Ipagpatuloy' : 'Simulan'}: ${module.title}`}>{completed ? 'Balikan ang Modyul' : percent > 0 ? 'Ipagpatuloy ang Modyul' : 'Simulan ang Modyul'}<ArrowRight size={16} aria-hidden="true" /></Link>}
      </div>
    </div>
    <div id={detailId} className="learn-course-details" hidden={!expanded}>
      <div className="learn-module-objective"><h4><Target size={16} aria-hidden="true" />Pag-aaralan</h4><p>{description || 'Basahin, pakinggan, at bigkasin ang mga gawain sa araling ito.'}</p></div>
      <div className="learn-module-contents"><h4><BookOpen size={16} aria-hidden="true" />Nilalaman</h4><p>{count} gawain</p>{module.assessment_id && <p>May pagsusulit pagkatapos ng mga gawain.</p>}</div>
      <div className="learn-course-method"><h4>Paraan ng pagsasanay</h4><ol className="learn-module-method" aria-label="Paraan ng pagsasanay"><li><span>1</span>Makinig</li><li><span>2</span>Basahin</li><li><span>3</span>Bigkasin</li></ol></div>
    </div>
  </article>;
}

function ModulesTab() {
  const { user } = useAuth();
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['student-learn-path'], refetchOnMount: 'always',
    queryFn: () => api<PathResponse>('/student/learn/path', { auth: true }), enabled: Boolean(user),
  });
  const modules = data?.modules ?? [];
  const completed = modules.filter(module => module.state === 'completed').length;
  const percent = modules.length ? Math.round(completed / modules.length * 100) : 0;
  const stages = groupLearnModules(modules, data?.effective_level ?? '');
  const currentModule = [...modules].sort((a, b) => a.module_number - b.module_number).find(module => module.state === 'unlocked');
  const expandedId = expandedModuleId === undefined ? currentModule?.id : expandedModuleId;
  return <div className="learn-ref-modules">
    <QueryErrorNotice error={error} onRetry={() => { void refetch(); }} message="Hindi ma-load ang iyong mga modyul. Pakisubukang muli." />
    {isPending && <div className="learn-ref-empty" role="status"><span aria-hidden="true">📚</span><p>Inihahanda ang iyong mga aralin…</p></div>}
    {data && <section className="learn-ref-path" aria-labelledby="learn-ref-path-title">
      <span className="learn-ref-path-icon"><Target size={35} aria-hidden="true" /></span>
      <div className="learn-ref-path-content"><div className="learn-ref-path-heading"><div><h2 id="learn-ref-path-title">Iyong Landas</h2><p>Antas: <strong>{data.effective_level}</strong></p></div><span>{completed}/{modules.length} modyul</span></div>
        <div className="learn-ref-path-progress" role="progressbar" aria-label="Kabuuang progreso sa mga modyul" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span><i style={{ width: `${percent}%` }} /></span><strong>{percent}%</strong></div>
        <p className="learn-ref-path-note">{modules.length > 0 && completed === modules.length ? 'Ang galing! Natapos mo ang lahat ng modyul sa antas na ito.' : 'Magandang simula! Ipagpatuloy lang.'}</p>
      </div><img src={lessonBooks} alt="" aria-hidden="true" />
    </section>}
    {data && !modules.length && <div className="learn-ref-empty"><span aria-hidden="true">📖</span><h2>Abangan ang iyong mga aralin!</h2><p>Wala pang modyul na handa para sa iyong antas. Balikan natin mamaya.</p></div>}
    {modules.length > 0 && <div className="learn-course-guide"><p><BookOpen size={17} aria-hidden="true" />Buksan ang pamagat ng modyul para makita ang detalye.</p>{currentModule && <a href={`#learn-module-${currentModule.id}`}>Pumunta sa modyul ko <ArrowRight size={15} aria-hidden="true" /></a>}</div>}
    <div className="learn-ref-timeline" role="group" aria-label="Landas ng mga modyul">
      {stages.map(stage => {
        const stageCompleted = stage.modules.filter(module => module.state === 'completed').length;
        return <section key={stage.number} className={`learn-ref-stage learn-ref-stage-${stage.tone}`} data-active={stage.modules.some(module => module.id === currentModule?.id)} aria-labelledby={`learn-stage-${stage.number}`}>
          <span className="learn-ref-stage-number" aria-hidden="true">{stage.number}</span>
          <header className="learn-ref-stage-heading"><span className="learn-ref-stage-icon" aria-hidden="true">{stage.icon}</span><div><h2 id={`learn-stage-${stage.number}`}>{stage.title}</h2><p>{stage.description}</p></div><span className="learn-ref-stage-count">{stageCompleted}/{stage.modules.length} nakumpleto</span></header>
          <div className="learn-ref-card-grid">{stage.modules.map(module => <ModuleCard key={module.id} module={module} modules={modules} alphabet={data?.effective_level === 'Beginner' && module.module_number === 1} current={module.id === currentModule?.id} expanded={module.id === expandedId} onToggle={() => setExpandedModuleId(module.id === expandedId ? null : module.id)} />)}</div>
        </section>;
      })}
    </div>
  </div>;
}

function PdfTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

  const { data: assignments, isLoading, error, refetch } = useQuery({
    queryKey: ['student-pdf-assignments', user?.id],
    queryFn: async () => {
      const { data: child, error: childError } = await supabase.from('children').select('id').eq('auth_uid', user!.id).maybeSingle();
      if (childError) throw childError;
      if (!child) return [];
      const { data, error } = await supabase
        .from('pdf_assignments')
        .select('id, status, due_date, pdf_materials(id, title, extracted_text, file_url, drill_status)')
        .eq('student_id', child.id)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return ((data as unknown as PdfAssignment[]) || []).filter((assignment) => assignment.pdf_materials !== null);
    },
    enabled: Boolean(user),
  });

  const openAssignment = assignments?.find((assignment) => assignment.id === openAssignmentId);

  return (
    <div className="flex flex-col gap-5">
      <QueryErrorNotice error={error} onRetry={() => { void refetch(); }} message="Hindi ma-load ang mga materyales mula sa guro. Pakisubukang muli." />
      {!openAssignmentId && <p className="text-[var(--color-text-muted)]">Basahin nang malakas ang mga materyal na ibinigay ng iyong guro.</p>}
      {isLoading && <p className="rounded-2xl bg-white/60 p-5 text-[var(--color-text-muted)]">Inihahanda ang iyong mga PDF...</p>}

      {!openAssignmentId && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(assignments ?? []).map((assignment, index) => {
            const status = PDF_STATUS_LABEL[assignment.status] ?? PDF_STATUS_LABEL.assigned;
            return (
              <li key={assignment.id} className="flex min-w-0 flex-col gap-4 rounded-3xl border p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised" style={cardStyle(CARD_COLORS[index % CARD_COLORS.length])}>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-2xl" aria-hidden="true">📄</span>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${assignment.status === 'completed' ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-white/70 text-[var(--color-text-muted)]'}`}><IconLabel icon={status.icon} label={status.label} /></span>
                </div>
                <h2 className="line-clamp-2 text-lg leading-snug font-bold">{assignment.pdf_materials?.title}</h2>
                {assignment.due_date && <p className="text-sm text-[var(--color-text-muted)]">Takdang araw: <time dateTime={assignment.due_date} className="font-bold">{new Date(assignment.due_date).toLocaleDateString('fil-PH', { month: 'long', day: 'numeric' })}</time></p>}
                <button type="button" onClick={() => setOpenAssignmentId(assignment.id)} className="mt-auto inline-flex min-h-11 items-center justify-center self-stretch rounded-2xl bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-[0.98]"><IconLabel icon="📖" label={assignment.status === 'in_progress' ? 'Ipagpatuloy' : 'Buksan'} /></button>
              </li>
            );
          })}
          {assignments && assignments.length === 0 && <li className="col-span-full rounded-3xl border border-dashed border-[var(--color-border)] bg-white/45 p-8 text-center text-[var(--color-text-muted)]">Wala ka pang naka-assign na PDF.</li>}
        </ul>
      )}

      {openAssignment?.pdf_materials && (
        <div className="flex min-w-0 flex-col gap-4">
          <button type="button" onClick={() => { setOpenAssignmentId(null); queryClient.invalidateQueries({ queryKey: ['student-pdf-assignments'] }); }} className="inline-flex min-h-11 items-center self-start rounded-full px-4 py-2 text-sm font-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)]">← Bumalik sa listahan</button>
          <div className="overflow-hidden rounded-3xl p-5 text-white shadow-hero sm:p-7" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))' }}>
            <p className="text-sm font-bold text-white/80"><IconLabel icon="📄" label="Pagbasa ng PDF" /></p>
            <h2 className="mt-1 break-words text-2xl font-bold">{openAssignment.pdf_materials.title}</h2>
          </div>
          {openAssignment.pdf_materials.drill_status === 'published' ? <PdfDrillPractice assignmentId={openAssignment.id} /> : <PdfReadingAssistant material={openAssignment.pdf_materials} assignmentId={openAssignment.id} mode="student" />}
        </div>
      )}
    </div>
  );
}


export default function Learn() {
  const [tab, setTab] = useState<Tab>('modules');
  const tabsRef = useRef<HTMLDivElement>(null);
  const selectTab = (value: Tab) => {
    setTab(value);
    tabsRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${value}"]`)?.focus();
  };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    selectTab(event.key === 'Home' ? 'modules' : event.key === 'End' ? 'pdf' : tab === 'modules' ? 'pdf' : 'modules');
  };
  return <div className="student-learn-reference student-learn-course-list">
    <header className="learn-ref-hero"><div className="learn-ref-hero-illustration" aria-hidden="true" /><div className="learn-ref-hero-copy"><p>Ipagpatuloy ang pagkatuto</p><h1>Aralin</h1><p>Piliin ang modyul at simulan<br />ang iyong paglalakbay sa pagbasa!</p></div><blockquote className="learn-ref-quote">Bawat aralin,<br />isang hakbang<br />patungo sa mas<br />malaking<br />tagumpay!<Heart size={18} fill="currentColor" aria-hidden="true" /></blockquote></header>
    <div ref={tabsRef} className="learn-ref-tabs" role="tablist" aria-label="Uri ng aralin">
      {([{ value: 'modules' as const, icon: BookOpen, label: 'Mga Modyul' }, { value: 'pdf' as const, icon: FileText, label: 'Galing sa Guro' }]).map(({ value, icon: Icon, label }) => <button key={value} id={`learn-tab-${value}`} data-tab={value} type="button" role="tab" aria-controls={`learn-panel-${value}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={onTabKeyDown}><Icon size={20} aria-hidden="true" />{label}</button>)}
    </div>
    <div id="learn-panel-modules" role="tabpanel" aria-labelledby="learn-tab-modules" tabIndex={0} hidden={tab !== 'modules'}>{tab === 'modules' && <ModulesTab />}</div>
    <div id="learn-panel-pdf" role="tabpanel" aria-labelledby="learn-tab-pdf" tabIndex={0} hidden={tab !== 'pdf'} className="learn-ref-teacher">{tab === 'pdf' && <PdfTab />}</div>
  </div>;
}
