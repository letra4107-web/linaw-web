import type { NotificationRow } from '../useNotifications';
export type TeacherNoticeGroup = 'messages' | 'schedule' | 'progress' | 'system';
export function teacherNoticePresentation(type:string) {
  if(['parent_teacher_reply','teacher_message','admin_message','school_message'].includes(type))return {group:'messages' as const,label:'Mensahe',destination:'/teacher/messages'};
  if(['pdf_assignment','scheduled_activity','schedule','reminder','appointment'].includes(type))return {group:'schedule' as const,label:'Iskedyul',destination:type==='pdf_assignment'?'/teacher/students':'/teacher/lessons'};
  if(['lesson','practice','streak','xp','achievement','assessment_graded'].includes(type))return {group:'progress' as const,label:'Progreso',destination:'/teacher/progress-reports'};
  if(['new_lesson','lesson_available'].includes(type))return {group:'system' as const,label:'System',destination:'/teacher/lessons'};
  if(['password_changed','security_alert','account_disabled','account_restored'].includes(type))return {group:'system' as const,label:'System',destination:'/teacher/profile'};
  return {group:'system' as const,label:'System',destination:null};
}
/** Split only the actual reply-trigger prefix; never invent child names or replies. */
export function teacherNoticeText(row:Pick<NotificationRow,'body'|'message'>) {
  const text=row.body?.trim() || row.message?.trim() || '';
  const match=/^(Tungkol kay [^:\n]+):\s*([\s\S]*)$/i.exec(text);
  const extra=row.body?.trim() && row.message?.trim() && row.body.trim()!==row.message.trim() ? row.message.trim():null;
  return {subject:match?.[1]??null,detail:match?match[2]:text,extra};
}
export function teacherNoticeDateMatches(value:string,period:string,now:number) {
  if(period==='all')return true;
  const timestamp=Date.parse(value);if(!Number.isFinite(timestamp)||timestamp>now)return false;
  const day=86_400_000,offset=8*60*60*1000;
  const today=Math.floor((now+offset)/day)*day-offset;
  const days=period==='today'?1:period==='7'?7:period==='30'?30:0;
  return days>0 && timestamp>=today-(days-1)*day;
}
