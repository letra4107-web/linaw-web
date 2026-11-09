import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import { openAccessUrl } from '../../lib/openAccessUrl';
import { QueryErrorNotice } from '../QueryErrorNotice';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import { descriptionParts } from '../../lib/lessons/description';

interface TeacherLesson {
  id: string; title: string; description: string | null;
  grade_level: string; file_name: string | null; created_at: string;
}

export function TeacherLessons() {
  const { user } = useAuth();
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-teacher-lessons', user?.id],
    queryFn: () => api<{ lessons: TeacherLesson[] }>('/student/lessons', { auth: true }),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });

  return <section aria-label="Mga aralin mula sa guro" className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">Mga aralin mula sa guro</h2>
      <button type="button" onClick={() => { void refetch(); }} className="min-h-11 rounded-full px-4 text-sm font-bold text-[var(--color-primary)]">I-refresh ang listahan</button>
    </div>
    <QueryErrorNotice error={error} onRetry={() => { void refetch(); }} message="Hindi ma-load ang mga aralin mula sa guro. Subukan muli." />
    {openError && <p role="alert" className="text-[var(--color-danger)]">{openError}</p>}
    {isLoading && <p role="status">Inihahanda ang mga aralin...</p>}
    {data?.lessons.length === 0 && <p className="rounded-3xl border border-dashed p-6 text-center text-[var(--color-text-muted)]">Wala pang nailathalang aralin para sa iyong baitang.</p>}
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data?.lessons.map((lesson, index) => <li key={lesson.id} className="flex min-w-0 flex-col gap-3 rounded-3xl border p-5 shadow-card" style={cardStyle(CARD_COLORS[index % CARD_COLORS.length])}>
        <FileText aria-hidden="true" size={28} />
        <span className="text-sm text-[var(--color-text-muted)]">Baitang {lesson.grade_level}</span>
        <h3 className="break-words text-lg font-bold">{lesson.title}</h3>
        {lesson.description && <p className="line-clamp-4 whitespace-pre-line break-words text-sm">{descriptionParts(lesson.description).map(part => part.text).join('')}</p>}
        <button type="button" disabled={opening !== null} onClick={async () => {
          setOpening(lesson.id); setOpenError('');
          try { await openAccessUrl(`/student/lessons/${lesson.id}/access-url`); }
          catch (error) { setOpenError(error instanceof Error ? error.message : 'Hindi mabuksan ang PDF. Subukan muli.'); }
          finally { setOpening(null); }
        }} className="mt-auto min-h-11 rounded-2xl bg-[var(--color-primary)] px-5 py-2 font-bold text-white disabled:opacity-60">{opening === lesson.id ? 'Binubuksan...' : 'Buksan ang PDF'}</button>
      </li>)}
    </ul>
  </section>;
}
