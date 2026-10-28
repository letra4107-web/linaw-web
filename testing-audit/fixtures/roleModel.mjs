// Synthetic browser persistence model. It is not a Supabase/RLS implementation.
export const ids = Object.fromEntries(['admin', 'teacher', 'parent', 'student', 'child', 'module', 'assessment', 'item', 'section', 'message'].map((name, index) => [name, `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`]));
export const settings = { systemName: 'LinawLetra', organizationName: 'Isolated QA', defaultLanguage: 'fil', timezone: 'Asia/Manila', sequentialModules: true, passingScore: 75, completionRequirement: 80, allowActivityRetry: true, autoSaveProgress: true, xpPerActivity: 10, xpPerModule: 50, enableBadges: true, enableDailyStreak: true, enableAchievementRewards: true, studentProgressAlerts: true, newAccountNotifications: true, teacherNotifications: true, systemAnnouncements: true, sessionTimeout: '30', failedLoginLimit: 5, requireStrongPassword: true, lockAfterFailures: true, maintenanceMode: false, announcement: '', readOnlyMode: false };
export function createRoleModel(role, variant = 'populated') {
  const timestamp = new Date().toISOString();
  const child = { id: ids.child, name: 'QA Learner', username: 'qa-learner', grade_level: 1, level: 'Beginner', parent_id: ids.parent, auth_uid: ids.student, created_at: timestamp };
  const users = ['admin', 'teacher', 'parent', 'student'].map((r) => ({ id: ids[r], name: `QA ${r}`, email: `qa-${r}@example.invalid`, role: r, email_verified: true, account_status: 'active', is_active: true, created_at: timestamp, lastLoginAt: timestamp, avatar_url: null, profile: { gradeLevel: r === 'student' ? 1 : null } }));
  const progress = { child_id: ids.child, level: 'Beginner', xp: 100, streak: 2, longest_streak: 2, accuracy_sum: 160, total_attempts: 2, activities_completed: 2, achievements: [], badges: [], updated_at: timestamp };
  const tables = {
    users, children: [child], child_progress: [progress],
    parents: [{ id: ids.parent, auth_uid: ids.parent, avatar_url: null }],
    parents_settings: [{ auth_uid: ids.parent, preferred_language: 'fil', preferred_theme: 'light', notifications_enabled: true }],
    teacher_profiles: [{ user_id: ids.teacher, grade_levels: [1] }],
    teacher_student_links: variant === 'empty' ? [] : [{ id: ids.section, teacher_id: ids.teacher, student_id: ids.child, assigned_at: timestamp, children: child }],
    student_settings: [{ auth_uid: ids.student, dyslexia_font: false, font_size: 'medium', high_contrast: false, reading_guide: false }],
    word_of_day_log: [{ id: ids.item, child_id: ids.child, word: 'bata', date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()), attempts: 0, correct: null, accuracy: null, xp_awarded: 0, completed_at: null }],
    notifications: [], reading_content: [], word_definitions: [], pronunciation_practice_sessions: [], completed_reading_content: [],
    scheduled_activities: [], pdf_materials: [], pdf_assignments: [], teacher_lessons: [], lessons: [], teacher_messages: [], parent_teacher_replies: [],
    class_sections: [], section_students: [], analytics_events: [], app_events: [],
  };
  const module = { id: ids.module, module_number: 1, title: 'QA Reading Module', description: 'Synthetic reading lesson', state: 'unlocked', instructional_content_type: 'word', content_item_count: 1, completed_content_item_count: 0 };
  const path = { configured: variant !== 'empty', effective_level: 'Beginner', modules: variant === 'empty' ? [] : [module] };
  const profile = { generatedAt: timestamp, averageAccuracy: 80, sessionCount: 2, recentSessionCount: 0, completedContentCount: 0, weeklyAccuracyTrendPoints: 0, needsIntervention: false, confidenceScore: 0, confidenceLabel: 'Needs More Practice', consistencyScore: 0, averageDurationSeconds: null, accuracyTrendPoints: 0, weeklyPracticeDays: 0, strongSounds: [], weakSounds: [], weakSyllables: [], weakWords: [], mostImprovedSound: null, recommendedFocus: 'Continue the current curriculum frontier', recommendedHomePractice: 'Synthetic home practice', insights: [], readingJourney: 'Beginner Reader', measurementNote: 'Synthetic observations' };
  return { role, variant, timestamp, child, users, progress, tables, module, path, profile, calls: [], unexpected: [], settings: { ...settings } };
}

