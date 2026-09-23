-- Correct the three named demonstration accounts' visible level and their
-- authoritative module placement. The match accepts either the full stored
-- school-email username or its local part, so it is safe across the web and
-- mobile enrollment formats.
WITH placements AS (
  SELECT c.id, c.parent_id, v.level
  FROM public.children c
  JOIN (VALUES
    ('lmoises', 'Beginner'),
    ('aebreo', 'Intermediate'),
    ('aebreo2', 'Advanced')
  ) AS v(login_name, level)
    ON split_part(lower(coalesce(c.username, '')), '@', 1) = v.login_name
)
UPDATE public.child_progress progress
SET level = placements.level
FROM placements
WHERE progress.child_id = placements.id;

WITH placements AS (
  SELECT c.id, c.parent_id, v.level
  FROM public.children c
  JOIN (VALUES ('lmoises', 'Beginner'), ('aebreo', 'Intermediate'), ('aebreo2', 'Advanced')) AS v(login_name, level)
    ON split_part(lower(coalesce(c.username, '')), '@', 1) = v.login_name
)
UPDATE public.student_reading_level_overrides override
SET override_level = placements.level,
    reason = 'Corrected demonstration account placement.'
FROM placements
WHERE override.student_id = placements.id
  AND override.revoked_at IS NULL
  AND placements.level <> 'Beginner';

WITH placements AS (
  SELECT c.id
  FROM public.children c
  WHERE split_part(lower(coalesce(c.username, '')), '@', 1) = 'lmoises'
)
UPDATE public.student_reading_level_overrides override
SET revoked_at = now(),
    revocation_reason = 'Corrected demonstration account placement.'
FROM placements
WHERE override.student_id = placements.id
  AND override.revoked_at IS NULL;

WITH placements AS (
  SELECT c.id, c.parent_id, v.level
  FROM public.children c
  JOIN (VALUES ('aebreo', 'Intermediate'), ('aebreo2', 'Advanced')) AS v(login_name, level)
    ON split_part(lower(coalesce(c.username, '')), '@', 1) = v.login_name
)
INSERT INTO public.student_reading_level_overrides (student_id, override_level, reason, created_by_auth_uid)
SELECT placements.id, placements.level, 'Corrected demonstration account placement.', placements.parent_id
FROM placements
WHERE NOT EXISTS (
  SELECT 1 FROM public.student_reading_level_overrides existing
  WHERE existing.student_id = placements.id AND existing.revoked_at IS NULL
);

NOTIFY pgrst, 'reload schema';
