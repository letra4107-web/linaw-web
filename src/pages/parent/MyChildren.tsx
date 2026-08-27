import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import { Toggle } from '../../components/a11y/Toggle';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

type FontSize = 'small' | 'medium' | 'large';
interface StudentAccessibility { dyslexia_font: boolean; font_size: FontSize; high_contrast: boolean; reading_guide: boolean; tts_enabled: boolean; }
interface Child { id: string; name: string; grade_level: number; username: string; }
interface ChildProgress { child_id: string; level: string; xp: number; streak: number; }

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Maliit' }, { value: 'medium', label: 'Karaniwan' }, { value: 'large', label: 'Malaki' },
];
function levelForGrade(grade: number) { if (grade <= 2) return 'Beginner'; if (grade <= 4) return 'Intermediate'; return 'Advanced'; }

export default function MyChildren() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [childName, setChildName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [levelDraft, setLevelDraft] = useState('Beginner');
  const [accessOpenId, setAccessOpenId] = useState<string | null>(null);

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => { const { data, error: err } = await supabase.from('children').select('id, name, grade_level, username').order('grade_level'); if (err) throw err; return data as Child[]; },
    enabled: Boolean(user),
  });
  const { data: progress } = useQuery({
    queryKey: ['parent-children-progress', (children ?? []).map((child) => child.id)],
    queryFn: async () => { const ids = (children ?? []).map((child) => child.id); if (!ids.length) return []; const { data, error: err } = await supabase.from('child_progress').select('child_id, level, xp, streak').in('child_id', ids); if (err) throw err; return data as ChildProgress[]; },
    enabled: (children ?? []).length > 0,
  });
  const enrollChild = useMutation({
    mutationFn: () => api<{ success: boolean; username: string; level: string }>('/parent/children', { method: 'POST', auth: true, body: { childName, gradeLevel: Number(gradeLevel) } }),
    onSuccess: (result) => { setSuccessMsg(`Nai-enroll si ${childName || 'ang bata'} bilang ${result.username} (${result.level} level). Naipadala ang credentials sa iyong email.`); setChildName(''); setGradeLevel('1'); setError(null); queryClient.invalidateQueries({ queryKey: ['parent-children'] }); },
    onError: (err: Error) => setError(err.message),
  });
  const updateLevel = useMutation({
    mutationFn: ({ childId, level }: { childId: string; level: string }) => api(`/parent/children/${childId}/reading-level`, { method: 'POST', auth: true, body: { level } }),
    onSuccess: () => { setEditingId(null); queryClient.invalidateQueries({ queryKey: ['parent-children-progress'] }); },
    onError: (err: Error) => setError(err.message),
  });
  const { data: accessSettings, isLoading: accessLoading } = useQuery({
    queryKey: ['child-accessibility', accessOpenId],
    queryFn: () => api<{ settings: StudentAccessibility }>(`/parent/children/${accessOpenId}/settings`, { auth: true }),
    enabled: Boolean(accessOpenId),
  });
  const updateAccess = useMutation({
    mutationFn: async (patch: Partial<StudentAccessibility>) => { if (accessOpenId) await api(`/parent/children/${accessOpenId}/settings`, { method: 'PATCH', auth: true, body: patch }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['child-accessibility', accessOpenId] }),
    onError: (err: Error) => setError(err.message),
  });
  const progressFor = (childId: string) => progress?.find((item) => item.child_id === childId);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-lavender', 8, 30)}>
        <div><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-primary)] uppercase">Pamilya</p><h1 className="text-2xl font-bold sm:text-3xl">Mga Anak Ko</h1><p className="text-sm text-[var(--color-text-muted)]">Pamahalaan ang account, antas, at reading support ng bawat anak.</p></div>
        <span className="rounded-2xl bg-white/70 px-4 py-2 text-sm font-bold text-[var(--color-primary)]">{children?.length ?? 0} naka-enroll</span>
      </header>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[0.75fr_1.35fr]">
        <form onSubmit={(event) => { event.preventDefault(); enrollChild.mutate(); }} className="flex flex-col gap-4 rounded-3xl border p-5 shadow-card xl:sticky xl:top-6" style={cardStyle('--color-brand-sun', 9, 30)}>
          <div><h2 className="text-xl font-bold">Mag-enroll ng Anak</h2><p className="text-sm text-[var(--color-text-muted)]">Gagawa kami ng student account at reading level.</p></div>
          <label className="text-sm font-bold">Buong pangalan<input value={childName} onChange={(event) => setChildName(event.target.value)} placeholder="Hal. Ana Dela Cruz" required className="mt-1.5 min-h-12 w-full rounded-2xl border border-white/70 bg-white/80 px-4 font-normal outline-none focus:border-[var(--color-primary)]" /></label>
          <label htmlFor="grade" className="text-sm font-bold">Baitang<select id="grade" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-2xl border border-white/70 bg-white/80 px-4 font-normal">{[1, 2, 3, 4, 5, 6].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}</select></label>
          <div className="rounded-2xl bg-white/65 p-3 text-sm"><span className="text-[var(--color-text-muted)]">Awtomatikong reading level:</span> <strong className="text-[var(--color-primary)]">{levelForGrade(Number(gradeLevel))}</strong></div>
          {error && <p className="rounded-xl bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
          {successMsg && <p className="rounded-xl bg-[var(--color-success-soft)] p-3 text-sm text-[var(--color-success)]">{successMsg}</p>}
          <button type="submit" disabled={enrollChild.isPending} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 font-bold text-white shadow-card transition-all hover:-translate-y-0.5 disabled:opacity-60">{enrollChild.isPending ? 'Ie-enroll...' : '+ I-enroll ang Anak'}</button>
        </form>

        <section aria-labelledby="children-list-title" className="min-w-0">
          <h2 id="children-list-title" className="sr-only">Listahan ng mga anak</h2>
          {isLoading && <p className="rounded-2xl bg-white/60 p-5 text-[var(--color-text-muted)]">Kinukuha ang mga account...</p>}
          <ul className="grid min-w-0 grid-cols-1 gap-4">
            {(children ?? []).map((child, index) => {
              const childProgress = progressFor(child.id);
              const levelOpen = editingId === child.id;
              const accessibilityOpen = accessOpenId === child.id;
              return (
                <li key={child.id} className="min-w-0 overflow-hidden rounded-3xl border shadow-card" style={cardStyle(CARD_COLORS[index % CARD_COLORS.length], 9, 30)}>
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/75 text-2xl font-bold text-[var(--color-primary)] shadow-sm">{child.name.charAt(0).toUpperCase()}</span>
                      <div className="min-w-0 flex-1"><h3 className="truncate text-xl font-bold">{child.name}</h3><p className="truncate text-sm text-[var(--color-text-muted)]">@{child.username}</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">Grade {child.grade_level}</span><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">{childProgress?.level ?? '—'}</span></div></div>
                      <div className="grid grid-cols-2 gap-2 sm:w-44"><div className="rounded-2xl bg-white/65 p-3 text-center"><p className="text-lg font-bold text-[var(--color-primary)]">{childProgress?.xp ?? 0}</p><p className="text-[0.7rem] text-[var(--color-text-muted)]">XP</p></div><div className="rounded-2xl bg-white/65 p-3 text-center"><p className="text-lg font-bold text-[var(--color-brand-coral)]">{childProgress?.streak ?? 0}</p><p className="text-[0.7rem] text-[var(--color-text-muted)]">Streak</p></div></div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-white/70 pt-4 sm:grid-cols-2">
                      <button type="button" onClick={() => { setEditingId(levelOpen ? null : child.id); setLevelDraft(childProgress?.level ?? 'Beginner'); }} className={`min-h-11 rounded-2xl border px-4 text-sm font-bold transition-colors ${levelOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-white/70 bg-white/65 hover:border-[var(--color-primary)]'}`}>🎚 Baguhin ang Level</button>
                      <button type="button" onClick={() => setAccessOpenId(accessibilityOpen ? null : child.id)} className={`min-h-11 rounded-2xl border px-4 text-sm font-bold transition-colors ${accessibilityOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-white/70 bg-white/65 hover:border-[var(--color-primary)]'}`}>♿ Reading Support</button>
                    </div>
                  </div>

                  {levelOpen && <div className="flex flex-wrap items-end gap-3 border-t border-white/70 bg-white/35 p-5"><label className="min-w-48 flex-1 text-sm font-bold">Reading level<select value={levelDraft} onChange={(event) => setLevelDraft(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/70 bg-white/85 px-3 font-normal"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><button type="button" onClick={() => updateLevel.mutate({ childId: child.id, level: levelDraft })} disabled={updateLevel.isPending} className="min-h-11 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white">I-save</button></div>}

                  {accessibilityOpen && (
                    <div className="border-t border-white/70 bg-white/35 p-5">
                      <div className="mb-4"><h4 className="font-bold">Reading Support ni {child.name}</h4><p className="text-xs text-[var(--color-text-muted)]">Ang mga pagbabagong ito ay awtomatikong lalabas sa student dashboard.</p></div>
                      {accessLoading && <p className="text-sm text-[var(--color-text-muted)]">Naglo-load...</p>}
                      {accessSettings && <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {[
                          { key: 'dyslexia_font' as const, label: 'Madaling Basahing Font', desc: 'Font na dinisenyo para sa dyslexia.' },
                          { key: 'high_contrast' as const, label: 'Mataas na Contrast', desc: 'Mas malinaw na kulay at hangganan.' },
                          { key: 'reading_guide' as const, label: 'Gabay sa Pagbasa', desc: 'Guide line habang nagbabasa.' },
                          { key: 'tts_enabled' as const, label: 'Text-to-Speech', desc: 'Pakinggan ang teksto sa app.' },
                        ].map((setting) => <div key={setting.key} className="flex items-center justify-between gap-4 rounded-2xl bg-white/65 p-4"><div><p className="text-sm font-bold">{setting.label}</p><p className="text-xs text-[var(--color-text-muted)]">{setting.desc}</p></div><Toggle on={accessSettings.settings[setting.key]} onClick={() => updateAccess.mutate({ [setting.key]: !accessSettings.settings[setting.key] })} label={setting.label} /></div>)}
                        <div className="flex flex-col gap-2 rounded-2xl bg-white/65 p-4 lg:col-span-2"><p className="text-sm font-bold">Laki ng Teksto</p><div className="grid grid-cols-3 gap-2">{FONT_SIZE_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => updateAccess.mutate({ font_size: option.value })} className={`min-h-10 rounded-xl border px-2 text-xs font-bold ${accessSettings.settings.font_size === option.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-white bg-white/70'}`}>{option.label}</button>)}</div></div>
                      </div>}
                    </div>
                  )}
                </li>
              );
            })}
            {children && children.length === 0 && <li className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/45 p-8 text-center text-[var(--color-text-muted)]">Wala ka pang naka-enroll na anak.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