export function apiFixture(model, pathname, method = 'GET', body = {}) {
  const url = new URL(pathname, 'http://qa.invalid');
  const p = url.pathname.replace(/^\/api/, '');
  model.calls.push({ kind: 'api', method, path: p, body });
  if (model.variant === 'error' && !['/auth/events', '/student/notify-login'].includes(p)) return { status: 503, data: { error: 'Isolated service unavailable. Please retry.' } };
  if (p === '/auth/events' || p === '/student/notify-login') return { data: { success: true } };
  if (p === '/notifications') return { data: { notifications: model.tables.notifications } };
  if (p === '/notifications/read-all') { model.tables.notifications.forEach((n) => { n.is_read = true; }); return { data: { success: true } }; }
  if (/^\/notifications\/[^/]+\/read$/.test(p)) { model.tables.notifications.forEach((n) => { if (n.id === p.split('/')[2]) n.is_read = true; }); return { data: { success: true } }; }
  if (p === '/admin/analytics') return { data: { enrollmentTrend: [], usageTrend: [], enrollmentByRole: [], roleCounts: { admin: 1, teacher: 1, parent: 1, student: 1 }, totals: { children: 1, studentAccounts: 1, users: 4, totalXp: 100, badgeUnlockCount: 0, practiceSessions: 0 } } };
  if (p === '/admin/users' || p === '/admin/monitoring/users') return { data: { users: model.variant === 'empty' ? [] : model.users.filter((u) => !url.searchParams.get('role') || u.role === url.searchParams.get('role')) } };
  if (p === '/admin/users/archived') return { data: { users: [] } };
  if (p === '/admin/analytics/students') return { data: { students: [] } };
  if (p === '/admin/credential-security') return { data: { credentials: { totalStudents: 1, legacy: 0, rotatedPending: 0, secure: 1, fullyRetired: 1, missing: 0, requiresRotation: 0 } } };
  if (p === '/admin/system-settings') { if (method === 'PATCH') Object.assign(model.settings, body); return { data: { settings: model.settings } }; }
  if (p === '/admin/audit-logs') return { data: { logs: [] } };
  if (p === '/admin/sections') {
    if (method === 'POST') model.tables.class_sections.push({ id: ids.section, name: body.name, grade_level: body.gradeLevel, adviser_id: body.adviserId, capacity: 35, studentCount: 0 });
    return { data: { sections: model.tables.class_sections, teachers: model.users.filter((u) => u.role === 'teacher') } };
  }
  if (/^\/admin\/monitoring\/users\/[^/]+$/.test(p)) return { data: { children: [model.child], progress: model.progress, modules: model.path.modules, sessions: [], roster: [], materials: [], assignments: [], sections: [], activity: [] } };
  if (/^\/admin\/monitoring\/users\/[^/]+\/notes$/.test(p)) return { data: { notes: [] } };
  if (p === '/parent/children') return { data: { children: model.variant === 'empty' ? [] : [model.child] } };
  if (p === '/parent/children/credential-security') return { data: { children: [] } };
  if (/\/reading-profile$/.test(p)) return { data: { profile: model.profile } };
  if (/\/learning-path$/.test(p) || p === '/student/learn/path') return { data: model.path };
  if (/^\/parent\/children\/[^/]+\/materials$/.test(p)) return { data: { materials: [] } };
  if (/^\/parent\/children\/[^/]+\/settings$/.test(p)) return { data: { settings: model.tables.student_settings[0] } };
  if (/^\/teacher\/students\/[^/]+\/modules$/.test(p)) return { data: { modules: model.path.modules } };
  if (/^\/student\/learn\/module\/[^/]+$/.test(p)) return { data: { module: { ...model.module, assessment_id: ids.assessment }, items: [] } };
  if (/^\/student\/learn\/assessment\/[^/]+\/start$/.test(p)) return { data: { attempt_id: ids.assessment, assessment_id: ids.assessment, module_id: ids.module, pass_percentage: 80, status: 'started', items: [{ assessment_item_id: ids.item, content_id: ids.item, content_text: 'bata', content_type: 'word', answer_options: ['bata', 'pusa'], item_order: 1 }] } };
  if (/^\/student\/learn\/content\/[^/]+\/attempt$/.test(p)) return { data: { attempt_id: ids.item, accuracy: 100, correct: true } };
  if (/^\/student\/learn\/assessment\/[^/]+\/submit$/.test(p)) return { data: { score: 100, passed: true } };
  model.unexpected.push({ method, path: p });
  return { status: 501, data: { error: 'Unhandled isolated fixture contract' } };
}
