import { browser } from "$app/environment";
import type {
  AdminSnapshot,
  HackathonRecord,
  HostAccount,
  GlobalSettings,
} from "$lib/admin/types";
import {
  emptySnapshot,
  isAuthRedirectRequiredError,
  type HostWorkspaceData,
} from "$lib/admin/hostDashboard";
import { loadHostWorkspace } from "$lib/admin/hostDashboard";

const STALE_THRESHOLD_MS = 30_000;
const POLL_INTERVAL_MS = 20_000;

interface AdminStoreState {
  data: HostWorkspaceData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

let state = $state<AdminStoreState>({
  data: null,
  loading: false,
  refreshing: false,
  error: null,
  lastFetchedAt: null,
});

let pollIntervalId: ReturnType<typeof setInterval> | null = null;
let fetchInFlight: Promise<HostWorkspaceData | null> | null = null;

function isCacheFresh(): boolean {
  return (
    state.data !== null &&
    state.lastFetchedAt !== null &&
    Date.now() - state.lastFetchedAt < STALE_THRESHOLD_MS
  );
}

function isCacheAvailable(): boolean {
  return state.data !== null && state.lastFetchedAt !== null;
}

async function fetchWorkspace(): Promise<HostWorkspaceData | null> {
  const data = await loadHostWorkspace();
  return data;
}

async function load(options: { force?: boolean; silent?: boolean } = {}): Promise<void> {
  if (!browser) {
    return;
  }

  // If data is fresh and this isn't a force refresh, skip
  if (!options.force && isCacheFresh() && !state.loading) {
    return;
  }

  // If a fetch is already in flight, wait for it instead of starting another
  if (fetchInFlight) {
    try {
      await fetchInFlight;
    } catch {
      // Handled by the original caller
    }
    return;
  }

  // Determine loading state: full loading vs background refreshing
  if (isCacheAvailable() || options.silent) {
    state.refreshing = true;
  } else {
    state.loading = true;
  }

  state.error = null;

  try {
    fetchInFlight = fetchWorkspace();
    const data = await fetchInFlight;

    if (data === null) {
      // User is not authenticated — don't cache, leave existing data for redirect handling
      state.data = null;
      state.lastFetchedAt = null;
    } else {
      state.data = data;
      state.lastFetchedAt = Date.now();
    }
  } catch (err) {
    // Propagate auth redirects — pages need to handle these
    if (isAuthRedirectRequiredError(err)) {
      throw err;
    }

    state.error =
      err instanceof Error ? err.message : "Unable to load dashboard data.";
  } finally {
    state.loading = false;
    state.refreshing = false;
    fetchInFlight = null;
  }
}

/**
 * Ensure data is available. Serves cached data immediately if fresh,
 * otherwise fetches from the API. Safe to call from every page's onMount.
 */
async function ensure(): Promise<void> {
  return load({ force: false, silent: isCacheAvailable() });
}

/**
 * Force a fresh fetch, bypassing the cache entirely.
 * Used for the manual "Refresh" button.
 */
async function forceRefresh(): Promise<void> {
  return load({ force: true, silent: true });
}

/**
 * Start the background polling interval. Should be called once
 * from the dashboard layout's onMount.
 */
function startPolling(): void {
  if (!browser) {
    return;
  }

  stopPolling();

  pollIntervalId = setInterval(() => {
    void load({ force: true, silent: true });
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the background polling interval. Should be called
 * from the dashboard layout's onDestroy.
 */
function stopPolling(): void {
  if (pollIntervalId !== null) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

/**
 * Invalidate the cache, forcing the next ensure() call to refetch.
 * Useful after mutations (creating hackathons, updating settings).
 */
function invalidate(): void {
  state.lastFetchedAt = null;
}

// Convenience derived getters for pages
function getCurrentUser(): HostAccount | null {
  return state.data?.currentUser ?? null;
}

function getSnapshot(): AdminSnapshot {
  return state.data?.snapshot ?? emptySnapshot;
}

function getHackathons(): HackathonRecord[] {
  return state.data?.hackathons ?? [];
}

function getHackathonSource(): "appwrite" | "local" {
  return state.data?.hackathonSource ?? "local";
}

function getHackathonWarning(): string | null {
  return state.data?.hackathonWarning ?? null;
}

function getGlobalSettings(): GlobalSettings {
  return state.data?.snapshot.globalSettings ?? emptySnapshot.globalSettings;
}

export const adminStore = {
  get state() {
    return state;
  },
  get loading() {
    return state.loading;
  },
  get refreshing() {
    return state.refreshing;
  },
  get error() {
    return state.error;
  },
  get data() {
    return state.data;
  },
  get currentUser() {
    return getCurrentUser();
  },
  get snapshot() {
    return getSnapshot();
  },
  get hackathons() {
    return getHackathons();
  },
  get hackathonSource() {
    return getHackathonSource();
  },
  get hackathonWarning() {
    return getHackathonWarning();
  },
  get globalSettings() {
    return getGlobalSettings();
  },
  ensure,
  forceRefresh,
  startPolling,
  stopPolling,
  invalidate,
};
