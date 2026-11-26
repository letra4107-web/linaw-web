import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import StudentMonitoringReference from './StudentMonitoringReference';
import ParentMonitoringReference from './ParentMonitoringReference';
import TeacherMonitoringReference from './TeacherMonitoringReference';

export type MonitoredUser = { id: string; name: string | null; email: string; account_status: string; lastLoginAt: string | null; created_at?: string; profile: { gradeLevel?: number | null; gradeLevels?: number[] } };
export type MonitoredModule = { id: string; title?: string; module_number?: number; state?: 'completed' | 'in_progress' | 'not_started' | 'locked' | 'unlocked'; content_item_count?: number; completed_content_item_count?: number };
export const modulePercent = (module: MonitoredModule) => module.state === 'completed' ? 100 : module.content_item_count ? Math.min(100, Math.max(0, Math.round((module.completed_content_item_count || 0) / module.content_item_count * 100))) : 0;
export const moduleState = (module: MonitoredModule) => module.state === 'unlocked' ? (module.completed_content_item_count ? 'in_progress' : 'not_started') : module.state;
export type MonitoredProgress = { achievements?: unknown; level?: string; xp?: number; streak?: number; activities_completed?: number; accuracy_sum?: number; total_attempts?: number; updated_at?: string };
export type MonitoredActivity = { id: string; action: string; module?: string; created_at: string };
type Detail = { progress?: MonitoredProgress; modules?: MonitoredModule[]; sessions?: { word?: string; accuracy_percentage?: number; created_at: string }[]; children?: { id: string; name?: string; grade_level?: number }[]; roster?: { student_id: string; assigned_at: string }[]; materials?: { id: string; title?: string; grade_level?: number; level?: string; created_at: string }[]; assignments?: { id: string; student_id?: string; status?: string; assigned_at?: string }[]; sections?: { id: string; name: string; grade_level: number; is_reading_support: boolean; studentCount: number }[]; activity?: MonitoredActivity[] };
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(value)) : 'No recorded activity';
export default function RoleMonitoring({ role }: { role: 'student' | 'parent' | 'teacher' }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedUser = searchParams.get('user');
  const directory = useQuery({ queryKey: ['admin-role-monitoring', role], queryFn: () => api<{ users: MonitoredUser[] }>(`/admin/monitoring/users?role=${role}`, { auth: true }) });
  const users = directory.data?.users || [];
  useEffect(() => { setSelectedId(current => requestedUser && users.some(user => user.id === requestedUser) ? requestedUser : current && users.some(user => user.id === current) ? current : users[0]?.id || null); }, [directory.data, requestedUser]);
  const selected = users.find(user => user.id === selectedId) || null;
  const details = useQuery({ queryKey: ['admin-monitoring-detail', selected?.id], queryFn: () => api<Detail>(`/admin/monitoring/users/${selected?.id}`, { auth: true }), enabled: Boolean(selected) });
  const data = details.data || {};
  const modules = data.modules || [];
  const completed = modules.filter(module => module.state === 'completed').length;
  const overall = modules.length ? Math.round(completed / modules.length * 100) : 0;
  const average = data.progress?.total_attempts ? Math.round((data.progress.accuracy_sum || 0) / data.progress.total_attempts) : null;
  const shared = { users, selected, selectedId, onSelect: (id: string) => { setSelectedId(id); setSearchParams({ user: id }, { replace: true }); }, loading: directory.isLoading, formatDate };
  return <><QueryErrorNotice error={directory.error || details.error} message="Hindi makuha ang impormasyon sa pagsubaybay. Subukan muli." onRetry={() => { void directory.refetch(); if (selected) void details.refetch(); }} />{role === 'student' ? <StudentMonitoringReference {...shared} modules={modules} progress={data.progress} completed={completed} overall={overall} average={average} /> : role === 'parent' ? <ParentMonitoringReference {...shared} linkedChildren={data.children || []} activity={data.activity || []} /> : <TeacherMonitoringReference {...shared} roster={data.roster || []} materials={data.materials || []} assignments={data.assignments || []} sections={data.sections || []} activity={data.activity || []} />}</>;
}
