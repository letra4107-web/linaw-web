import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { cardStyle } from '../../lib/cardStyle';

interface RosterChild {
  id: string;
  student_id: string;
  children: { id: string; name: string } | null;
}

interface ProgressRow {
  child_id: string;
  xp: number;
  streak: number;
  accuracy_sum: number;
  total_attempts: number;
  activities_completed: number;
}

export default function ProgressReports() {
  const { user } = useAuth();

  const { data: roster } = useQuery({
    queryKey: ['teacher-roster', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_student_links')
        .select('id, student_id, children(id, name)');
      if (error) throw error;
      return data as unknown as RosterChild[];
    },
    enabled: Boolean(user),
  });

  const studentIds = (roster ?? []).map((r) => r.student_id);

  const { data: progress, isLoading } = useQuery({
    queryKey: ['teacher-progress-reports', studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('child_progress')
        .select('child_id, xp, streak, accuracy_sum, total_attempts, activities_completed')
        .in('child_id', studentIds);
      if (error) throw error;
      return data as ProgressRow[];
    },
    enabled: studentIds.length > 0,
  });

  const nameFor = (childId: string) => roster?.find((r) => r.student_id === childId)?.children?.name ?? 'Mag-aaral';

  const chartData = (progress ?? []).map((p) => ({
    name: nameFor(p.child_id),
    xp: p.xp ?? 0,
    streak: p.streak ?? 0,
    accuracy: p.total_attempts > 0 ? Math.round((p.accuracy_sum / p.total_attempts) * 100) / 100 : 0,
    activities: p.activities_completed ?? 0,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Ulat ng Progreso</h1>
        <p className="text-[var(--color-text-muted)]">
          Batay sa tunay na datos ng bawat mag-aaral sa iyong roster.
        </p>
      </div>

      {isLoading && <p>Naglo-load...</p>}
      {!isLoading && chartData.length === 0 && (
        <p className="text-[var(--color-text-muted)]">
          Walang datos pa. Magdagdag muna ng mag-aaral sa "Mag-aaral Ko".
        </p>
      )}

      {chartData.length > 0 && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-72 rounded-xl border p-4" style={cardStyle('--color-brand-lavender')}>
              <h2 className="mb-2 font-medium">XP bawat Mag-aaral</h2>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="xp" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72 rounded-xl border p-4" style={cardStyle('--color-brand-coral')}>
              <h2 className="mb-2 font-medium">Karaniwang Accuracy (%)</h2>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border" style={cardStyle('--color-brand-sage')}>
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/60 text-left">
                  <th className="px-4 py-3 font-semibold">Mag-aaral</th>
                  <th className="px-4 py-3 font-semibold">XP</th>
                  <th className="px-4 py-3 font-semibold">Streak</th>
                  <th className="px-4 py-3 font-semibold">Accuracy</th>
                  <th className="px-4 py-3 font-semibold">Natapos na Gawain</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.name} className="border-b border-white/40 last:border-b-0">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.xp.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <span aria-hidden="true">🔥</span> {row.streak}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-white/70">
                          <div
                            className="h-full rounded-full bg-[var(--color-brand-sage)]"
                            style={{ width: `${Math.min(100, row.accuracy)}%` }}
                          />
                        </div>
                        <span>{row.accuracy}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.activities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
