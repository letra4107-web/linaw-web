import logo from '../assets/Logo.jpg';

interface BrandedStatusProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function BrandedStatus({
  message = 'Inihahanda ang LinawLetra...',
  error,
  onRetry,
}: BrandedStatusProps) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-card">
        <img src={logo} alt="LinawLetra" className="mx-auto h-20 w-auto rounded-xl" />
        {error ? (
          <>
            <h1 className="mt-5 text-2xl">Hindi muna makakonekta</h1>
            <p role="alert" className="mt-2 text-base text-[var(--color-text-muted)]">
              {offline ? 'Mukhang offline ang device. Suriin ang internet connection at subukan muli.' : error}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 rounded-full bg-[var(--color-primary)] px-6 py-3 font-semibold text-white shadow-card hover:bg-[var(--color-primary-hover)]"
              >
                Subukan muli
              </button>
            )}
          </>
        ) : (
          <div role="status" aria-live="polite" className="mt-5">
            <span
              aria-hidden="true"
              className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary-soft)] border-t-[var(--color-primary)]"
            />
            <p className="mt-4 font-medium text-[var(--color-text-muted)]">{message}</p>
          </div>
        )}
      </div>
    </main>
  );
}
