# Project inventory

Audit date: **2026-10-21, Asia/Manila**. Working-tree source, including pre-existing edits, was audited. No shared Supabase requests, schema changes, record changes, account creation, email delivery, commit, push, or deployment were performed. PASS applies only to the named executed assertion. Source indexing, compilation, mocks, and anonymous redirects do not establish complete signed-in functionality.

## Actual architecture

LinawLetra is a Filipino reading application with Admin, Teacher, Parent and Student roles. React 19, TypeScript 6, Vite 8, React Router 7, TanStack Query, Tailwind 4, Recharts and Supabase JS implement the frontend. Express 4/CommonJS on Node implements the API; Supabase provides Auth, PostgreSQL, RLS, Storage and Realtime. Nodemailer handles server SMTP; ElevenLabs supplies TTS; browser speech APIs supply recognition. PDF upload/extraction uses Multer, pdf-parse and pdf2json. Forms use component state and validation; package presence alone does not establish use of every installed library.

Frontend routing: src/App.tsx and src/routes/*Area.tsx. Backend: server/server.js mounts /api/admin, /teacher, /parent, /student, /notifications, /auth, /tts and the explicitly anonymous /public/tts alias. Browser code also accesses Supabase directly, making database RLS a separate security boundary. Bearer authentication and current-role/status authorization run on the server. Hosted frontend configuration is public/.htaccess; backend deployment is server/railway.json; CI builds/tests and can deploy on main pushes. No deployment was invoked.

## Exhaustive source indexes

| Index | Count | Artifact |
| --- | --- | --- |
| Files (source/configuration/assets/tests/scripts) | 379 | [inventory.json](inventory.json) |
| Functions including inline callbacks/test helpers | 3032 | [FUNCTION_INVENTORY.csv](FUNCTION_INVENTORY.csv) |
| Product functions excluding tests/maintenance scripts | 2139 | subset of function index |
| API declarations | 74 | [API_AND_ROUTE_INVENTORY.csv](API_AND_ROUTE_INVENTORY.csv) |
| UI Route declarations, including layouts/fallbacks | 57 | [API_AND_ROUTE_INVENTORY.csv](API_AND_ROUTE_INVENTORY.csv) |
| Interactive source templates | 544 | [CONTROL_INVENTORY.csv](CONTROL_INVENTORY.csv) |
| Data-access expressions | 503 | [DATABASE_DEPENDENCIES.csv](DATABASE_DEPENDENCIES.csv) |
| Web migrations | 47 | [inventory.json](inventory.json) |
| Historical documentation/evidence files | 315 | inventory.json documentationArtifacts |

Function rows record name, file/line, source-derived purpose/expected operations, actual verification limit, dependencies, conditions, error handlers, testing status and test references. This is a complete AST index of declarations, not a claim of individual human review or runtime coverage of every function/branch. A test mentioning a name is only a candidate reference. Inline callbacks and shared controls cannot be assumed passed from a parent screen pass.

## Every page

| Page | Area | Static importers | Full signed-in workflow status |
| --- | --- | --- | --- |
| [src/pages/admin/AdminLayout.tsx](../src/pages/admin/AdminLayout.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Analytics.tsx](../src/pages/admin/Analytics.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Archived.tsx](../src/pages/admin/Archived.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/AuditLogs.tsx](../src/pages/admin/AuditLogs.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Dashboard.tsx](../src/pages/admin/Dashboard.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Notifications.tsx](../src/pages/admin/Notifications.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Operations.tsx](../src/pages/admin/Operations.tsx) | admin | None found: review legacy/unrouted status | BLOCKED |
| [src/pages/admin/ParentMonitoringReference.tsx](../src/pages/admin/ParentMonitoringReference.tsx) | admin | src/pages/admin/RoleMonitoring.tsx | BLOCKED |
| [src/pages/admin/RoleMonitoring.tsx](../src/pages/admin/RoleMonitoring.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Sections.tsx](../src/pages/admin/Sections.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Settings.tsx](../src/pages/admin/Settings.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/StudentMonitoringReference.tsx](../src/pages/admin/StudentMonitoringReference.tsx) | admin | src/pages/admin/RoleMonitoring.tsx | BLOCKED |
| [src/pages/admin/SystemSettings.tsx](../src/pages/admin/SystemSettings.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/TeacherMonitoringReference.tsx](../src/pages/admin/TeacherMonitoringReference.tsx) | admin | src/pages/admin/RoleMonitoring.tsx | BLOCKED |
| [src/pages/admin/Teachers.tsx](../src/pages/admin/Teachers.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/admin/Users.tsx](../src/pages/admin/Users.tsx) | admin | src/routes/AdminArea.tsx | BLOCKED |
| [src/pages/auth/ForgotPassword.tsx](../src/pages/auth/ForgotPassword.tsx) | auth | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/auth/Login.tsx](../src/pages/auth/Login.tsx) | auth | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/auth/ResendVerification.tsx](../src/pages/auth/ResendVerification.tsx) | auth | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/auth/ResetPassword.tsx](../src/pages/auth/ResetPassword.tsx) | auth | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/auth/SignUp.tsx](../src/pages/auth/SignUp.tsx) | auth | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/auth/VerifyEmail.tsx](../src/pages/auth/VerifyEmail.tsx) | auth | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/Home.tsx](../src/pages/Home.tsx) | shared/public | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/Landing.tsx](../src/pages/Landing.tsx) | shared/public | src/pages/Home.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/NotFound.tsx](../src/pages/NotFound.tsx) | shared/public | src/routes/AdminArea.tsx, src/routes/ParentArea.tsx, src/routes/PublicArea.tsx, src/routes/StudentArea.tsx, src/routes/TeacherArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/parent/AppSettings.tsx](../src/pages/parent/AppSettings.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/Dashboard.tsx](../src/pages/parent/Dashboard.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/Materials.tsx](../src/pages/parent/Materials.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/Messages.tsx](../src/pages/parent/Messages.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/MyChildren.tsx](../src/pages/parent/MyChildren.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/Notifications.tsx](../src/pages/parent/Notifications.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/ParentLayout.tsx](../src/pages/parent/ParentLayout.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/ProgressReference.tsx](../src/pages/parent/ProgressReference.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/ProgressReport.tsx](../src/pages/parent/ProgressReport.tsx) | parent | None found: review legacy/unrouted status | BLOCKED |
| [src/pages/parent/Schedule.tsx](../src/pages/parent/Schedule.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/parent/Settings.tsx](../src/pages/parent/Settings.tsx) | parent | src/routes/ParentArea.tsx | BLOCKED |
| [src/pages/PublicInfo.tsx](../src/pages/PublicInfo.tsx) | shared/public | src/routes/PublicArea.tsx | NOT RUN at whole-page scope; see executed public subcases |
| [src/pages/student/Achievements.tsx](../src/pages/student/Achievements.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/student/Assessment.tsx](../src/pages/student/Assessment.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/student/Dashboard.tsx](../src/pages/student/Dashboard.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/student/Learn.tsx](../src/pages/student/Learn.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/student/Module.tsx](../src/pages/student/Module.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/student/Practice.tsx](../src/pages/student/Practice.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/student/Profile.tsx](../src/pages/student/Profile.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/student/StudentLayout.tsx](../src/pages/student/StudentLayout.tsx) | student | src/routes/StudentArea.tsx | BLOCKED |
| [src/pages/teacher/Dashboard.tsx](../src/pages/teacher/Dashboard.tsx) | teacher | src/routes/TeacherArea.tsx | BLOCKED |
| [src/pages/teacher/Lessons.tsx](../src/pages/teacher/Lessons.tsx) | teacher | src/pages/teacher/LessonsHub.tsx | BLOCKED |
| [src/pages/teacher/LessonsHub.tsx](../src/pages/teacher/LessonsHub.tsx) | teacher | src/routes/TeacherArea.tsx | BLOCKED |
| [src/pages/teacher/Messages.tsx](../src/pages/teacher/Messages.tsx) | teacher | src/routes/TeacherArea.tsx | BLOCKED |
| [src/pages/teacher/MyStudents.tsx](../src/pages/teacher/MyStudents.tsx) | teacher | src/routes/TeacherArea.tsx | BLOCKED |
| [src/pages/teacher/PdfReading.tsx](../src/pages/teacher/PdfReading.tsx) | teacher | src/pages/teacher/LessonsHub.tsx | BLOCKED |
| [src/pages/teacher/ProgressReports.tsx](../src/pages/teacher/ProgressReports.tsx) | teacher | src/routes/TeacherArea.tsx | BLOCKED |
| [src/pages/teacher/Settings.tsx](../src/pages/teacher/Settings.tsx) | teacher | src/routes/TeacherArea.tsx | BLOCKED |
| [src/pages/teacher/TeacherLayout.tsx](../src/pages/teacher/TeacherLayout.tsx) | teacher | src/routes/TeacherArea.tsx | BLOCKED |

## Every API and UI route

| ID | Kind | Method/path | Location | Whole-workflow status |
| --- | --- | --- | --- | --- |
| API-1 | API | GET /api/admin/operations | [server/routes/admin.js:17](../server/routes/admin.js) | BLOCKED |
| API-2 | API | GET /api/admin/audit-logs | [server/routes/admin.js:42](../server/routes/admin.js) | BLOCKED |
| API-3 | API | GET /api/admin/monitoring/users | [server/routes/admin.js:66](../server/routes/admin.js) | BLOCKED |
| API-4 | API | GET /api/admin/monitoring/users/:id | [server/routes/admin.js:102](../server/routes/admin.js) | BLOCKED |
| API-5 | API | GET /api/admin/monitoring/users/:id/notes | [server/routes/admin.js:133](../server/routes/admin.js) | BLOCKED |
| API-6 | API | POST /api/admin/monitoring/users/:id/notes | [server/routes/admin.js:147](../server/routes/admin.js) | BLOCKED |
| API-7 | API | DELETE /api/admin/monitoring/users/:id/notes/:noteId | [server/routes/admin.js:163](../server/routes/admin.js) | BLOCKED |
| API-8 | API | GET /api/admin/users | [server/routes/admin.js:193](../server/routes/admin.js) | BLOCKED |
| API-9 | API | GET /api/admin/users/archived | [server/routes/admin.js:217](../server/routes/admin.js) | BLOCKED |
| API-10 | API | GET /api/admin/credential-security | [server/routes/admin.js:233](../server/routes/admin.js) | BLOCKED |
| API-11 | API | GET /api/admin/storage-readiness | [server/routes/admin.js:248](../server/routes/admin.js) | BLOCKED |
| API-12 | API | POST /api/admin/users/:id/disable | [server/routes/admin.js:271](../server/routes/admin.js) | BLOCKED |
| API-13 | API | POST /api/admin/users/:id/restore | [server/routes/admin.js:303](../server/routes/admin.js) | BLOCKED |
| API-14 | API | POST /api/admin/users/:id/archive | [server/routes/admin.js:334](../server/routes/admin.js) | BLOCKED |
| API-15 | API | DELETE /api/admin/users/:id | [server/routes/admin.js:365](../server/routes/admin.js) | BLOCKED |
| API-16 | API | POST /api/admin/teachers | [server/routes/admin.js:395](../server/routes/admin.js) | BLOCKED |
| API-17 | API | GET /api/admin/sections | [server/routes/admin.js:477](../server/routes/admin.js) | BLOCKED |
| API-18 | API | POST /api/admin/sections | [server/routes/admin.js:490](../server/routes/admin.js) | BLOCKED |
| API-19 | API | GET /api/admin/sections/:id/students | [server/routes/admin.js:503](../server/routes/admin.js) | BLOCKED |
| API-20 | API | POST /api/admin/sections/:id/students | [server/routes/admin.js:527](../server/routes/admin.js) | BLOCKED |
| API-21 | API | GET /api/admin/analytics/students | [server/routes/admin.js:545](../server/routes/admin.js) | BLOCKED |
| API-22 | API | GET /api/admin/analytics | [server/routes/admin.js:590](../server/routes/admin.js) | BLOCKED |
| API-23 | API | GET /api/admin/system-settings | [server/routes/admin.js:681](../server/routes/admin.js) | BLOCKED |
| API-24 | API | PATCH /api/admin/system-settings | [server/routes/admin.js:692](../server/routes/admin.js) | BLOCKED |
| API-25 | API | POST /api/auth/events | [server/routes/authEvents.js:7](../server/routes/authEvents.js) | BLOCKED |
| API-26 | API | GET /api/notifications | [server/routes/notifications.js:55](../server/routes/notifications.js) | BLOCKED |
| API-27 | API | POST /api/notifications/:id/read | [server/routes/notifications.js:65](../server/routes/notifications.js) | BLOCKED |
| API-28 | API | POST /api/notifications/read-all | [server/routes/notifications.js:82](../server/routes/notifications.js) | BLOCKED |
| API-29 | API | GET /api/parent/children/credential-security | [server/routes/parent.js:55](../server/routes/parent.js) | BLOCKED |
| API-30 | API | GET /api/parent/children | [server/routes/parent.js:76](../server/routes/parent.js) | BLOCKED |
| API-31 | API | POST /api/parent/children | [server/routes/parent.js:116](../server/routes/parent.js) | BLOCKED |
| API-32 | API | POST /api/parent/children/:id/reading-level | [server/routes/parent.js:241](../server/routes/parent.js) | BLOCKED |
| API-33 | API | GET /api/parent/children/:id/reading-profile | [server/routes/parent.js:257](../server/routes/parent.js) | BLOCKED |
| API-34 | API | GET /api/parent/children/:id/learning-path | [server/routes/parent.js:298](../server/routes/parent.js) | BLOCKED |
| API-35 | API | GET /api/parent/children/:id/materials | [server/routes/parent.js:311](../server/routes/parent.js) | BLOCKED |
| API-36 | API | GET /api/parent/children/:id/materials/:assignmentId/access-url | [server/routes/parent.js:326](../server/routes/parent.js) | BLOCKED |
| API-37 | API | GET /api/parent/children/:id/settings | [server/routes/parent.js:359](../server/routes/parent.js) | BLOCKED |
| API-38 | API | PATCH /api/parent/children/:id/settings | [server/routes/parent.js:387](../server/routes/parent.js) | BLOCKED |
| API-39 | API | POST /api/parent/children/:id/reset-password | [server/routes/parent.js:419](../server/routes/parent.js) | BLOCKED |
| API-40 | API | POST /api/student/notify-login | [server/routes/student.js:97](../server/routes/student.js) | BLOCKED |
| API-41 | API | GET /api/student/learn/path | [server/routes/student.js:140](../server/routes/student.js) | BLOCKED |
| API-42 | API | GET /api/student/learn/module/:moduleId | [server/routes/student.js:152](../server/routes/student.js) | BLOCKED |
| API-43 | API | POST /api/student/learn/content/:contentId/attempt | [server/routes/student.js:171](../server/routes/student.js) | BLOCKED |
| API-44 | API | POST /api/student/learn/content/:contentId/authoritative-attempt | [server/routes/student.js:212](../server/routes/student.js) | BLOCKED |
| API-45 | API | POST /api/student/learn/assessment/:assessmentId/start | [server/routes/student.js:337](../server/routes/student.js) | BLOCKED |
| API-46 | API | POST /api/student/learn/assessment/:attemptId/submit | [server/routes/student.js:352](../server/routes/student.js) | BLOCKED |
| API-47 | API | GET /api/student/learn/module/:moduleId/nonsense-check | [server/routes/student.js:378](../server/routes/student.js) | BLOCKED |
| API-48 | API | POST /api/student/learn/module/:moduleId/nonsense-check/submit | [server/routes/student.js:437](../server/routes/student.js) | BLOCKED |
| API-49 | API | GET /api/student/learn/module/:moduleId/challenge-words | [server/routes/student.js:519](../server/routes/student.js) | BLOCKED |
| API-50 | API | POST /api/student/learn/module/:moduleId/equip | [server/routes/student.js:544](../server/routes/student.js) | BLOCKED |
| API-51 | API | POST /api/student/learn/module/:moduleId/unequip | [server/routes/student.js:564](../server/routes/student.js) | BLOCKED |
| API-52 | API | GET /api/student/reading-profile | [server/routes/student.js:584](../server/routes/student.js) | BLOCKED |
| API-53 | API | POST /api/student/practice/attempt | [server/routes/student.js:621](../server/routes/student.js) | BLOCKED |
| API-54 | API | POST /api/student/word-of-day/attempt | [server/routes/student.js:659](../server/routes/student.js) | BLOCKED |
| API-55 | API | GET /api/student/pdf-drill/:assignmentId | [server/routes/student.js:751](../server/routes/student.js) | BLOCKED |
| API-56 | API | GET /api/student/pdf-materials/:assignmentId/access-url | [server/routes/student.js:796](../server/routes/student.js) | BLOCKED |
| API-57 | API | GET /api/student/pdf-reading/:assignmentId | [server/routes/student.js:816](../server/routes/student.js) | BLOCKED |
| API-58 | API | POST /api/student/pdf-reading/attempt | [server/routes/student.js:837](../server/routes/student.js) | BLOCKED |
| API-59 | API | POST /api/student/pdf-reading/:assignmentId/submit | [server/routes/student.js:881](../server/routes/student.js) | BLOCKED |
| API-60 | API | GET /api/student/lessons/:lessonId/access-url | [server/routes/student.js:908](../server/routes/student.js) | BLOCKED |
| API-61 | API | POST /api/student/pdf-drill/attempt | [server/routes/student.js:928](../server/routes/student.js) | BLOCKED |
| API-62 | API | GET /api/teacher/students/:studentId/modules | [server/routes/teacher.js:22](../server/routes/teacher.js) | BLOCKED |
| API-63 | API | POST /api/teacher/pdf | [server/routes/teacher.js:55](../server/routes/teacher.js) | BLOCKED |
| API-64 | API | GET /api/teacher/pdf/:id/access-url | [server/routes/teacher.js:132](../server/routes/teacher.js) | BLOCKED |
| API-65 | API | GET /api/teacher/lessons/:id/access-url | [server/routes/teacher.js:143](../server/routes/teacher.js) | BLOCKED |
| API-66 | API | PATCH /api/teacher/pdf/:id | [server/routes/teacher.js:161](../server/routes/teacher.js) | BLOCKED |
| API-67 | API | POST /api/teacher/pdf/:id/archive | [server/routes/teacher.js:192](../server/routes/teacher.js) | BLOCKED |
| API-68 | API | POST /api/teacher/pdf/:id/unarchive | [server/routes/teacher.js:211](../server/routes/teacher.js) | BLOCKED |
| API-69 | API | POST /api/teacher/pdf-drill | [server/routes/teacher.js:231](../server/routes/teacher.js) | BLOCKED |
| API-70 | API | GET /api/teacher/pdf-drill/:materialId/items | [server/routes/teacher.js:303](../server/routes/teacher.js) | BLOCKED |
| API-71 | API | PATCH /api/teacher/pdf-drill/:materialId/items | [server/routes/teacher.js:325](../server/routes/teacher.js) | BLOCKED |
| API-72 | API | POST /api/teacher/pdf-drill/:materialId/publish | [server/routes/teacher.js:380](../server/routes/teacher.js) | BLOCKED |
| API-73 | API | POST /api/tts | [server/routes/tts.js:33](../server/routes/tts.js) | BLOCKED |
| API-74 | API | GET /api/health | [server/server.js:77](../server/server.js) | PASS |
| UI-1 | UI |  /admin/* | [src/App.tsx:18](../src/App.tsx) | NOT RUN |
| UI-2 | UI |  /parent/* | [src/App.tsx:19](../src/App.tsx) | NOT RUN |
| UI-3 | UI |  /student/* | [src/App.tsx:20](../src/App.tsx) | NOT RUN |
| UI-4 | UI |  /teacher/* | [src/App.tsx:21](../src/App.tsx) | NOT RUN |
| UI-5 | UI |  * | [src/App.tsx:22](../src/App.tsx) | NOT RUN |
| UI-6 | UI |  /admin | [src/routes/AdminArea.tsx:20](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-7 | UI |  /admin | [src/routes/AdminArea.tsx:21](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-8 | UI |  /admin/users | [src/routes/AdminArea.tsx:21](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-9 | UI |  /admin/archived | [src/routes/AdminArea.tsx:21](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-10 | UI |  /admin/teachers | [src/routes/AdminArea.tsx:22](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-11 | UI |  /admin/sections | [src/routes/AdminArea.tsx:22](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-12 | UI |  /admin/analytics | [src/routes/AdminArea.tsx:22](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-13 | UI |  /admin/notifications | [src/routes/AdminArea.tsx:23](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-14 | UI |  /admin/settings | [src/routes/AdminArea.tsx:23](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-15 | UI |  /admin/profile | [src/routes/AdminArea.tsx:23](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-16 | UI |  /admin/audit-logs | [src/routes/AdminArea.tsx:24](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-17 | UI |  /admin/students | [src/routes/AdminArea.tsx:25](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-18 | UI |  /admin/parents | [src/routes/AdminArea.tsx:26](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-19 | UI |  /admin/teachers-monitoring | [src/routes/AdminArea.tsx:27](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-20 | UI |  /admin/* | [src/routes/AdminArea.tsx:28](../src/routes/AdminArea.tsx) | BLOCKED |
| UI-21 | UI |  /parent | [src/routes/ParentArea.tsx:18](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-22 | UI |  /parent | [src/routes/ParentArea.tsx:19](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-23 | UI |  /parent/children | [src/routes/ParentArea.tsx:19](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-24 | UI |  /parent/progress | [src/routes/ParentArea.tsx:19](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-25 | UI |  /parent/schedule | [src/routes/ParentArea.tsx:20](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-26 | UI |  /parent/messages | [src/routes/ParentArea.tsx:20](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-27 | UI |  /parent/settings | [src/routes/ParentArea.tsx:20](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-28 | UI |  /parent/notifications | [src/routes/ParentArea.tsx:21](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-29 | UI |  /parent/app-settings | [src/routes/ParentArea.tsx:21](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-30 | UI |  /parent/materials | [src/routes/ParentArea.tsx:21](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-31 | UI |  /parent/* | [src/routes/ParentArea.tsx:22](../src/routes/ParentArea.tsx) | BLOCKED |
| UI-32 | UI |  / | [src/routes/PublicArea.tsx:14](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-33 | UI |  /login | [src/routes/PublicArea.tsx:14](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-34 | UI |  /signup | [src/routes/PublicArea.tsx:14](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-35 | UI |  /forgot-password | [src/routes/PublicArea.tsx:15](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-36 | UI |  /reset-password | [src/routes/PublicArea.tsx:15](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-37 | UI |  /verify-email | [src/routes/PublicArea.tsx:16](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-38 | UI |  /resend-verification | [src/routes/PublicArea.tsx:16](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-39 | UI |  {path} | [src/routes/PublicArea.tsx:17](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-40 | UI |  * | [src/routes/PublicArea.tsx:18](../src/routes/PublicArea.tsx) | NOT RUN |
| UI-41 | UI |  /student | [src/routes/StudentArea.tsx:14](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-42 | UI |  /student | [src/routes/StudentArea.tsx:15](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-43 | UI |  /student/learn | [src/routes/StudentArea.tsx:15](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-44 | UI |  /student/learn/module/:moduleId | [src/routes/StudentArea.tsx:15](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-45 | UI |  /student/learn/assessment/:assessmentId | [src/routes/StudentArea.tsx:16](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-46 | UI |  /student/practice | [src/routes/StudentArea.tsx:16](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-47 | UI |  /student/achievements | [src/routes/StudentArea.tsx:17](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-48 | UI |  /student/profile | [src/routes/StudentArea.tsx:17](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-49 | UI |  /student/* | [src/routes/StudentArea.tsx:18](../src/routes/StudentArea.tsx) | BLOCKED |
| UI-50 | UI |  /teacher | [src/routes/TeacherArea.tsx:15](../src/routes/TeacherArea.tsx) | BLOCKED |
| UI-51 | UI |  /teacher | [src/routes/TeacherArea.tsx:16](../src/routes/TeacherArea.tsx) | BLOCKED |
| UI-52 | UI |  /teacher/students | [src/routes/TeacherArea.tsx:16](../src/routes/TeacherArea.tsx) | BLOCKED |
| UI-53 | UI |  /teacher/lessons | [src/routes/TeacherArea.tsx:16](../src/routes/TeacherArea.tsx) | BLOCKED |
| UI-54 | UI |  /teacher/progress-reports | [src/routes/TeacherArea.tsx:17](../src/routes/TeacherArea.tsx) | BLOCKED |
| UI-55 | UI |  /teacher/messages | [src/routes/TeacherArea.tsx:17](../src/routes/TeacherArea.tsx) | BLOCKED |
| UI-56 | UI |  /teacher/settings | [src/routes/TeacherArea.tsx:17](../src/routes/TeacherArea.tsx) | BLOCKED |
| UI-57 | UI |  /teacher/* | [src/routes/TeacherArea.tsx:18](../src/routes/TeacherArea.tsx) | BLOCKED |

POST /api/public/tts reuses the TTS factory with anonymous middleware and an IP limiter; it is an additional mount rather than another declaration. GET /api/health is local and covered by real HTTP assertions.

## Database and configuration

| Migration | Created tables | Contains data-changing SQL | Full replay |
| --- | --- | --- | --- |
| migrations/001_web_login_otp.sql | web_login_otp | false | BLOCKED |
| migrations/002_users_archive_trail.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/003_teacher_profiles.sql | teacher_profiles | false | BLOCKED |
| migrations/004_teacher_workspace.sql | teacher_student_links, pdf_materials, pdf_assignments, pdf_reading_attempts, teacher_assessments, teacher_assessment_scores, learning_paths, learning_path_items, learning_path_assignments | true | BLOCKED |
| migrations/005_lesson_pdfs_bucket.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/006_teacher_settings.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/007_fix_pdf_rls_recursion.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/008_fix_children_student_id_ambiguity.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/009_teacher_read_roster_children.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/010_parent_notifications_and_rls.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/011_dedupe_parent_notifications.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/012_teacher_messages.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/013_fix_teacher_messages_policy_leak.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/014_fix_parent_teacher_name_rls_recursion.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/015_teacher_read_parent_name.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/016_pdf_syllable_drill.sql | pdf_drill_items | false | BLOCKED |
| migrations/017_pdf_materials_archive.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/018_nonsense_word_checks.sql | student_nonsense_checks | false | BLOCKED |
| migrations/019_module1_marungko_realign.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/020_beginner_modules_marungko_order.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/021_intermediate_m1_d_coverage.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/022_advanced_kwento1_content.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/023_retire_plaintext_student_credentials.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/024_lock_down_student_credentials.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/025_storage_path_transition.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/026_atomic_badge_awards.sql | student_badge_awards | true | BLOCKED |
| migrations/027_authoritative_speech_scoring_pilot.sql | authoritative_speech_attempt_keys | false | BLOCKED |
| migrations/029_guided_pdf_story_reading.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/030_admin_audit_logs.sql | audit_logs | false | BLOCKED |
| migrations/031_direct_mutation_audit.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/032_lock_down_pdf_reading_student_mutations.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/033_lock_down_practice_session_mutations.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/034_authoritative_nonsense_word_sets.sql | student_nonsense_check_sets | false | BLOCKED |
| migrations/035_audit_action_taxonomy.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/036_fill_active_word_definitions.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/037_correct_demo_student_placements.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/038_audit_login_sessions.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/039_admin_system_settings.sql | system_settings | false | BLOCKED |
| migrations/040_parent_teacher_replies.sql | parent_teacher_replies | true | BLOCKED |
| migrations/041_parent_settings_preferences.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/042_parent_theme_preference.sql | alter/function/policy/data migration | false | BLOCKED |
| migrations/043_parent_avatar_uploads.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/044_admin_student_notes.sql | admin_student_notes | false | BLOCKED |
| migrations/045_teacher_avatar_uploads.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/046_sections_and_reading_support_groups.sql | class_sections, section_students | false | BLOCKED |
| migrations/047_atomic_section_assignments.sql | alter/function/policy/data migration | true | BLOCKED |
| migrations/048_section_capacity_snapshot_safety.sql | alter/function/policy/data migration | true | BLOCKED |

Migrations start with web-specific additions; they do not establish a complete empty-project baseline. No file was executed against shared Supabase. A minimal disposable local fixture is separately blocked by host setup; historical reports are not fresh results. Environment variable names only are indexed in inventory.json; private env values were never copied into reports. Dependencies are pinned in root/server lockfiles. The optional scripts/qa-tools workspace is tooling, not the deployed application.

| File | Documented variables |
| --- | --- |
| .env.example | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL, VITE_APP_VERSION, VITE_API_COMPATIBILITY_VERSION, VITE_ANALYTICS_ENDPOINT |
| server/.env.example | NODE_ENV, PORT, CORS_ORIGIN, FRONTEND_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM, BREVO_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, STORAGE_SIGNED_URLS_ENABLED, API_COMPATIBILITY_VERSION, APP_VERSION, GIT_COMMIT_SHA |

## All source/configuration files

| File | Kind | Area | Recorded status |
| --- | --- | --- | --- |
| .env.example | asset/configuration | shared/public | NOT RUN |
| .github/workflows/ci.yml | asset/configuration | shared/public | NOT RUN |
| .gitignore | asset/configuration | shared/public | NOT RUN |
| index.html | asset/configuration | shared/public | NOT RUN |
| migrations/001_web_login_otp.sql | migration | shared/public | NOT RUN |
| migrations/002_users_archive_trail.sql | migration | shared/public | NOT RUN |
| migrations/003_teacher_profiles.sql | migration | shared/public | NOT RUN |
| migrations/004_teacher_workspace.sql | migration | shared/public | NOT RUN |
| migrations/005_lesson_pdfs_bucket.sql | migration | shared/public | NOT RUN |
| migrations/006_teacher_settings.sql | migration | shared/public | NOT RUN |
| migrations/007_fix_pdf_rls_recursion.sql | migration | shared/public | NOT RUN |
| migrations/008_fix_children_student_id_ambiguity.sql | migration | shared/public | NOT RUN |
| migrations/009_teacher_read_roster_children.sql | migration | shared/public | NOT RUN |
| migrations/010_parent_notifications_and_rls.sql | migration | shared/public | NOT RUN |
| migrations/011_dedupe_parent_notifications.sql | migration | shared/public | NOT RUN |
| migrations/012_teacher_messages.sql | migration | shared/public | NOT RUN |
| migrations/013_fix_teacher_messages_policy_leak.sql | migration | shared/public | NOT RUN |
| migrations/014_fix_parent_teacher_name_rls_recursion.sql | migration | shared/public | NOT RUN |
| migrations/015_teacher_read_parent_name.sql | migration | shared/public | NOT RUN |
| migrations/016_pdf_syllable_drill.sql | migration | shared/public | NOT RUN |
| migrations/017_pdf_materials_archive.sql | migration | shared/public | NOT RUN |
| migrations/018_nonsense_word_checks.sql | migration | shared/public | NOT RUN |
| migrations/019_module1_marungko_realign.sql | migration | shared/public | NOT RUN |
| migrations/020_beginner_modules_marungko_order.sql | migration | shared/public | NOT RUN |
| migrations/021_intermediate_m1_d_coverage.sql | migration | shared/public | NOT RUN |
| migrations/022_advanced_kwento1_content.sql | migration | shared/public | NOT RUN |
| migrations/023_retire_plaintext_student_credentials.sql | migration | shared/public | NOT RUN |
| migrations/024_lock_down_student_credentials.sql | migration | shared/public | NOT RUN |
| migrations/025_storage_path_transition.sql | migration | shared/public | NOT RUN |
| migrations/026_atomic_badge_awards.sql | migration | shared/public | NOT RUN |
| migrations/027_authoritative_speech_scoring_pilot.sql | migration | shared/public | NOT RUN |
| migrations/029_guided_pdf_story_reading.sql | migration | shared/public | NOT RUN |
| migrations/030_admin_audit_logs.sql | migration | shared/public | NOT RUN |
| migrations/031_direct_mutation_audit.sql | migration | shared/public | NOT RUN |
| migrations/032_lock_down_pdf_reading_student_mutations.sql | migration | shared/public | NOT RUN |
| migrations/033_lock_down_practice_session_mutations.sql | migration | shared/public | NOT RUN |
| migrations/034_authoritative_nonsense_word_sets.sql | migration | shared/public | NOT RUN |
| migrations/035_audit_action_taxonomy.sql | migration | shared/public | NOT RUN |
| migrations/036_fill_active_word_definitions.sql | migration | shared/public | NOT RUN |
| migrations/037_correct_demo_student_placements.sql | migration | shared/public | NOT RUN |
| migrations/038_audit_login_sessions.sql | migration | shared/public | NOT RUN |
| migrations/039_admin_system_settings.sql | migration | shared/public | NOT RUN |
| migrations/040_parent_teacher_replies.sql | migration | shared/public | NOT RUN |
| migrations/041_parent_settings_preferences.sql | migration | shared/public | NOT RUN |
| migrations/042_parent_theme_preference.sql | migration | shared/public | NOT RUN |
| migrations/043_parent_avatar_uploads.sql | migration | shared/public | NOT RUN |
| migrations/044_admin_student_notes.sql | migration | shared/public | NOT RUN |
| migrations/045_teacher_avatar_uploads.sql | migration | shared/public | NOT RUN |
| migrations/046_sections_and_reading_support_groups.sql | migration | shared/public | NOT RUN |
| migrations/047_atomic_section_assignments.sql | migration | shared/public | NOT RUN |
| migrations/048_section_capacity_snapshot_safety.sql | migration | shared/public | NOT RUN |
| package-lock.json | asset/configuration | shared/public | NOT RUN |
| package.json | asset/configuration | shared/public | NOT RUN |
| public/.htaccess | asset/configuration | shared/public | NOT RUN |
| public/favicon.jpg | asset/configuration | shared/public | NOT RUN |
| public/favicon.svg | asset/configuration | shared/public | NOT RUN |
| public/icons.svg | asset/configuration | shared/public | NOT RUN |
| public/Logo.jpg | asset/configuration | shared/public | NOT RUN |
| public/robots.txt | asset/configuration | shared/public | NOT RUN |
| public/site.webmanifest | asset/configuration | shared/public | NOT RUN |
| public/sitemap.xml | asset/configuration | shared/public | NOT RUN |
| README.md | asset/configuration | shared/public | NOT RUN |
| scripts/qa-browser.mjs | source | shared/public | NOT RUN |
| scripts/qa-checks.mjs | source | shared/public | NOT RUN |
| scripts/qa-continuation-report.mjs | source | shared/public | NOT RUN |
| scripts/qa-database-worker.mjs | source | shared/public | NOT RUN |
| scripts/qa-database.mjs | source | shared/public | NOT RUN |
| scripts/qa-deployed-navigation-readonly.mjs | source | shared/public | NOT RUN |
| scripts/qa-environment.mjs | source | shared/public | NOT RUN |
| scripts/qa-inventory.mjs | source | shared/public | NOT RUN |
| scripts/qa-main-postmigration-report.mjs | source | shared/public | NOT RUN |
| scripts/qa-main-public-status.mjs | source | shared/public | NOT RUN |
| scripts/qa-main-readonly-lib.mjs | source | shared/public | NOT RUN |
| scripts/qa-main-readonly-local.mjs | source | shared/public | NOT RUN |
| scripts/qa-main-readonly.mjs | source | shared/public | NOT RUN |
| scripts/qa-main-source-review.mjs | source | shared/public | NOT RUN |
| scripts/qa-network-diagnostic.mjs | source | shared/public | NOT RUN |
| scripts/qa-phase3-report.mjs | source | shared/public | NOT RUN |
| scripts/qa-playwright.mjs | source | shared/public | NOT RUN |
| scripts/qa-postgres.mjs | source | shared/public | NOT RUN |
| scripts/qa-provision-accounts.mjs | source | shared/public | NOT RUN |
| scripts/qa-public-http.mjs | source | shared/public | NOT RUN |
| scripts/qa-redaction.mjs | source | shared/public | NOT RUN |
| scripts/qa-report.mjs | source | shared/public | NOT RUN |
| scripts/qa-save-baseline.mjs | source | shared/public | NOT RUN |
| scripts/qa-schema-contract.mjs | source | shared/public | NOT RUN |
| scripts/qa-staging.env.example | asset/configuration | shared/public | NOT RUN |
| scripts/qa-tools/package-lock.json | asset/configuration | shared/public | NOT RUN |
| scripts/qa-tools/package.json | asset/configuration | shared/public | NOT RUN |
| scripts/qa-validate-report.mjs | source | shared/public | NOT RUN |
| server/.env.example | asset/configuration | shared/public | NOT RUN |
| server/assets/linawletra-filipino-letter-sounds.pls | asset/configuration | shared/public | NOT RUN |
| server/config/mailer.js | source | shared/public | NOT RUN |
| server/config/supabase.js | source | shared/public | NOT RUN |
| server/config/validateConfig.js | source | shared/public | NOT RUN |
| server/lib/badgeEngine.js | source | shared/public | NOT RUN |
| server/lib/calendarDay.js | source | shared/public | NOT RUN |
| server/lib/challengeWords.js | source | shared/public | NOT RUN |
| server/lib/filipinoPhonemes.js | source | shared/public | NOT RUN |
| server/lib/nonsenseWords.js | source | shared/public | NOT RUN |
| server/lib/pdfDrillParser.js | source | shared/public | NOT RUN |
| server/lib/pdfValidation.js | source | shared/public | NOT RUN |
| server/lib/rateLimiters.js | source | shared/public | NOT RUN |
| server/lib/speechScoring.js | source | shared/public | NOT RUN |
| server/lib/stagingTarget.js | source | shared/public | NOT RUN |
| server/lib/syllabify.js | source | shared/public | NOT RUN |
| server/lib/temporaryPassword.js | source | shared/public | NOT RUN |
| server/lib/validation.js | source | shared/public | NOT RUN |
| server/middleware/auditTrail.js | source | shared/public | NOT RUN |
| server/middleware/auth.js | source | shared/public | NOT RUN |
| server/middleware/authCore.js | source | shared/public | NOT RUN |
| server/middleware/observability.js | source | shared/public | NOT RUN |
| server/package-lock.json | asset/configuration | shared/public | NOT RUN |
| server/package.json | asset/configuration | shared/public | NOT RUN |
| server/railway.json | asset/configuration | shared/public | NOT RUN |
| server/routes/admin.js | source | admin | NOT RUN |
| server/routes/authEvents.js | source | shared/public | NOT RUN |
| server/routes/notifications.js | source | shared/public | NOT RUN |
| server/routes/parent.js | source | parent | NOT RUN |
| server/routes/student.js | source | student | NOT RUN |
| server/routes/teacher.js | source | teacher | NOT RUN |
| server/routes/tts.js | source | shared/public | NOT RUN |
| server/scripts/generate-reading-story-pdfs.js | source | shared/public | NOT RUN |
| server/scripts/production-readiness-snapshot.js | source | shared/public | NOT RUN |
| server/scripts/render-thesis-pdf.js | source | shared/public | NOT RUN |
| server/scripts/seed-ten-module-curriculum.js | source | shared/public | NOT RUN |
| server/scripts/smoke-staging.js | source | shared/public | NOT RUN |
| server/scripts/verify-production-migrations.js | source | shared/public | NOT RUN |
| server/server.js | source | shared/public | NOT RUN |
| server/services/audit.js | source | shared/public | NOT RUN |
| server/services/authorization.js | source | shared/public | NOT RUN |
| server/services/credentialSecurity.js | source | shared/public | NOT RUN |
| server/services/learningProgression.js | source | shared/public | NOT RUN |
| server/services/materialAccess.js | source | shared/public | NOT RUN |
| server/services/readingCurriculum.js | source | shared/public | NOT RUN |
| server/services/readingInsights.js | source | shared/public | NOT RUN |
| server/services/readingProfileData.js | source | shared/public | NOT RUN |
| server/services/storageMigration.js | source | shared/public | NOT RUN |
| server/tests/auditAdminSettings.test.js | test | shared/public | NOT RUN |
| server/tests/auditExampleConfig.test.js | test | shared/public | NOT RUN |
| server/tests/auditInactiveAccounts.test.js | test | shared/public | NOT RUN |
| server/tests/auditMigration.test.js | test | shared/public | NOT RUN |
| server/tests/auditNotifications.test.js | test | shared/public | NOT RUN |
| server/tests/auditPlatform.test.js | test | shared/public | NOT RUN |
| server/tests/auditRoleMatrix.test.js | test | shared/public | NOT RUN |
| server/tests/businessQa.test.js | test | shared/public | NOT RUN |
| server/tests/e2e.staging.test.js | test | shared/public | NOT RUN |
| server/tests/filipinoPhonemes.test.js | test | shared/public | NOT RUN |
| server/tests/learningProgression.test.js | test | shared/public | NOT RUN |
| server/tests/libraryContracts.test.js | test | shared/public | NOT RUN |
| server/tests/localHttp.test.js | test | shared/public | NOT RUN |
| server/tests/parentReference.test.js | test | shared/public | NOT RUN |
| server/tests/qaRegression.test.js | test | shared/public | NOT RUN |
| server/tests/qaUtilities.test.js | test | shared/public | NOT RUN |
| server/tests/rls-policy.test.js | test | shared/public | NOT RUN |
| server/tests/sectionAssignmentQa.test.js | test | shared/public | NOT RUN |
| server/tests/security.test.js | test | shared/public | NOT RUN |
| server/tests/speechScoring.test.js | test | shared/public | NOT RUN |
| src/App.css | asset/configuration | shared/public | NOT RUN |
| src/App.tsx | source | shared/public | NOT RUN |
| src/assets/admin_design/admin-hero-background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/admin_design/books-stack.png | asset/configuration | shared/public | NOT RUN |
| src/assets/admin_design/owl-admin-mascot.png | asset/configuration | shared/public | NOT RUN |
| src/assets/admin_design/school-building.png | asset/configuration | shared/public | NOT RUN |
| src/assets/admin_design/sidebar-foliage-left.png | asset/configuration | shared/public | NOT RUN |
| src/assets/admin_design/sidebar-foliage-right.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Aking Unang Tagumpay.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Alamat ng Pagbasa.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Batang Mambabasa.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Bigkas Champion.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Boses ng Tagumpay.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Buwan ng Pagsisikap.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Dalubhasa sa Pagbasa.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Hindi Ako Susuko.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Kampeon sa Pagbasa.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Lakas ng Loob.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Lingguhang Bayani.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Malinaw Magsalita.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Masigasig na Mambabasa.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Matalinong Mag-aaral.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Patuloy na Umuunlad.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Tamang Bigkas.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Tuloy-Tuloy!.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Unang Araw.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Unang Bigkas.png | asset/configuration | shared/public | NOT RUN |
| src/assets/badges/Unang Hakbang.png | asset/configuration | shared/public | NOT RUN |
| src/assets/email.png | asset/configuration | shared/public | NOT RUN |
| src/assets/left.png | asset/configuration | shared/public | NOT RUN |
| src/assets/listen.png | asset/configuration | shared/public | NOT RUN |
| src/assets/Logo.jpg | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/current.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/hero.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/no activities.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/no enrolled child.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/parent-bg.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/reading.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/reading_champion.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/Sidebar background pattern.png | asset/configuration | shared/public | NOT RUN |
| src/assets/parent/streak.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-completed.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-completion-badge.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-current.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-header-books.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-journey-background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-learning-background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-locked-books.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-mascot-guide.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-module-path.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-path-background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-pencil-stars.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-phonics-blocks.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-reading-book.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/aralin/aralin-school-path-background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/backgrounds/sidebar-background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/backgrounds/student-hero-bg.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/backgrounds/word-practice-background-v2.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/backgrounds/word-practice-background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/characters/student-hero-character.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/decorations/deadline-card-decoration.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/decorations/lesson-progress-decoration.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/illustrations/achievement-illustration.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/illustrations/empty-state-illustration.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/illustrations/lesson-card-illustration.png | asset/configuration | shared/public | NOT RUN |
| src/assets/students/mascot/owl-mascot.png | asset/configuration | shared/public | NOT RUN |
| src/assets/teacher/Hero Left Purple Decorative Shape.png | asset/configuration | shared/public | NOT RUN |
| src/assets/teacher/Purple Sidebar Bottom Plants.png | asset/configuration | shared/public | NOT RUN |
| src/assets/teacher/Teacher Home Hero Banner Background.png | asset/configuration | shared/public | NOT RUN |
| src/assets/teacher/Teacher Illustration.png | asset/configuration | shared/public | NOT RUN |
| src/components/a11y/AccessibilityBar.tsx | source | shared/public | NOT RUN |
| src/components/a11y/AppIcon.tsx | source | shared/public | NOT RUN |
| src/components/a11y/IconLabel.tsx | source | shared/public | NOT RUN |
| src/components/a11y/ReadingGuideOverlay.tsx | source | shared/public | NOT RUN |
| src/components/a11y/SlowTTSButton.tsx | source | shared/public | NOT RUN |
| src/components/a11y/SoftGlowCursor.tsx | source | shared/public | NOT RUN |
| src/components/a11y/Toggle.tsx | source | shared/public | NOT RUN |
| src/components/a11y/TTSButton.tsx | source | shared/public | NOT RUN |
| src/components/a11y/TTSSpeedControl.tsx | source | shared/public | NOT RUN |
| src/components/AdminNavigationSearch.tsx | source | shared/public | NOT RUN |
| src/components/AppErrorBoundary.tsx | source | shared/public | NOT RUN |
| src/components/auth/AuthShell.tsx | source | shared/public | NOT RUN |
| src/components/BadgeUnlockToast.tsx | source | shared/public | NOT RUN |
| src/components/BrandedStatus.tsx | source | shared/public | NOT RUN |
| src/components/ChallengeWordsPractice.tsx | source | shared/public | NOT RUN |
| src/components/ConfettiOverlay.tsx | source | shared/public | NOT RUN |
| src/components/DashboardShell.tsx | source | shared/public | NOT RUN |
| src/components/NonsenseWordCheck.tsx | source | shared/public | NOT RUN |
| src/components/NotificationsBell.tsx | source | shared/public | NOT RUN |
| src/components/PdfDrillPractice.tsx | source | shared/public | NOT RUN |
| src/components/PdfReadingAssistant.tsx | source | shared/public | NOT RUN |
| src/components/PronunciationFeedback.tsx | source | shared/public | NOT RUN |
| src/components/ProtectedRoute.tsx | source | shared/public | NOT RUN |
| src/components/ReadingInsightsPanel.tsx | source | shared/public | NOT RUN |
| src/components/ScrollReveal.tsx | source | shared/public | NOT RUN |
| src/components/student/LearningActivityHeader.tsx | source | shared/public | NOT RUN |
| src/components/student/ReadingTarget.tsx | source | shared/public | NOT RUN |
| src/components/student/SpeechAction.tsx | source | shared/public | NOT RUN |
| src/components/student/WordMeaning.tsx | source | shared/public | NOT RUN |
| src/components/SyllableKaraokeText.tsx | source | shared/public | NOT RUN |
| src/components/teacher/PdfDrillReview.tsx | source | shared/public | NOT RUN |
| src/components/WordOfDayCard.tsx | source | shared/public | NOT RUN |
| src/index.css | asset/configuration | shared/public | NOT RUN |
| src/lib/a11y/AccessibilityContext.tsx | source | shared/public | NOT RUN |
| src/lib/analytics.ts | source | shared/public | NOT RUN |
| src/lib/api.ts | source | shared/public | NOT RUN |
| src/lib/auth/AuthContext.tsx | source | shared/public | NOT RUN |
| src/lib/auth/authEvents.ts | source | shared/public | NOT RUN |
| src/lib/auth/resolveRole.ts | source | shared/public | NOT RUN |
| src/lib/auth/savedProfiles.ts | source | shared/public | NOT RUN |
| src/lib/auth/softSignOut.ts | source | shared/public | NOT RUN |
| src/lib/badges.ts | source | shared/public | NOT RUN |
| src/lib/cardStyle.ts | source | shared/public | NOT RUN |
| src/lib/emptyImage.ts | source | shared/public | NOT RUN |
| src/lib/feedbackMessages.ts | source | shared/public | NOT RUN |
| src/lib/filipinoSyllables.ts | source | shared/public | NOT RUN |
| src/lib/openAccessUrl.ts | source | shared/public | NOT RUN |
| src/lib/speech-types.d.ts | source | shared/public | NOT RUN |
| src/lib/speech.ts | source | shared/public | NOT RUN |
| src/lib/supabaseClient.ts | source | shared/public | NOT RUN |
| src/lib/syllabify.ts | source | shared/public | NOT RUN |
| src/lib/ttsPlayer.ts | source | shared/public | NOT RUN |
| src/lib/ttsSettings.ts | source | shared/public | NOT RUN |
| src/lib/useNotifications.ts | source | shared/public | NOT RUN |
| src/lib/wordOfDay.ts | source | shared/public | NOT RUN |
| src/main.tsx | source | shared/public | NOT RUN |
| src/pages/admin/AdminLayout.tsx | source | admin | NOT RUN |
| src/pages/admin/Analytics.tsx | source | admin | NOT RUN |
| src/pages/admin/Archived.tsx | source | admin | NOT RUN |
| src/pages/admin/AuditLogs.tsx | source | admin | NOT RUN |
| src/pages/admin/Dashboard.tsx | source | admin | NOT RUN |
| src/pages/admin/Notifications.tsx | source | admin | NOT RUN |
| src/pages/admin/Operations.tsx | source | admin | NOT RUN |
| src/pages/admin/ParentMonitoringReference.tsx | source | admin | NOT RUN |
| src/pages/admin/RoleMonitoring.tsx | source | admin | NOT RUN |
| src/pages/admin/Sections.tsx | source | admin | NOT RUN |
| src/pages/admin/Settings.tsx | source | admin | NOT RUN |
| src/pages/admin/StudentMonitoringReference.tsx | source | admin | NOT RUN |
| src/pages/admin/SystemSettings.tsx | source | admin | NOT RUN |
| src/pages/admin/TeacherMonitoringReference.tsx | source | admin | NOT RUN |
| src/pages/admin/Teachers.tsx | source | admin | NOT RUN |
| src/pages/admin/Users.tsx | source | admin | NOT RUN |
| src/pages/auth/ForgotPassword.tsx | source | auth | NOT RUN |
| src/pages/auth/Login.tsx | source | auth | NOT RUN |
| src/pages/auth/ResendVerification.tsx | source | auth | NOT RUN |
| src/pages/auth/ResetPassword.tsx | source | auth | NOT RUN |
| src/pages/auth/SignUp.tsx | source | auth | NOT RUN |
| src/pages/auth/VerifyEmail.tsx | source | auth | NOT RUN |
| src/pages/Home.tsx | source | shared/public | NOT RUN |
| src/pages/Landing.tsx | source | shared/public | NOT RUN |
| src/pages/NotFound.tsx | source | shared/public | NOT RUN |
| src/pages/parent/app-settings-dark.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/app-settings-theme.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/app-settings.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/AppSettings.tsx | source | parent | NOT RUN |
| src/pages/parent/calendar-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/children-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/Dashboard.tsx | source | parent | NOT RUN |
| src/pages/parent/materials-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/Materials.tsx | source | parent | NOT RUN |
| src/pages/parent/messages-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/messages-replies.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/messages.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/Messages.tsx | source | parent | NOT RUN |
| src/pages/parent/MyChildren.tsx | source | parent | NOT RUN |
| src/pages/parent/notifications-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/Notifications.tsx | source | parent | NOT RUN |
| src/pages/parent/parent-dashboard-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/parent-profile.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/parent-progress-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/parent-theme.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/parentBadgeData.ts | source | parent | NOT RUN |
| src/pages/parent/ParentLayout.tsx | source | parent | NOT RUN |
| src/pages/parent/parentLearningData.ts | source | parent | NOT RUN |
| src/pages/parent/parentModulePagination.ts | source | parent | NOT RUN |
| src/pages/parent/parentProgressNavigation.ts | source | parent | NOT RUN |
| src/pages/parent/parentTranslations.ts | source | parent | NOT RUN |
| src/pages/parent/progress-reference-layout.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/ProgressReference.tsx | source | parent | NOT RUN |
| src/pages/parent/ProgressReport.tsx | source | parent | NOT RUN |
| src/pages/parent/Schedule.tsx | source | parent | NOT RUN |
| src/pages/parent/secondary-tabs-reference.css | asset/configuration | parent | NOT RUN |
| src/pages/parent/Settings.tsx | source | parent | NOT RUN |
| src/pages/PublicInfo.tsx | source | shared/public | NOT RUN |
| src/pages/student/Achievements.tsx | source | student | NOT RUN |
| src/pages/student/Assessment.tsx | source | student | NOT RUN |
| src/pages/student/Dashboard.tsx | source | student | NOT RUN |
| src/pages/student/Learn.tsx | source | student | NOT RUN |
| src/pages/student/Module.tsx | source | student | NOT RUN |
| src/pages/student/practice-reference.css | asset/configuration | student | NOT RUN |
| src/pages/student/Practice.tsx | source | student | NOT RUN |
| src/pages/student/Profile.tsx | source | student | NOT RUN |
| src/pages/student/StudentLayout.tsx | source | student | NOT RUN |
| src/pages/teacher/Dashboard.tsx | source | teacher | NOT RUN |
| src/pages/teacher/Lessons.tsx | source | teacher | NOT RUN |
| src/pages/teacher/LessonsHub.tsx | source | teacher | NOT RUN |
| src/pages/teacher/Messages.tsx | source | teacher | NOT RUN |
| src/pages/teacher/MyStudents.tsx | source | teacher | NOT RUN |
| src/pages/teacher/PdfReading.tsx | source | teacher | NOT RUN |
| src/pages/teacher/ProgressReports.tsx | source | teacher | NOT RUN |
| src/pages/teacher/Settings.tsx | source | teacher | NOT RUN |
| src/pages/teacher/TeacherLayout.tsx | source | teacher | NOT RUN |
| src/routes/AdminArea.tsx | source | shared/public | NOT RUN |
| src/routes/ParentArea.tsx | source | shared/public | NOT RUN |
| src/routes/PublicArea.tsx | source | shared/public | NOT RUN |
| src/routes/StudentArea.tsx | source | shared/public | NOT RUN |
| src/routes/TeacherArea.tsx | source | shared/public | NOT RUN |
| src/vite-env.d.ts | source | shared/public | NOT RUN |
| tests/adminNavigationSearch.test.mjs | test | shared/public | NOT RUN |
| tests/authQa.test.mjs | test | shared/public | NOT RUN |
| tests/helpers/load-ts.mjs | test | shared/public | NOT RUN |
| tests/mainReadonly.test.mjs | test | shared/public | NOT RUN |
| tests/parentBadgeData.test.mjs | test | shared/public | NOT RUN |
| tests/parentControlBindings.test.mjs | test | shared/public | NOT RUN |
| tests/parentModulePagination.test.mjs | test | shared/public | NOT RUN |
| tests/parentProgressNavigation.test.mjs | test | shared/public | NOT RUN |
| tests/qaEnvironment.test.mjs | test | shared/public | NOT RUN |
| tsconfig.app.json | asset/configuration | shared/public | NOT RUN |
| tsconfig.json | asset/configuration | shared/public | NOT RUN |
| tsconfig.node.json | asset/configuration | shared/public | NOT RUN |
| vite.config.ts | source | shared/public | NOT RUN |
