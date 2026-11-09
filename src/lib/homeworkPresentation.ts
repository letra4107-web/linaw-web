import type { Homework, HomeworkSubmission } from './homework';

export type HomeworkFilter = 'upcoming' | 'late' | 'done';
export const HOMEWORK_FILTERS: { key: HomeworkFilter; label: string }[] = [
  { key: 'upcoming', label: 'Paparating' },
  { key: 'late', label: 'Lampas sa Takdang Araw' },
  { key: 'done', label: 'Naipasa na' },
];
const zone = 'Asia/Manila';
export function homeworkCategory(assignment: Homework, answer?: HomeworkSubmission, now = Date.now()): HomeworkFilter {
  if (answer?.status === 'submitted' || answer?.status === 'reviewed') return 'done';
  return assignment.due_at && new Date(assignment.due_at).getTime() <= now ? 'late' : 'upcoming';
}
export function homeworkDeadline(value: string | null) {
  return value ? new Date(value).toLocaleString('fil-PH', { timeZone: zone, month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Walang takdang araw';
}
export function homeworkSubmitLabel(assignment: Homework, answer?: HomeworkSubmission, now = Date.now()) {
  return answer?.revision ? 'Ipasa Muli ang Sagot' : homeworkCategory(assignment, answer, now) === 'late' ? 'Ipasa Kahit Huli' : 'Ipasa ang Sagot';
}
export function groupHomework(assignments: Homework[], answers: HomeworkSubmission[], filter: HomeworkFilter, now = Date.now()) {
  const answerById = new Map(answers.map(answer => [answer.assignment_id, answer]));
  const rows = assignments.filter(item => homeworkCategory(item, answerById.get(item.id), now) === filter).slice();
  const time = (item: Homework) => item.due_at ? Date.parse(item.due_at) : null;
  rows.sort((a, b) => {
    const left = time(a), right = time(b);
    if (left === null || right === null) return left === right ? Date.parse(b.created_at) - Date.parse(a.created_at) : left === null ? 1 : -1;
    return (filter === 'upcoming' ? left - right : right - left) || a.title.localeCompare(b.title);
  });
  const groups: { key: string; label: string; items: { assignment: Homework; answer?: HomeworkSubmission }[] }[] = [];
  for (const assignment of rows) {
    const key = assignment.due_at ? new Date(assignment.due_at).toLocaleDateString('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'no-deadline';
    let group = groups.find(item => item.key === key);
    if (!group) {
      group = { key, label: assignment.due_at ? new Date(assignment.due_at).toLocaleDateString('fil-PH', { timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Walang takdang araw', items: [] };
      groups.push(group);
    }
    group.items.push({ assignment, answer: answerById.get(assignment.id) });
  }
  return groups;
}
