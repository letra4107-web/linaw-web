import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import TeacherHomeReference from './TeacherHomeReference';

interface RosterItem { student_id: string; children: { id: string; name: string; grade_level: number } | null; }
interface ProgressItem { child_id: string; accuracy_sum: number; total_attempts: number; activities_completed: number; streak: number; }
interface RecentSession { student_id: string; word: string; accuracy_percentage: number; created_at: string; }

export default function Dashboard() {
  const { user } = useAuth();
  const { data: roster, isFetching: rosterLoading, error: rosterError, refetch: refetchRoster } = useQuery({ queryKey: ['teacher-roster-summary', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_student_links').select('student_id, children(id, name, grade_level)').eq('teacher_id', user!.id);
    if (error) throw error;
    return data as unknown as RosterItem[];
  }, enabled: Boolean(user) });
  const studentIds = (roster ?? []).map((item) => item.student_id);
  const { data: progress, isFetching: progressLoading, error: progressError, refetch: refetchProgress } = useQuery({ queryKey: ['teacher-dashboard-progress', user?.id, studentIds], queryFn: async () => {
    if (!studentIds.length) return [];
    const { data, error } = await supabase.from('child_progress').select('child_id, accuracy_sum, total_attempts, activities_completed, streak').in('child_id', studentIds);
    if (error) throw error;
    return data as ProgressItem[];
  }, enabled: studentIds.length > 0 });
  const { data: recent, isFetching: recentLoading, error: recentError, refetch: refetchRecent } = useQuery({ queryKey: ['teacher-dashboard-recent', user?.id, studentIds], queryFn: async () => {
    if (!studentIds.length) return [];
    const { data, error } = await supabase.from('pronunciation_practice_sessions').select('student_id, word, accuracy_percentage, created_at').in('student_id', studentIds).order('created_at', { ascending: false }).limit(6);
    if (error) throw error;
    return data as RecentSession[];
  }, enabled: studentIds.length > 0 });
  const { data: pendingAssignments, isFetching: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } = useQuery({ queryKey: ['teacher-pending-assignments', user?.id], queryFn: async () => {
    const { data: materials, error: materialError } = await supabase.from('pdf_materials').select('id').eq('teacher_id', user!.id);
    if (materialError) throw materialError;
    const ids = (materials ?? []).map((material) => material.id);
    if (!ids.length) return 0;
    const { count, error } = await supabase.from('pdf_assignments').select('id', { count: 'exact', head: true }).in('pdf_material_id', ids).neq('status', 'completed');
    if (error) throw error;
    return count ?? 0;
  }, enabled: Boolean(user) });
  const { data: materialsCount, isFetching: materialsLoading, error: materialsError, refetch: refetchMaterials } = useQuery({ queryKey: ['teacher-materials-count', user?.id], queryFn: async () => {
    const { count, error } = await supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('teacher_id', user!.id).eq('is_published', true);
    if (error) throw error;
    return count ?? 0;
  }, enabled: Boolean(user) });

  return <TeacherHomeReference roster={roster} progress={progress} recent={recent} pendingAssignments={pendingAssignments} materialsCount={materialsCount}
    loading={{roster:rosterLoading, progress:progressLoading, recent:recentLoading, assignments:assignmentsLoading, materials:materialsLoading}}
    errors={{roster:rosterError, progress:progressError, recent:recentError, assignments:assignmentsError, materials:materialsError}}
    onRetry={() => { void refetchRoster(); if(studentIds.length) { void refetchProgress(); void refetchRecent(); } void refetchAssignments(); void refetchMaterials(); }} />;
}
