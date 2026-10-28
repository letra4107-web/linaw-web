-- MANUAL OPERATOR PROPOSAL ONLY. NOT executed by Codex or the verifier.
-- Creating a login/grants changes access configuration in the main project.
-- Use only after the project owner explicitly authorizes these access changes.
-- No migrations, application rows, Auth users or Storage objects are changed.
-- Do not rerun blindly if the role already exists; inspect its privileges first.
CREATE ROLE linawletra_safety_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
GRANT CONNECT ON DATABASE postgres TO linawletra_safety_reader;
GRANT USAGE ON SCHEMA public TO linawletra_safety_reader;
GRANT SELECT ON public.class_sections,public.section_students,public.teacher_student_links,
  public.children,public.teacher_profiles,public.users TO linawletra_safety_reader;

-- Set a unique strong password through the operator's password prompt/tool.
-- Example psql meta-command (operator's own private session, NOT SQL Editor):
-- \password linawletra_safety_reader
-- Do not put the completed password into this script, chat, Git or logs.
-- No RLS policy, role membership or BYPASSRLS permission is added here.
-- SELECT grants alone do not grant global row visibility under RLS.
