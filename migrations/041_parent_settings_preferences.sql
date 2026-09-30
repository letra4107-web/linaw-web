-- Parent dashboard settings used by the account-settings screen.
ALTER TABLE public.parents_settings
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "progress":{"inApp":true,"email":true,"sms":false},
    "teacher":{"inApp":true,"email":true,"sms":false},
    "schedule":{"inApp":true,"email":true,"sms":false},
    "announcements":{"inApp":true,"email":true,"sms":false}
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'fil',
  ADD COLUMN IF NOT EXISTS two_factor_preference BOOLEAN NOT NULL DEFAULT false;

UPDATE public.parents_settings
SET notification_preferences = COALESCE(notification_preferences, '{
  "progress":{"inApp":true,"email":true,"sms":false},
  "teacher":{"inApp":true,"email":true,"sms":false},
  "schedule":{"inApp":true,"email":true,"sms":false},
  "announcements":{"inApp":true,"email":true,"sms":false}
}'::jsonb);

NOTIFY pgrst, 'reload schema';
