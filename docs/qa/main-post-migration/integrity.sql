-- READ ONLY aggregate checks. The verifier executes this file ONLY when all
-- six tables have proven unfiltered SELECT under existing policies, without
-- superuser/BYPASSRLS/table ownership. Filtered joins can produce false orphans.
SELECT 'duplicate_section_memberships' AS check_name,count(*)::int AS violations FROM
  (SELECT section_id,student_id FROM public.section_students GROUP BY 1,2 HAVING count(*)>1) duplicates
UNION ALL SELECT 'sections_over_capacity',count(*)::int FROM
  (SELECT s.id FROM public.class_sections s LEFT JOIN public.section_students ss ON ss.section_id=s.id
   GROUP BY s.id,s.capacity HAVING count(ss.student_id)>s.capacity) overfilled
UNION ALL SELECT 'invalid_section_bounds',count(*)::int FROM public.class_sections
  WHERE capacity IS NULL OR grade_level IS NULL OR capacity NOT BETWEEN 1 AND 35 OR grade_level NOT BETWEEN 1 AND 6
UNION ALL SELECT 'membership_missing_section',count(*)::int FROM public.section_students ss
  LEFT JOIN public.class_sections s ON s.id=ss.section_id WHERE s.id IS NULL
UNION ALL SELECT 'membership_missing_child',count(*)::int FROM public.section_students ss
  LEFT JOIN public.children c ON c.id=ss.student_id WHERE c.id IS NULL
UNION ALL SELECT 'membership_grade_mismatch',count(*)::int FROM public.section_students ss
  JOIN public.class_sections s ON s.id=ss.section_id JOIN public.children c ON c.id=ss.student_id
  WHERE c.grade_level IS DISTINCT FROM s.grade_level
UNION ALL SELECT 'membership_missing_adviser_roster_link',count(*)::int FROM public.section_students ss
  JOIN public.class_sections s ON s.id=ss.section_id LEFT JOIN public.teacher_student_links l
  ON l.teacher_id=s.adviser_id AND l.student_id=ss.student_id WHERE l.id IS NULL
UNION ALL SELECT 'duplicate_teacher_roster_links',count(*)::int FROM
  (SELECT teacher_id,student_id FROM public.teacher_student_links GROUP BY 1,2 HAVING count(*)>1) duplicate_links
UNION ALL SELECT 'roster_missing_child',count(*)::int FROM public.teacher_student_links l
  LEFT JOIN public.children c ON c.id=l.student_id WHERE c.id IS NULL
UNION ALL SELECT 'roster_missing_teacher_profile',count(*)::int FROM public.teacher_student_links l
  LEFT JOIN public.teacher_profiles tp ON tp.user_id=l.teacher_id WHERE tp.user_id IS NULL
UNION ALL SELECT 'roster_outside_teacher_grades',count(*)::int FROM public.teacher_student_links l
  JOIN public.children c ON c.id=l.student_id JOIN public.teacher_profiles tp ON tp.user_id=l.teacher_id
  WHERE c.grade_level IS NULL OR NOT COALESCE(c.grade_level=ANY(tp.grade_levels),false)
UNION ALL SELECT 'section_adviser_missing_teacher_profile',count(*)::int FROM public.class_sections s
  LEFT JOIN public.teacher_profiles tp ON tp.user_id=s.adviser_id WHERE tp.user_id IS NULL
UNION ALL SELECT 'section_adviser_wrong_role',count(*)::int FROM public.class_sections s
  LEFT JOIN public.users u ON u.id::text=s.adviser_id::text WHERE u.id IS NULL OR u.role IS DISTINCT FROM 'teacher'
UNION ALL SELECT 'roster_teacher_wrong_role',count(*)::int FROM public.teacher_student_links l
  LEFT JOIN public.users u ON u.id::text=l.teacher_id::text WHERE u.id IS NULL OR u.role IS DISTINCT FROM 'teacher'
ORDER BY check_name;
