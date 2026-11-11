-- Optional birthday (7+ when supplied), teacher calendar, atomic parent notices.
BEGIN;
CREATE OR REPLACE FUNCTION public.update_parent_child_profile(p_parent_id uuid,p_child_id uuid,p_name text,p_grade integer,p_birth_date date,p_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.children%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF p_name IS NULL OR p_grade IS NULL OR length(btrim(p_name)) NOT BETWEEN 2 AND 100 OR p_grade NOT BETWEEN 1 AND 6 OR (p_birth_date IS NOT NULL AND (p_birth_date<'1900-01-01'::date OR p_birth_date>(timezone('Asia/Manila',now())::date-interval '7 years')::date)) THEN RAISE EXCEPTION 'Child must be 7 years or older; birthday is optional' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.children WHERE id=p_child_id AND parent_id::text=p_parent_id::text FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Owned child not found' USING ERRCODE='P0002'; END IF;
 IF c.profile_revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Changed child profile' USING ERRCODE='PT409'; END IF;
 IF (c.name,c.grade_level,c.date_of_birth) IS NOT DISTINCT FROM (btrim(p_name),p_grade,p_birth_date) THEN RETURN to_jsonb(c); END IF;
 UPDATE public.children SET name=btrim(p_name),grade_level=p_grade,date_of_birth=p_birth_date,profile_revision=profile_revision+1 WHERE id=c.id RETURNING * INTO c;
 UPDATE public.users SET name=c.name WHERE id::text=c.auth_uid::text;
 RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.update_parent_child_profile(uuid,uuid,text,integer,date,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_parent_child_profile(uuid,uuid,text,integer,date,integer) TO service_role;

ALTER TABLE public.scheduled_activities ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.teacher_calendar_access(p_child uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.users u JOIN public.teacher_student_links l ON l.teacher_id=u.id WHERE u.id=auth.uid() AND u.role='teacher' AND u.email_verified IS TRUE AND coalesce(u.is_active,true) AND coalesce(u.account_status,'active') NOT IN('disabled','archived') AND l.student_id=p_child)
$$;
REVOKE ALL ON FUNCTION public.teacher_calendar_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.teacher_calendar_access(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_teacher_calendar()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND role='teacher' AND email_verified IS TRUE AND coalesce(is_active,true) AND coalesce(account_status,'active') NOT IN('disabled','archived')) THEN RAISE EXCEPTION 'Teacher account required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'grade_level',c.grade_level) ORDER BY c.name,c.id) FROM public.children c JOIN public.teacher_student_links l ON l.student_id=c.id WHERE l.teacher_id=auth.uid()),'[]'::jsonb),
 'activities',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.scheduled_date,a.start_time,a.id) FROM public.scheduled_activities a JOIN public.teacher_student_links l ON l.student_id=a.child_id WHERE l.teacher_id=auth.uid()),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.save_teacher_calendar(p_id uuid,p_child uuid,p_title text,p_date date,p_start time,p_end time,p_type text,p_description text,p_revision integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.scheduled_activities%ROWTYPE;
BEGIN
 IF NOT public.teacher_calendar_access(p_child) THEN RAISE EXCEPTION 'Linked student required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 150 OR p_date IS NULL OR p_date<'1900-01-01'::date OR p_date>'2200-12-31'::date OR p_type IS NULL OR p_type NOT IN('reading_lesson','practice','reminder','appointment') OR length(coalesce(p_description,''))>1000 OR (p_end IS NOT NULL AND (p_start IS NULL OR p_end<=p_start)) THEN RAISE EXCEPTION 'Invalid schedule' USING ERRCODE='22023'; END IF;
 -- Serialize duplicate submissions for the same client-generated identity.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT * INTO a FROM public.scheduled_activities WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF a.created_by<>'teacher' OR a.created_by_auth_uid IS DISTINCT FROM auth.uid() OR a.child_id<>p_child THEN RAISE EXCEPTION 'Owned teacher schedule required' USING ERRCODE='42501'; END IF;
  IF (a.title,a.scheduled_date,a.start_time,a.end_time,a.activity_type,coalesce(a.description,'')) IS NOT DISTINCT FROM (btrim(p_title),p_date,p_start,p_end,p_type,coalesce(nullif(btrim(p_description),''),'')) THEN RETURN to_jsonb(a); END IF;
  IF p_revision IS NULL OR a.revision<>p_revision THEN RAISE EXCEPTION 'Changed schedule' USING ERRCODE='PT409'; END IF;
  UPDATE public.scheduled_activities SET title=btrim(p_title),scheduled_date=p_date,start_time=p_start,end_time=p_end,activity_type=p_type,description=nullif(btrim(p_description),''),revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO a;
 ELSE
  IF p_revision IS NOT NULL THEN RAISE EXCEPTION 'Schedule no longer exists' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.scheduled_activities(id,child_id,created_by,created_by_auth_uid,title,scheduled_date,start_time,end_time,activity_type,description)
  VALUES(p_id,p_child,'teacher',auth.uid(),btrim(p_title),p_date,p_start,p_end,p_type,nullif(btrim(p_description),'')) RETURNING * INTO a;
 END IF;
 RETURN to_jsonb(a);
END $$;
CREATE OR REPLACE FUNCTION public.delete_teacher_calendar(p_id uuid,p_revision integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.scheduled_activities%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.scheduled_activities WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 IF a.created_by<>'teacher' OR a.created_by_auth_uid IS DISTINCT FROM auth.uid() OR NOT public.teacher_calendar_access(a.child_id) THEN RAISE EXCEPTION 'Owned teacher schedule required' USING ERRCODE='42501'; END IF;
 IF p_revision IS NULL OR a.revision<>p_revision THEN RAISE EXCEPTION 'Changed schedule' USING ERRCODE='PT409'; END IF;
 DELETE FROM public.scheduled_activities WHERE id=p_id;
END $$;
CREATE OR REPLACE FUNCTION public.notify_teacher_calendar_parent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.scheduled_activities%ROWTYPE; p uuid; child_name text; message_text text; action_text text;
BEGIN
 IF TG_OP='DELETE' THEN a:=OLD; ELSE a:=NEW; END IF;
 IF a.created_by<>'teacher' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='UPDATE' THEN IF (NEW.title,NEW.scheduled_date,NEW.start_time,NEW.end_time,NEW.activity_type,NEW.description,NEW.status) IS NOT DISTINCT FROM (OLD.title,OLD.scheduled_date,OLD.start_time,OLD.end_time,OLD.activity_type,OLD.description,OLD.status) THEN RETURN NEW; END IF; END IF;
 SELECT parent_id::uuid,name INTO p,child_name FROM public.children WHERE id=a.child_id;
 action_text:=CASE TG_OP WHEN 'INSERT' THEN 'Bagong iskedyul mula sa guro' WHEN 'DELETE' THEN 'Kinanselang iskedyul mula sa guro' ELSE 'Binagong iskedyul mula sa guro' END;
 message_text:=coalesce(child_name,'Anak mo')||': '||a.title||' — '||to_char(a.scheduled_date,'Mon DD, YYYY')||CASE WHEN a.start_time IS NOT NULL THEN ' '||to_char(a.start_time,'HH12:MI AM') ELSE '' END||' (oras sa Pilipinas). Tingnan ang Kalendaryo para sa detalye.';
 IF p IS NOT NULL THEN INSERT INTO public.notifications(user_id,parent_id,title,body,message,type,is_read,read) VALUES(p,p::text,action_text,message_text,message_text,'scheduled_activity',false,false); END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER IF EXISTS teacher_calendar_parent_notice ON public.scheduled_activities;
CREATE TRIGGER teacher_calendar_parent_notice AFTER INSERT OR UPDATE OR DELETE ON public.scheduled_activities FOR EACH ROW EXECUTE FUNCTION public.notify_teacher_calendar_parent();
REVOKE ALL ON FUNCTION public.notify_teacher_calendar_parent() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_teacher_calendar(),public.save_teacher_calendar(uuid,uuid,text,date,time,time,text,text,integer),public.delete_teacher_calendar(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_calendar(),public.save_teacher_calendar(uuid,uuid,text,date,time,time,text,text,integer),public.delete_teacher_calendar(uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
