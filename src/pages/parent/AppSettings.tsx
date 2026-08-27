import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { Toggle } from '../../components/a11y/Toggle';
import { AccessibilityBar } from '../../components/a11y/AccessibilityBar';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';

interface ParentSettings {
  auth_uid: string;
  lesson_notifications: boolean;
  progress_notifications: boolean;
  milestone_alerts: boolean;
  weekly_progress_reports: boolean;
}

const SETTINGS_DEFAULTS: Omit<ParentSettings, 'auth_uid'> = {
  lesson_notifications: true,
  progress_notifications: true,
  milestone_alerts: true,
  weekly_progress_reports: true,
};

const NOTIFICATION_ROWS: { key: keyof typeof SETTINGS_DEFAULTS; icon: string; label: string; desc: string }[] = [
  { key: 'lesson_notifications', icon: '📖', label: 'Update sa Aralin', desc: 'Kapag binuksan ng iyong anak ang isang aralin' },
  { key: 'progress_notifications', icon: '📊', label: 'Update sa Progreso', desc: 'Maabisuhan tungkol sa progreso ng iyong anak sa pagbasa' },
  { key: 'milestone_alerts', icon: '🏅', label: 'Update sa Parangal', desc: 'Ipagdiwang ang mga tagumpay at parangal' },
  { key: 'weekly_progress_reports', icon: '🗓️', label: 'Lingguhang Ulat ng Progreso', desc: 'Lingguhang buod ng pagbasa ng iyong anak' },
];

export default function ParentAppSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ['parent-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parents_settings')
        .select('auth_uid, lesson_notifications, progress_notifications, milestone_alerts, weekly_progress_reports')
        .eq('auth_uid', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return { ...SETTINGS_DEFAULTS, ...data } as ParentSettings;

      const initial: ParentSettings = { auth_uid: user!.id, ...SETTINGS_DEFAULTS };
      const { data: inserted, error: insertErr } = await supabase.from('parents_settings').insert(initial).select().single();
      if (insertErr) throw insertErr;
      return { ...SETTINGS_DEFAULTS, ...inserted } as ParentSettings;
    },
    enabled: Boolean(user),
  });

  const updateSetting = useMutation({
    mutationFn: async (patch: Partial<Omit<ParentSettings, 'auth_uid'>>) => {
      const { error } = await supabase.from('parents_settings').update(patch).eq('auth_uid', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-settings', user?.id] }),
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-lavender', 8, 28)}>
        <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-primary)] uppercase">Preferences</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Mga Setting</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Pamahalaan ang mga abiso, accessibility, at suporta.</p>
      </header>

      <div className="flex flex-col gap-1 rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-lavender')}>
        <h2 className="mb-3 text-xl font-bold">Kagustuhan sa Abiso</h2>
        {saved &&
          NOTIFICATION_ROWS.map((row, i) => (
            <div
              key={row.key}
              className={`flex items-center justify-between gap-4 py-4 ${i > 0 ? 'border-t border-white/60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg" aria-hidden="true">{row.icon}</span>
                <div>
                  <p className="font-medium">{row.label}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{row.desc}</p>
                </div>
              </div>
              <Toggle
                on={saved[row.key]}
                onClick={() => updateSetting.mutate({ [row.key]: !saved[row.key] })}
                label={row.label}
              />
            </div>
          ))}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal')}>
        <h2 className="text-xl font-bold">Accessibility</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Ito ay para sa sarili mong pagbabasa sa web — hiwalay ito sa accessibility ng bawat anak, na naa-ayos mula sa
          "Mga Anak Ko".
        </p>
        <AccessibilityBar />
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-coral')}>
        <h2 className="text-xl font-bold">
          <IconLabel icon="🎧" label="Tulong at Suporta" />
        </h2>
        <a
          href="mailto:linawletra@gmail.com?subject=Tulong%20sa%20LinawLetra"
          className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/60"
        >
          <span>Kontakin ang Suporta</span>
          <span aria-hidden="true">→</span>
        </a>
        <a
          href="https://linawletra.app/privacy"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/60"
        >
          <span>Patakaran sa Pagkapribado</span>
          <span aria-hidden="true">→</span>
        </a>
        <p className="px-2 text-sm text-[var(--color-text-muted)]">Bersyon ng App 1.0.0 - Up to date</p>
      </div>
    </div>
  );
}
