import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { PdfReadingAssistant } from '../../components/PdfReadingAssistant';
import { IconLabel } from '../../components/a11y/IconLabel';

interface Assignment {
  id: string;
  status: string;
  due_date: string | null;
  pdf_materials: { id: string; title: string; extracted_text: string | null; file_url: string } | null;
}

const STATUS_LABEL: Record<string, { icon: string; label: string }> = {
  assigned: { icon: '🆕', label: 'Bago' },
  in_progress: { icon: '⏳', label: 'Ginagawa' },
  completed: { icon: '✅', label: 'Tapos na' },
};

export default function PdfReading() {
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
        .select('id, status, due_date, pdf_materials(id, title, extracted_text, file_url)')
        .eq('student_id', child.id)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Assignment[];
    },
    enabled: Boolean(user),
  });

  const openAssignment = assignments?.find((a) => a.id === openAssignmentId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagbasa ng PDF</h1>
        <p className="text-[var(--color-text-muted)]">Basahin nang malakas ang mga PDF na binigay ng iyong guro.</p>
      </div>

      {isLoading && <p>Naglo-load...</p>}

      {!openAssignmentId && (
        <ul className="flex flex-col gap-3">
          {(assignments ?? []).map((a) => {
            const status = STATUS_LABEL[a.status] ?? STATUS_LABEL.assigned;
            return (
              <li key={a.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.pdf_materials?.title}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      <IconLabel icon={status.icon} label={status.label} />
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenAssignmentId(a.id)}
                    className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
                  >
                    <IconLabel icon="📖" label="Buksan" />
                  </button>
                </div>
              </li>
            );
          })}
          {assignments && assignments.length === 0 && (
            <p className="text-[var(--color-text-muted)]">Wala ka pang naka-assign na PDF.</p>
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
            className="self-start text-sm text-[var(--color-primary)] underline"
          >
            ← Bumalik sa listahan
          </button>
          <h2 className="text-xl font-semibold">{openAssignment.pdf_materials.title}</h2>
          <PdfReadingAssistant
            material={openAssignment.pdf_materials}
            assignmentId={openAssignment.id}
            mode="student"
          />
        </div>
      )}
    </div>
  );
}
