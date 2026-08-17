import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { TTSButton } from '../../components/a11y/TTSButton';

interface ChildProgress {
  level: string;
  xp: number;
  streak: number;
  achievements: { id: string }[] | Record<string, unknown>;
}

export default function Dashboard() {
  const { user, identity } = useAuth();

  const { data: child } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id, name').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    enabled: Boolean(user),
  });

  const { data: progress } = useQuery({
    queryKey: ['student-progress', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('level, xp, streak, achievements')
        .eq('child_id', child!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(child?.id),
  });

  const badgeCount = Array.isArray(progress?.achievements)
    ? progress!.achievements.length
    : progress?.achievements
      ? Object.keys(progress.achievements).length
      : 0;

  const welcomeText = `Kumusta, ${identity?.displayName ?? 'kaibigan'}! Handa ka na bang matuto?`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{welcomeText}</h1>
        <TTSButton text={welcomeText} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-3xl font-semibold text-[var(--color-primary)]">{progress?.xp ?? 0}</p>
          <p className="mt-1">
            <IconLabel icon="⭐" label="XP" />
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-3xl font-semibold text-[var(--color-primary)]">{progress?.streak ?? 0}</p>
          <p className="mt-1">
            <IconLabel icon="🔥" label="Streak" />
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-3xl font-semibold text-[var(--color-primary)]">{badgeCount}</p>
          <p className="mt-1">
            <IconLabel icon="🏅" label="Mga Badge" />
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-semibold">Kasalukuyang Antas: {progress?.level ?? '-'}</h2>
        <p className="mb-4 text-[var(--color-text-muted)]">Magpatuloy sa pagbabasa upang umunlad!</p>
        <Link
          to="/student/learn"
          className="inline-flex rounded-full bg-[var(--color-primary)] px-6 py-3 text-white hover:bg-[var(--color-primary-hover)]"
        >
          <IconLabel icon="📖" label="Simulan ang Pagbasa" />
        </Link>
      </div>
    </div>
  );
}
