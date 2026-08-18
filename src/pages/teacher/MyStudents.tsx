import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface ChildRow {
  id: string;
  name: string;
  grade_level: number;
  username: string;
}

interface RosterRow {
  id: string;
  student_id: string;
  assigned_at: string;
  children: ChildRow | null;
}

export default function MyStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: teacherProfile } = useQuery({
    queryKey: ['teacher-profile', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_profiles')
        .select('grade_levels')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (err) throw err;
      return data as { grade_levels: number[] } | null;
    },
    enabled: Boolean(user),
  });

  const gradeLevels = teacherProfile?.grade_levels ?? [];

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ['teacher-roster', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_student_links')
        .select('id, student_id, assigned_at, children(id, name, grade_level, username)')
        .order('assigned_at', { ascending: false });
      if (err) throw err;
      return data as unknown as RosterRow[];
    },
    enabled: Boolean(user),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['student-search', search, gradeLevels],
    queryFn: async () => {
      if (!search.trim() || gradeLevels.length === 0) return [];
      const { data, error: err } = await supabase
        .from('children')
        .select('id, name, grade_level, username')
        .in('grade_level', gradeLevels)
        .ilike('name', `%${search.trim()}%`)
        .limit(10);
      if (err) throw err;
      return data as ChildRow[];
    },
    enabled: search.trim().length > 1 && gradeLevels.length > 0,
  });

  const addToRoster = useMutation({
    mutationFn: async (studentId: string) => {
      const { error: err } = await supabase.from('teacher_student_links').insert({
        teacher_id: user!.id,
        student_id: studentId,
        assigned_by: user!.id,
      });
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-roster'] }),
    onError: (err: Error) => setError(err.message),
  });

  const removeFromRoster = useMutation({
    mutationFn: async (linkId: string) => {
      const { error: err } = await supabase.from('teacher_student_links').delete().eq('id', linkId);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-roster'] }),
  });

  const rosteredIds = new Set((roster ?? []).map((r) => r.student_id));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mag-aaral Ko</h1>
        <p className="text-[var(--color-text-muted)]">
          {gradeLevels.length > 0
            ? `Maaari kang maghanap ng mag-aaral sa Grade ${gradeLevels.join(', ')}.`
            : 'Wala ka pang naka-assign na grade level. Makipag-ugnayan sa admin.'}
        </p>
      </div>

      <div>
        <label htmlFor="search" className="mb-1 block text-sm font-medium">
          Maghanap ng mag-aaral (pangalan)
        </label>
        <input
          id="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"
          placeholder="Ilagay ang pangalan..."
        />
        {error && <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
        {searchResults && searchResults.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {searchResults.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border px-4 py-2"
                style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
              >
                <span>
                  {s.name} · Grade {s.grade_level}
                </span>
                {rosteredIds.has(s.id) ? (
                  <span className="text-sm text-[var(--color-text-muted)]">Naka-add na</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToRoster.mutate(s.id)}
                    className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
                  >
                    <IconLabel icon="➕" label="Idagdag" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Listahan ng Mag-aaral</h2>
        {rosterLoading && <p>Naglo-load...</p>}
        {roster && roster.length === 0 && (
          <p className="text-[var(--color-text-muted)]">Wala ka pang naidagdag na mag-aaral.</p>
        )}
        <ul className="flex flex-col gap-2">
          {(roster ?? []).map((r, i) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
              style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
            >
              <span>
                {r.children?.name ?? 'Hindi kilala'} · Grade {r.children?.grade_level ?? '-'}
              </span>
              <button
                type="button"
                onClick={() => removeFromRoster.mutate(r.id)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-danger)]"
              >
                <IconLabel icon="🗑️" label="Alisin" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
