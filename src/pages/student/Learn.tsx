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

const STATE_META: Record<ModuleSummary['state'], { icon: string; label: string; textVar: string; bgVar: string; railColor: string }> = {
  locked: { icon: '🔒', label: 'Naka-lock', textVar: '--color-text-muted', bgVar: '--color-border', railColor: 'var(--color-border)' },
  unlocked: { icon: '▶️', label: 'Handa Nang Simulan', textVar: '--color-primary', bgVar: '--color-brand-lavender', railColor: 'var(--color-border)' },
  completed: { icon: '✅', label: 'Tapos na', textVar: '--color-success', bgVar: '--color-success', railColor: 'var(--color-success)' },
};

const PDF_STATUS_LABEL: Record<string, { icon: string; label: string }> = {
  assigned: { icon: '🆕', label: 'Bago' },
  in_progress: { icon: '⏳', label: 'Ginagawa' },
  completed: { icon: '✅', label: 'Tapos na' },
};

type Tab = 'modules' | 'pdf';

function ModulesTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<PathResponse>('/student/learn/path', { auth: true }),
  });

  const modules = data?.modules ?? [];

  return (
    <div className="flex flex-col gap-6">
      {data && (
        <span className="w-fit rounded-full bg-white/70 px-4 py-1.5 text-sm font-semibold text-[var(--color-primary)] shadow-sm">
          <IconLabel icon="🎗️" label={`Kasalukuyang Antas: ${data.effective_level}`} />
        </span>
      )}

      {isLoading && <p>Naglo-load...</p>}
      {error && <p className="text-[var(--color-danger)]">{(error as Error).message}</p>}

      {data && !data.configured && (
        <p className="rounded-xl border p-6 text-[var(--color-text-muted)]" style={cardStyle('--color-brand-lavender')}>
          Wala pang aralin na handa para sa antas na ito. Balik-balikan mo na lang mamaya!
        </p>
      )}

      {/* Vertical skill-path: numbered nodes connected by a rail, matching the mobile app's module path design. */}
      <div className="flex flex-col">
        {modules.map((m, i) => {
          const state = STATE_META[m.state];
          const clickable = m.state !== 'locked';
          const isLast = i === modules.length - 1;
          const pct =
            m.content_item_count > 0 ? Math.round((m.completed_content_item_count / m.content_item_count) * 100) : 0;
          const prevIncomplete = modules.slice(0, i).find((mm) => mm.state !== 'completed');

          const card = (
            <div
              className={`flex-1 rounded-2xl border p-5 shadow-card transition-all ${
                clickable ? 'hover:-translate-y-0.5 hover:shadow-raised' : 'opacity-70'
              }`}
              style={m.state === 'locked' ? { backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' } : cardStyle(CARD_COLORS[i % CARD_COLORS.length], 10, 35)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ color: `var(${state.textVar})`, backgroundColor: `color-mix(in srgb, var(${state.bgVar}) 18%, white)` }}
                >
                  <IconLabel icon={state.icon} label={state.label} />
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold">
                Modyul {m.module_number}: {m.title}
              </h2>
              {m.description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{m.description}</p>}

              {m.state === 'locked' ? (
                prevIncomplete && (
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    <IconLabel icon="🔒" label={`Tapusin muna ang Modyul ${prevIncomplete.module_number}`} />
                  </p>
                )
              ) : (
                m.content_item_count > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/70 shadow-inner">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${pct}%`, backgroundColor: m.state === 'completed' ? 'var(--color-success)' : 'var(--color-primary)' }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
                      {m.completed_content_item_count}/{m.content_item_count}
                    </span>
                  </div>
                )
              )}
            </div>
          );

          return (
            <div key={m.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: `var(${state.bgVar})` }}
                >
                  {m.state === 'completed' ? '✓' : m.module_number}
                </span>
                {!isLast && <span className="w-0.5 flex-1 min-h-10" style={{ backgroundColor: state.railColor }} />}
              </div>
              <div className="pb-4">{clickable ? <Link to={`/student/learn/module/${m.id}`}>{card}</Link> : card}</div>
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
      // RLS hides pdf_materials once a teacher archives it (migration 017), which
      // leaves the assignment row but with pdf_materials: null -- drop those instead
      // of rendering a broken/blank card for a PDF that's no longer available.
      return ((data as unknown as PdfAssignment[]) || []).filter((a) => a.pdf_materials !== null);
    },
    enabled: Boolean(user),
  });

  const openAssignment = assignments?.find((a) => a.id === openAssignmentId);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[var(--color-text-muted)]">Basahin nang malakas ang mga PDF na binigay ng iyong guro.</p>

      {isLoading && <p>Naglo-load...</p>}

      {!openAssignmentId && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(assignments ?? []).map((a, i) => {
            const status = PDF_STATUS_LABEL[a.status] ?? PDF_STATUS_LABEL.assigned;
            return (
              <li
                key={a.id}
                className="flex flex-col gap-3 rounded-2xl border p-5 shadow-card"
                style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 text-xl" aria-hidden="true">
                    📄
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      a.status === 'completed'
                        ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                        : 'bg-white/70 text-[var(--color-text-muted)]'
                    }`}
                  >
                    <IconLabel icon={status.icon} label={status.label} />
                  </span>
                </div>
                <p className="font-semibold">{a.pdf_materials?.title}</p>
                <button
                  type="button"
                  onClick={() => setOpenAssignmentId(a.id)}
                  className="mt-auto self-start rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 hover:shadow-raised active:scale-95"
                >
                  <IconLabel icon="📖" label="Buksan" />
                </button>
              </li>
            );
          })}
          {assignments && assignments.length === 0 && (
            <p className="col-span-full text-[var(--color-text-muted)]">Wala ka pang naka-assign na PDF.</p>
          )}
        </ul>
      )}

      {openAssignment?.pdf_materials && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setOpenAssignmentId(null);
              queryClient.invalidateQueries({ queryKey: ['student-pdf-assignments'] });
            }}
            className="self-start text-sm font-medium text-[var(--color-primary)] underline"
          >
            ← Bumalik sa listahan
          </button>
          <div
            className="overflow-hidden rounded-2xl p-6 text-white shadow-hero sm:p-7"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))' }}
          >
            <p className="text-sm text-white/80">
              <IconLabel icon="📄" label="Pagbasa ng PDF" />
            </p>
            <h2 className="mt-1 text-2xl font-bold">{openAssignment.pdf_materials.title}</h2>
          </div>
          {openAssignment.pdf_materials.drill_status === 'published' ? (
            <PdfDrillPractice assignmentId={openAssignment.id} />
          ) : (
            <PdfReadingAssistant material={openAssignment.pdf_materials} assignmentId={openAssignment.id} mode="student" />
          )}
        </div>
      )}
    </div>
  );
}

export default function Learn() {
  const [tab, setTab] = useState<Tab>('modules');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Aralin</h1>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('modules')}
          aria-pressed={tab === 'modules'}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${
            tab === 'modules'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}
        >
          <IconLabel icon="📖" label="Mga Modyul" />
        </button>
        <button
          type="button"
          onClick={() => setTab('pdf')}
          aria-pressed={tab === 'pdf'}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${
            tab === 'pdf'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}
        >
          <IconLabel icon="📄" label="PDF" />
        </button>
      </div>

      {tab === 'modules' ? <ModulesTab /> : <PdfTab />}
    </div>
  );
}
