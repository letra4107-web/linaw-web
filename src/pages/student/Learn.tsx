import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { PdfReadingAssistant } from '../../components/PdfReadingAssistant';
import { PdfDrillPractice } from '../../components/PdfDrillPractice';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import bookIcon from '../../assets/book.png';
import owlbook from '../../assets/owlbook.png';

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

type Tab = 'modules' | 'pdf';

function ModulesTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<PathResponse>('/student/learn/path', { auth: true }),
  });

  const modules = data?.modules ?? [];
  const completedModules = modules.filter((module) => module.state === 'completed').length;
  const pathPct = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {data && (
        <div className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-lavender', 9, 32)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70"><img src={owlbook} alt="" aria-hidden="true" className="h-10 w-10 object-contain" /></span>
              <div>
                <p className="text-xs font-bold tracking-[0.1em] text-[var(--color-primary)] uppercase">Iyong landas</p>
                <h2 className="text-lg font-bold">Antas: {data.effective_level}</h2>
              </div>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-[var(--color-primary)]">{completedModules}/{modules.length} modyul</span>
          </div>
          <div className="mt-4 flex items-center gap-3" role="progressbar" aria-label="Kabuuang progreso sa mga modyul" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pathPct}>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/75 shadow-inner"><div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500" style={{ width: `${pathPct}%` }} /></div>
            <span className="text-sm font-bold text-[var(--color-primary)]">{pathPct}%</span>
          </div>
        </div>
      )}

      {isLoading && <p className="rounded-2xl bg-white/60 p-5 text-[var(--color-text-muted)]">Inihahanda ang iyong mga aralin...</p>}
      {error && <p className="rounded-2xl bg-[var(--color-danger-soft)] p-4 text-[var(--color-danger)]">{(error as Error).message}</p>}
      {data && !data.configured && (
        <p className="rounded-3xl border p-6 text-[var(--color-text-muted)]" style={cardStyle('--color-brand-lavender')}>
          Wala pang aralin na handa para sa antas na ito. Balik-balikan mo na lang mamaya!
        </p>
      )}

      <div className="mx-auto flex w-full max-w-4xl flex-col" aria-label="Landas ng mga modyul">
        {modules.map((module, index) => {
          const state = STATE_META[module.state];
          const clickable = module.state !== 'locked';
          const isLast = index === modules.length - 1;
          const pct = module.content_item_count > 0 ? Math.round((module.completed_content_item_count / module.content_item_count) * 100) : 0;
          const previousIncomplete = modules.slice(0, index).find((item) => item.state !== 'completed');
          const brandColor = CARD_COLORS[index % CARD_COLORS.length];

          const card = (
            <article
              className={`group relative min-w-0 overflow-hidden rounded-3xl border p-5 shadow-card transition-all sm:p-6 ${clickable ? 'hover:-translate-y-1 hover:shadow-raised active:scale-[0.99]' : 'border-dashed opacity-75'}`}
              style={module.state === 'locked' ? { backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' } : cardStyle(brandColor, 10, 35)}
            >
              <div aria-hidden="true" className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/30" />
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ color: `var(${state.textVar})`, backgroundColor: `color-mix(in srgb, var(${state.bgVar}) 18%, white)` }}>
                  <IconLabel icon={state.icon} label={state.label} />
                </span>
                {module.instructional_content_type && <span className="rounded-full bg-white/65 px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">{module.instructional_content_type}</span>}
              </div>
              <h3 className="relative mt-3 text-xl leading-snug font-bold">{module.title}</h3>
              {module.description && <p className="relative mt-1 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">{module.description}</p>}

              {module.state === 'locked' ? (
                previousIncomplete && <p className="relative mt-4 text-sm font-semibold text-[var(--color-text-muted)]"><IconLabel icon="🔒" label={`Tapusin muna ang Modyul ${previousIncomplete.module_number}`} /></p>
              ) : (
                <div className="relative mt-5">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
                    <span>{module.state === 'completed' ? 'Kumpleto!' : 'Progreso sa modyul'}</span>
                    <span>{module.completed_content_item_count}/{module.content_item_count} gawain</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/75 shadow-inner" role="progressbar" aria-label={`Progreso sa Modyul ${module.module_number}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: module.state === 'completed' ? 'var(--color-success)' : 'var(--color-primary)' }} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-[var(--color-primary)]">{module.state === 'completed' ? 'Balikan ang modyul' : pct > 0 ? 'Ipagpatuloy ang modyul →' : 'Simulan ang modyul →'}</p>
                </div>
              )}
            </article>
          );

          return (
            <div key={module.id} className="flex min-w-0 gap-3 sm:gap-5">
              <div className="flex w-11 shrink-0 flex-col items-center sm:w-14">
                <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-card sm:h-12 sm:w-12" style={{ backgroundColor: `var(${state.bgVar})` }}>{module.state === 'completed' ? '✓' : module.module_number}</span>
                {!isLast && <span className="min-h-10 w-1 flex-1 rounded-full" style={{ backgroundColor: module.state === 'completed' ? 'var(--color-success)' : 'var(--color-border)' }} />}
              </div>
              <div className="min-w-0 flex-1 pb-5">{clickable ? <Link to={`/student/learn/module/${module.id}`} className="block">{card}</Link> : card}</div>
            </div>
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
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-lavender', 8, 30)}>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70"><img src={bookIcon} alt="" aria-hidden="true" className="h-9 w-9 object-contain" /></span>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Aralin</h1>
            <p className="text-sm text-[var(--color-text-muted)] sm:text-base">Piliin ang susunod mong hakbang sa pagbabasa.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border)] bg-white/55 p-1.5" role="tablist" aria-label="Uri ng aralin">
        {([
          { value: 'modules' as const, icon: '📚', label: 'Mga Modyul' },
          { value: 'pdf' as const, icon: '📄', label: 'Galing sa Guro' },
        ]).map((item) => (
          <button key={item.value} type="button" role="tab" onClick={() => setTab(item.value)} aria-selected={tab === item.value} className={`min-h-12 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:text-base ${tab === item.value ? 'bg-[var(--color-primary)] text-white shadow-card' : 'hover:bg-white/70'}`}><IconLabel icon={item.icon} label={item.label} /></button>
        ))}
      </div>

      {tab === 'modules' ? <ModulesTab /> : <PdfTab />}
    </div>
  );
}
