import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { PdfReadingAssistant } from '../../components/PdfReadingAssistant';
import { PdfDrillPractice } from '../../components/PdfDrillPractice';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import currentJourney from '../../assets/students/aralin/aralin-current.png';
import headerBooks from '../../assets/students/aralin/aralin-header-books.png';
import mascotGuide from '../../assets/students/aralin/aralin-mascot-guide.png';
import modulePath from '../../assets/students/aralin/aralin-module-path.png';
import pencilStars from '../../assets/students/aralin/aralin-pencil-stars.png';
import phonicsBlocks from '../../assets/students/aralin/aralin-phonics-blocks.png';
import readingBook from '../../assets/students/aralin/aralin-reading-book.png';

interface ModuleSummary {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  instructional_content_type: string;
  assessment_id: string | null;
  state: 'locked' | 'unlocked' | 'completed';
  content_item_count: number;
  completed_content_item_count: number;
}

interface PathResponse {
  configured: boolean;
  effective_level: string;
  modules: ModuleSummary[];
}

interface PdfAssignment {
  id: string;
  status: string;
  due_date: string | null;
  pdf_materials: { id: string; title: string; extracted_text: string | null; file_url: string; drill_status: string | null } | null;
}

const STATE_META: Record<ModuleSummary['state'], { icon: string; label: string; textVar: string; bgVar: string }> = {
  locked: { icon: '🔒', label: 'Naka-lock', textVar: '--color-text-muted', bgVar: '--color-border' },
  unlocked: { icon: '▶', label: 'Handa nang simulan', textVar: '--color-primary', bgVar: '--color-brand-lavender' },
  completed: { icon: '✓', label: 'Tapos na', textVar: '--color-success', bgVar: '--color-success' },
};

const PDF_STATUS_LABEL: Record<string, { icon: string; label: string }> = {
  assigned: { icon: '✨', label: 'Bago' },
  in_progress: { icon: '⏳', label: 'Ginagawa' },
  completed: { icon: '✓', label: 'Tapos na' },
};

// Presentational waypoints only: lesson data and unlock rules still come from
// the learning-path response.
const JOURNEY_STAGES = [
  { label: 'Panimula', tone: 'introduction', from: 1, to: 2, decoration: headerBooks },
  { label: 'Pagkilala sa mga Pantig', tone: 'syllables', from: 3, to: 7, decoration: phonicsBlocks },
  { label: 'Paghasa sa Pagbasa', tone: 'reading', from: 8, to: 12, decoration: currentJourney },
  { label: 'Pagpapalawak', tone: 'growth', from: 13, to: 16, decoration: mascotGuide },
  { label: 'Pagbuo ng Salita', tone: 'words', from: 17, to: 17, decoration: pencilStars },
] as const;

type Tab = 'modules' | 'pdf';

function compactLockedDescription(description: string | null, contentType: string) {
  if (!description || contentType.toLowerCase() !== 'phonetic') return description;
  return description
    .replace(/^Bigkasin ang\s*/i, '')
    .replace(/,?\s*at\s+/i, ' • ')
    .replace(/,\s*/g, ' • ')
    .replace(/\.$/, '');
}

function ModulesTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<PathResponse>('/student/learn/path', { auth: true }),
  });

  const modules = data?.modules ?? [];
  const completedModules = modules.filter((module) => module.state === 'completed').length;
  const pathPct = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;

  return (
    <div className="student-learn-modules-tab flex flex-col gap-4">
      {data && (
        <section className="student-learn-path-card" aria-label="Iyong landas">
          <img src={modulePath} alt="" aria-hidden="true" className="student-learn-path-illustration" />
          <div className="student-learn-path-heading">
            <div className="flex items-center gap-3">
              <span className="student-learn-path-icon"><Sparkles aria-hidden="true" className="h-6 w-6" /></span>
              <div>
                <p>Iyong landas</p>
                <h2>Antas: {data.effective_level}</h2>
              </div>
            </div>
            <span className="student-learn-path-count">{completedModules}/{modules.length} modyul</span>
          </div>
          <div className="student-learn-path-progress" role="progressbar" aria-label="Kabuuang progreso sa mga modyul" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pathPct}>
            <div className="student-learn-path-progress-track"><div className="student-learn-path-progress-fill transition-[width] duration-500" style={{ width: `${pathPct}%` }} /></div>
            <span>{pathPct}%</span>
          </div>
          <p className="student-learn-path-note"><Sparkles aria-hidden="true" className="h-4 w-4" /> Magandang simula! Ipagpatuloy lang.</p>
        </section>
      )}

      {isLoading && <p className="rounded-2xl bg-white/60 p-5 text-[var(--color-text-muted)]">Inihahanda ang iyong mga aralin...</p>}
      {error && <p className="rounded-2xl bg-[var(--color-danger-soft)] p-4 text-[var(--color-danger)]">{(error as Error).message}</p>}
      {data && !data.configured && (
        <p className="rounded-3xl border p-6 text-[var(--color-text-muted)]" style={cardStyle('--color-brand-lavender')}>
          Wala pang aralin na handa para sa antas na ito. Balik-balikan mo na lang mamaya!
        </p>
      )}

      <div className="mx-auto flex w-full max-w-[980px] flex-col" aria-label="Landas ng mga modyul">
        {JOURNEY_STAGES.map((stage) => {
          const stageModules = modules.filter((module) => module.module_number >= stage.from && module.module_number <= stage.to);
          if (!stageModules.length) return null;

          return (
            <section key={stage.label} className={`student-learn-stage student-learn-stage-${stage.tone}`} aria-label={stage.label}>
              <div className={`student-learn-section-waypoint student-learn-section-${stage.tone} student-learn-section-waypoint-decorated`}>
                <div className="student-learn-section-marker"><span>{stage.label}</span></div>
                <img src={stage.decoration} alt="" aria-hidden="true" className="student-learn-section-decoration" />
              </div>
              {stageModules.map((module) => {
          const index = modules.indexOf(module);
          const state = STATE_META[module.state];
          const clickable = module.state !== 'locked';
          const isLast = index === modules.length - 1;
          const pct = module.content_item_count > 0 ? Math.round((module.completed_content_item_count / module.content_item_count) * 100) : 0;
          const previousIncomplete = modules.slice(0, index).find((item) => item.state !== 'completed');
          const card = (
            <article
              className={`student-learn-module student-learn-module-${module.state} ${module.module_number === 2 ? 'student-learn-module-current-focus' : ''} ${module.module_number === 17 ? 'student-learn-module-final' : ''} group relative min-w-0 overflow-hidden border p-5 transition-all sm:p-6 ${clickable ? 'hover:-translate-y-0.5 active:scale-[0.99]' : ''}`}
            >
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                {module.state !== 'locked' && <span className="student-learn-status"><IconLabel icon={state.icon} label={state.label} /></span>}
                {module.instructional_content_type && <span className={`student-learn-type student-learn-type-${module.instructional_content_type.toLowerCase()}`}>{module.instructional_content_type}</span>}
              </div>
              <h3 className="relative mt-3">{module.state === 'locked' && <Lock aria-hidden="true" className="student-learn-locked-title-icon h-4 w-4 shrink-0" />} {module.title}</h3>
              {module.description && <p className="student-learn-module-description relative mt-1 max-w-2xl">{module.state === 'locked' ? compactLockedDescription(module.description, module.instructional_content_type) : module.description}</p>}

              {module.state === 'locked' ? (
                previousIncomplete && <p className="relative mt-4 text-sm font-semibold text-[var(--color-text-muted)]"><IconLabel icon="🔒" label={`Tapusin muna ang Modyul ${previousIncomplete.module_number}`} /></p>
              ) : (
                <div className="relative mt-5">
                  <div className="student-learn-module-progress-label mb-2 flex items-center justify-between gap-3">
                    <span>{module.state === 'completed' ? 'Kumpleto!' : 'Progreso sa modyul'}</span>
                    <span>{module.completed_content_item_count}/{module.content_item_count} gawain</span>
                  </div>
                  <div className="student-learn-module-progress" role="progressbar" aria-label={`Progreso sa Modyul ${module.module_number}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                    <div className="student-learn-module-progress-fill transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-[var(--color-primary)]">{module.state === 'completed' ? 'Balikan ang modyul' : pct > 0 ? 'Ipagpatuloy ang modyul →' : 'Simulan ang modyul →'}</p>
                </div>
              )}
            </article>
          );

          return (
            <div key={module.id} className="student-learn-timeline-group">
              <div className={`student-learn-timeline-row student-learn-timeline-${module.state} flex min-w-0 gap-3 sm:gap-4`}>
              <div className="student-learn-timeline-marker-column flex w-11 shrink-0 flex-col items-center sm:w-10">
                <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-card sm:h-12 sm:w-12" style={{ backgroundColor: `var(${state.bgVar})` }}>{module.state === 'completed' ? '✓' : module.module_number}</span>
                {!isLast && <span className={`student-learn-timeline-connector student-learn-timeline-connector-${module.state} min-h-10 w-1 flex-1 rounded-full`} />}
              </div>
                <div className="min-w-0 flex-1 pb-5">{clickable ? <Link to={`/student/learn/module/${module.id}`} className="block">{card}</Link> : card}</div>
              </div>
            </div>
          );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PdfTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['student-pdf-assignments', user?.id],
    queryFn: async () => {
      const { data: child } = await supabase.from('children').select('id').eq('auth_uid', user!.id).maybeSingle();
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

  return (
    <div className="student-learn-page flex min-w-0 flex-col gap-3 sm:gap-3">
      <header className="student-learn-header">
        <img src={readingBook} alt="" aria-hidden="true" className="student-learn-header-illustration" />
        <div className="flex items-center gap-3">
          <span className="student-learn-header-icon"><BookOpen aria-hidden="true" className="h-7 w-7" /></span>
          <div>
            <p className="student-learn-header-eyebrow">Ipagpatuloy ang pagkatuto</p>
            <h1>Aralin</h1>
            <p>Piliin ang susunod mong hakbang sa pagbabasa.</p>
          </div>
        </div>
      </header>

      <div className="student-learn-tabs grid grid-cols-2 gap-2" role="tablist" aria-label="Uri ng aralin">
        {([
          { value: 'modules' as const, icon: '📚', label: 'Mga Modyul' },
          { value: 'pdf' as const, icon: '📄', label: 'Galing sa Guro' },
        ]).map((item) => (
          <button key={item.value} type="button" role="tab" onClick={() => setTab(item.value)} aria-selected={tab === item.value} className={`student-learn-tab min-h-12 px-3 py-2 text-sm font-bold transition-all sm:text-base ${tab === item.value ? 'student-learn-tab-active' : ''}`}><IconLabel icon={item.icon} label={item.label} /></button>
        ))}
      </div>

      {tab === 'modules' ? <ModulesTab /> : <PdfTab />}
    </div>
  );
}
