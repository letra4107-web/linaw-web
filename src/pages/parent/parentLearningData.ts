import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';
import { normalizeEarnedBadgeIds } from './parentBadgeData';

export interface ParentChild {
  id: string;
  name: string;
  grade_level: number;
  level: string;
}

export interface ParentPracticeSession {
  id: string;
  word: string;
  accuracy_percentage: number;
  is_correct: boolean;
  duration_seconds: number | null;
  created_at: string;
}

export interface ParentModule {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  instructional_content_type: string;
  state: 'locked' | 'unlocked' | 'completed';
  content_item_count: number;
  completed_content_item_count: number;
}

export interface ParentLearningPath {
  configured: boolean;
  effective_level: string;
  modules: ParentModule[];
}

export function useParentChildren(userId?: string) {
  return useQuery({
    queryKey: ['parent-overview-children', userId],
    queryFn: () => api<{ children: ParentChild[] }>('/parent/children', { auth: true }),
    enabled: Boolean(userId),
  });
}

export function useParentLearningData(childId: string | null) {
  const profile = useQuery({
    queryKey: ['parent-reading-profile', childId],
    queryFn: () => api<{ profile: ReadingProfile }>(`/parent/children/${childId}/reading-profile`, { auth: true }),
    enabled: Boolean(childId),
  });
  const path = useQuery({
    queryKey: ['parent-learning-path', childId],
    queryFn: () => api<ParentLearningPath>(`/parent/children/${childId}/learning-path`, { auth: true }),
    enabled: Boolean(childId),
  });
  const practice = useQuery({
    queryKey: ['parent-overview-practice', childId],
    queryFn: async () => {
      const rows: ParentPracticeSession[] = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase.from('pronunciation_practice_sessions')
          .select('id,word,accuracy_percentage,is_correct,duration_seconds,created_at')
          .eq('student_id', childId!).order('created_at', { ascending: false })
          .range(start, start + 499);
        if (error) throw error;
        rows.push(...(data as ParentPracticeSession[]));
        if (data.length < 500) return rows;
      }
    },
    enabled: Boolean(childId),
  });
  const achievements = useQuery({
    queryKey: ['parent-overview-achievements', childId],
    queryFn: async () => {
      const { data, error } = await supabase.from('child_progress')
        .select('achievements,badges,streak').eq('child_id', childId!).maybeSingle();
      if (error) throw error;
      return data as { achievements?: unknown; badges?: unknown; streak?: number } | null;
    },
    enabled: Boolean(childId),
  });
  const modules = path.data?.modules ?? [];
  const total = modules.reduce((sum, module) => sum + module.content_item_count, 0);
  const completed = modules.reduce((sum, module) => sum + module.completed_content_item_count, 0);
  const current = modules.find((module) => module.state === 'unlocked') ?? modules.find((module) => module.state !== 'completed') ?? modules.at(-1);
  const earned = normalizeEarnedBadgeIds(achievements.data?.achievements, achievements.data?.badges);
  return { profile, path, practice, achievements, modules, total, completed, current, earned };
}

export function modulePercent(module?: ParentModule) {
  return module && module.content_item_count > 0
    ? Math.min(100, Math.round(module.completed_content_item_count / module.content_item_count * 100))
    : 0;
}

export function formatPracticeTime(sessions: ParentPracticeSession[]) {
  const seconds = sessions.reduce((sum, session) => sum + Math.max(0, Number(session.duration_seconds) || 0), 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function learningCategories(modules: ParentModule[], profile?: ReadingProfile) {
  const percent = (list: ParentModule[]) => {
    const count = list.reduce((sum, module) => sum + module.content_item_count, 0);
    return count > 0 ? Math.round(list.reduce((sum, module) => sum + module.completed_content_item_count, 0) / count * 100) : null;
  };
  return [
    { label: 'Pagkilala sa Letra', tone: 'green', value: percent(modules.filter((module) => module.instructional_content_type?.toLowerCase() === 'phonetic')) },
    { label: 'Pagbigkas', tone: 'blue', value: profile?.averageAccuracy ?? null },
    { label: 'Pagbasa', tone: 'gold', value: percent(modules.filter((module) => module.instructional_content_type?.toLowerCase() !== 'phonetic')) },
    { label: 'Pagsulat', tone: 'rose', value: null },
  ];
}
