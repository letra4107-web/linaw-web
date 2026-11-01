# Saved profile photos

The saved-login card previously stored only the account name, role, email and refresh ticket and always rendered initials. It now saves an optional `avatarUrl` and renders the uploaded photo in the one-tap picker.

Before clearing local authentication, logout reads the current photo from the same source as the role dashboard: `parents.avatar_url` by `auth_uid`, `teacher_profiles.avatar_url` by `user_id`, or `users.avatar_url` by `id` for the other roles. This optional read has a 1.5-second abort deadline. A failed read retains the previous photo; an explicit empty photo clears it. The current refresh ticket is read after the photo request so token rotation during the request is preserved.

Existing saved accounts remain valid without a photo. Saving a profile without new photo metadata and rotating its login ticket both preserve an existing image. Only HTTP/HTTPS image addresses are accepted for display. If the image fails to load, the card returns to initials without removing the saved account.

Parent logout also supplies its already loaded photo as a fallback. No database migration is needed. Existing logged-out cards that were saved without a photo need one successful login followed by logout to capture it. An account with no uploaded photo still displays initials.

Verification includes the normal frontend unit suite plus `tests/savedProfileAvatar.test.mjs`, logout ticket tests, and the actual Parent/Teacher login picker in a browser at desktop/mobile widths. Browser fixtures substitute Auth/profile responses and do not change live accounts. Local browser evidence is in `.qa/saved-photo-review/`.
