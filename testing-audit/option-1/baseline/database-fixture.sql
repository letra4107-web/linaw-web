-- Synthetic disposable-only fixture; never use as a shared schema migration.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text) $$;
CREATE EXTENSION pgcrypto;
CREATE TABLE public.children(id uuid PRIMARY KEY,auth_uid uuid,parent_id uuid);
CREATE TABLE public.words(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.child_progress(child_id uuid PRIMARY KEY REFERENCES public.children(id),xp int DEFAULT 0,
  level text DEFAULT 'Beginner',streak int DEFAULT 0,longest_streak int DEFAULT 0,last_practice_date date,
  completed_words text[] DEFAULT '{}',word_count int DEFAULT 0,total_attempts int DEFAULT 0,
  achievements jsonb DEFAULT '[]',badges jsonb DEFAULT '[]',baseline_accuracy numeric,accuracy_sum int DEFAULT 0,
  activities_completed int DEFAULT 0,updated_at timestamptz DEFAULT now());
ALTER TABLE public.child_progress ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pronunciation_practice_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid REFERENCES children(id),
  word text,spoken_text text,accuracy_percentage numeric,is_correct boolean,duration_seconds int,practice_source text,created_at timestamptz DEFAULT now());
CREATE TABLE public.word_of_day_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),child_id uuid REFERENCES children(id),word text,date date,
  attempts int DEFAULT 0,accuracy int,correct boolean,xp_awarded int DEFAULT 0,completed_at timestamptz,UNIQUE(child_id,date));
CREATE TABLE public.lesson_progress(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid,lesson_id uuid,status text);
-- Existing shared tables often have broad grants; verify the proposal revokes writes.
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
SELECT set_config('request.jwt.claim.role','service_role',false);
