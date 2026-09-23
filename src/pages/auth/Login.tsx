import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { dashboardPathForRole, resolveRole } from '../../lib/auth/resolveRole';
import {
  getSavedProfiles,
  removeSavedProfile,
  updateSavedProfileToken,
  type SavedAuthProfile,
} from '../../lib/auth/savedProfiles';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  IconInput,
  PasswordInput,
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import { IconLabel } from '../../components/a11y/IconLabel';
import { trackEvent } from '../../lib/analytics';

interface FieldErrors {
  email?: string;
  password?: string;
}

const ROLE_LABEL: Record<SavedAuthProfile['role'], string> = {
  admin: 'Admin',
  parent: 'Magulang',
  student: 'Mag-aaral',
  teacher: 'Guro',
};

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '🙂';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function ProfilePicker({
  profiles,
  onPick,
  onRemove,
  onUseOtherAccount,
  busyUserId,
}: {
  profiles: SavedAuthProfile[];
  onPick: (profile: SavedAuthProfile) => void;
  onRemove: (userId: string) => void;
  onUseOtherAccount: () => void;
  busyUserId: string | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-center justify-center gap-1.5 text-center text-sm font-medium text-[var(--color-text-muted)]">
        <span aria-hidden="true">⚡</span> Tap lang ang larawan mo — walang kailangang password
      </p>

      <div className="flex flex-col gap-3">
        {profiles.map((p, i) => {
          const brand = CARD_COLORS[i % CARD_COLORS.length];
          const busy = busyUserId === p.userId;
          return (
            <div key={p.userId} className="group relative">
              <button
                type="button"
                onClick={() => onPick(p)}
                disabled={busyUserId !== null}
                className="flex w-full items-center gap-4 rounded-2xl border p-4 pr-14 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-[0.98] disabled:translate-y-0 disabled:opacity-60"
                style={cardStyle(brand, 10, 30)}
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-md"
                  style={{ backgroundColor: `color-mix(in srgb, var(${brand}) 85%, black)` }}
                >
                  {busy ? <ButtonSpinner /> : initialsFor(p.displayName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold">{p.displayName}</span>
                    <span
                      className="shrink-0 rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold"
                      style={{ color: `color-mix(in srgb, var(${brand}) 80%, black)` }}
                    >
                      {ROLE_LABEL[p.role]}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-[var(--color-text-muted)]">{p.email}</span>
                </span>
                <span className="shrink-0 text-xl text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  →
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(p.userId)}
                title="Hindi ikaw ito? Alisin sa listahan"
                aria-label="Hindi ikaw ito? Alisin sa listahan"
                className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onUseOtherAccount}
        className="self-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        <IconLabel icon="🔑" label="Gumamit ng ibang account" />
      </button>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<SavedAuthProfile[]>(() => getSavedProfiles());
  // An old saved refresh token must never hide the normal password login.
  const [showForm, setShowForm] = useState(true);
  const [reloginBusyId, setReloginBusyId] = useState<string | null>(null);

  const validate = (cleanEmail: string): FieldErrors => {
    const errors: FieldErrors = {};
    if (!cleanEmail) errors.email = 'Kailangan ang email.';
    else if (!isValidEmail(cleanEmail)) errors.email = 'Hindi valid ang email.';
    if (!password) errors.password = 'Kailangan ang password.';
    return errors;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const errors = validate(cleanEmail);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('Hindi makumpleto ang pag-login.');

      const identity = await resolveRole(data.user);
      // Student accounts are created and managed by a parent. They do not need
      // an email verification code before they can begin reading practice.
      // Parents, teachers, and admins still require email verification.
      if (!data.user.email_confirmed_at && identity?.role !== 'student') {
        navigate('/verify-email', { state: { email: cleanEmail } });
        return;
      }

      if (identity) trackEvent('login_success', { role: identity.role });
      navigate(identity ? dashboardPathForRole(identity.role) : '/verify-email', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi matagumpay ang pag-login.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelogin = async (profile: SavedAuthProfile) => {
    setError(null);
    setReloginBusyId(profile.userId);
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: profile.refreshToken,
      });
      if (refreshError || !data.session || !data.user) throw refreshError ?? new Error('Kailangan mo nang mag-login gamit ang password.');

      updateSavedProfileToken(profile.userId, data.session.refresh_token);

      const identity = await resolveRole(data.user);
      // A valid refresh-token exchange is already proof that this is a saved,
      // authenticated device session. Use the saved role as a safe fallback
      // if the profile lookup is temporarily unavailable, rather than sending
      // a one-tap user to the email-code screen.
      const role = identity?.role ?? profile.role;
      trackEvent('login_success', { role, saved_profile: true });
      navigate(dashboardPathForRole(role), { replace: true });
    } catch {
      // A dead/expired refresh token can't be used again -- drop it from the
      // picker and let the student fall back to the password form.
      removeSavedProfile(profile.userId);
      setSavedProfiles(getSavedProfiles());
      setError('Nag-expire na ang saved na session. Mag-login gamit ang password.');
      setShowForm(true);
    } finally {
      setReloginBusyId(null);
    }
  };

  const handleRemoveProfile = (userId: string) => {
    removeSavedProfile(userId);
    const next = getSavedProfiles();
    setSavedProfiles(next);
    if (next.length === 0) setShowForm(true);
  };

  return (
    <AuthShell
      title="Maligayang pagbabalik"
      subtitle="Mag-login para ipagpatuloy ang iyong paglalakbay sa pagbasa."
      cardColorVar="--color-brand-lavender"
      footer={
        <>
          Wala pang account?{' '}
          <Link to="/signup" className="font-medium text-[var(--color-primary)] underline">
            Mag-sign up
          </Link>
        </>
      }
    >
      {savedProfiles.length > 0 && !showForm && (
        <ProfilePicker
          profiles={savedProfiles}
          onPick={handleRelogin}
          onRemove={handleRemoveProfile}
          onUseOtherAccount={() => setShowForm(true)}
          busyUserId={reloginBusyId}
        />
      )}
      {error && !showForm && (
        <div className="mb-2">
          <FieldError message={error} />
        </div>
      )}

      {showForm && (
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {savedProfiles.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex min-h-8 items-center self-start text-sm font-bold text-[var(--color-primary)]"
          >
            ← Bumalik sa saved na profile
          </button>
        )}
        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-extrabold tracking-[0.06em] uppercase">
            Email
          </label>
          <IconInput
            id="email"
            icon="✉️"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            invalid={!!fieldErrors.email}
            className="min-h-15 rounded-[14px] border-[var(--color-brand-lavender)]/25 bg-[#FAF8F3] text-base focus-visible:bg-[#F2FBF4]"
          />
          {fieldErrors.email && (
            <div className="mt-2">
              <FieldError message={fieldErrors.email} />
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-extrabold tracking-[0.06em] uppercase">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm font-bold text-[var(--color-primary)]">
              Nakalimutan?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={!!fieldErrors.password}
            className="min-h-15 rounded-[14px] border-[var(--color-brand-lavender)]/25 bg-[#FAF8F3] text-base focus-visible:bg-[#F2FBF4]"
          />
          {fieldErrors.password && (
            <div className="mt-2">
              <FieldError message={fieldErrors.password} />
            </div>
          )}
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={`${primaryButtonClass} min-h-14 rounded-3xl py-3.5 text-[17px]`}>
          {submitting && <ButtonSpinner />}
          {submitting ? 'Naglo-login...' : 'Mag-login'}
        </button>
      </form>
      )}
    </AuthShell>
  );
}
