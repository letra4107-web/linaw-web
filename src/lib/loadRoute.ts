const RECOVERY_KEY = 'linawletra.route-recovery.v1';
const RECOVERY_WINDOW_MS = 60_000;

function recoverRouteDownload(error: unknown): boolean {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (!/failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i.test(message)) return false;
  if (typeof window === 'undefined' || window.navigator.onLine === false) return false;

  try {
    const lastRecovery = Number(window.sessionStorage.getItem(RECOVERY_KEY));
    const now = Date.now();
    if (lastRecovery && now - lastRecovery < RECOVERY_WINDOW_MS) return false;
    // A tab opened before a deployment can still request the old hashed files.
    // Reload the current dashboard URL once to fetch the current entry bundle;
    // Supabase's persisted session keeps the user signed in. The timestamp
    // survives that reload so an unavailable server cannot create a loop.
    window.sessionStorage.setItem(RECOVERY_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    // Without tab storage we cannot safely bound automatic reloads.
    return false;
  }
}

export async function loadRoute<T>(importRoute: () => Promise<T>): Promise<T> {
  try {
    return await importRoute();
  } catch (error) {
    if (recoverRouteDownload(error)) {
      // Keep Suspense's loading screen visible until the navigation completes.
      return new Promise<T>(() => {});
    }
    throw error;
  }
}
