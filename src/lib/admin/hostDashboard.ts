import {
  DASHBOARD_PATH,
  resolveAuthenticatedRoute,
  refreshSession,
} from "$lib/admin/auth";
import {
  defaultGlobalSettings,
  listHackathons,
  loadAdminSnapshot,
} from "$lib/admin/api";
import type {
  AdminSnapshot,
  HackathonRecord,
  HackathonSettings,
  HostAccount,
  TeamMonitor,
} from "$lib/admin/types";

export const emptySnapshot: AdminSnapshot = {
  monitors: [],
  reports: [],
  settings: {
    blockInternetAccess: false,
    blockNonEmptyWorkspace: false,
  },
  globalSettings: defaultGlobalSettings(),
  warnings: [],
  capabilities: {
    canReadTelemetry: false,
    canReadReports: false,
    canManagePlatform: false,
    isUsingFunctionFallback: false,
  },
};

export class AuthRedirectRequiredError extends Error {
  target: string;

  constructor(target: string) {
    super("Authentication flow requires a redirect before opening the dashboard.");
    this.name = "AuthRedirectRequiredError";
    this.target = target;
  }
}

export function isAuthRedirectRequiredError(value: unknown): value is AuthRedirectRequiredError {
  return value instanceof AuthRedirectRequiredError;
}

export interface HostWorkspaceData {
  currentUser: HostAccount;
  snapshot: AdminSnapshot;
  hackathons: HackathonRecord[];
  hackathonSource: "appwrite" | "local";
  hackathonWarning: string | null;
}

export interface HackathonWorkspaceData extends HostWorkspaceData {
  hackathon: HackathonRecord;
}

export async function loadHostWorkspace(): Promise<HostWorkspaceData | null> {
  const session = await refreshSession();
  if (!session.user) {
    return null;
  }

  const target = resolveAuthenticatedRoute(session.user);
  if (target !== DASHBOARD_PATH) {
    throw new AuthRedirectRequiredError(target);
  }

  const [hackathonResult, adminResult] = await Promise.all([
    listHackathons(session.user),
    loadAdminSnapshot(),
  ]);

  return {
    currentUser: session.user,
    snapshot: adminResult,
    hackathons: hackathonResult.hackathons,
    hackathonSource: hackathonResult.source,
    hackathonWarning: hackathonResult.warning,
  };
}

function normalizeHackathonKey(value?: string) {
  return String(value || "").trim().toLowerCase();
}

export function buildHackathonRoute(
  hackathonId: string,
  section: "" | "analytics" | "settings" = "",
) {
  const base = `/admin/dashboard/hackathons/${encodeURIComponent(
    String(hackathonId || "").trim(),
  )}`;
  return section ? `${base}/${section}` : base;
}

export function findHackathonRecord(
  hackathons: HackathonRecord[],
  hackathonId: string,
): HackathonRecord | null {
  const target = normalizeHackathonKey(hackathonId);
  return (
    hackathons.find(
      (entry) => normalizeHackathonKey(entry.hackathonId) === target,
    ) || null
  );
}

export function filterSnapshotByHackathon(
  snapshot: AdminSnapshot,
  hackathonId: string,
): AdminSnapshot {
  const target = normalizeHackathonKey(hackathonId);

  return {
    ...snapshot,
    monitors: snapshot.monitors.filter(
      (entry) => normalizeHackathonKey(entry.hackathonId) === target,
    ),
    reports: snapshot.reports.filter(
      (entry) => normalizeHackathonKey(entry.hackathonId) === target,
    ),
  };
}

export async function loadHackathonWorkspace(
  hackathonId: string,
): Promise<HackathonWorkspaceData | null> {
  const workspace = await loadHostWorkspace();
  if (!workspace) {
    return null;
  }

  const hackathon = findHackathonRecord(workspace.hackathons, hackathonId);
  if (!hackathon) {
    throw new Error("That hackathon could not be found in your workspace.");
  }

  return {
    ...workspace,
    hackathon,
    snapshot: filterSnapshotByHackathon(
      workspace.snapshot,
      hackathon.hackathonId,
    ),
  };
}

export function cloneHackathon(record: HackathonRecord): HackathonRecord {
  return {
    ...record,
    settings: {
      ...record.settings,
    },
  };
}

export function cloneHackathonSettings(
  settings: HackathonSettings,
): HackathonSettings {
  return {
    ...settings,
  };
}

export function statusTone(status: "online" | "offline") {
  return status === "online"
    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.3)] dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
    : "border-zinc-400/50 bg-zinc-400/10 text-zinc-600 dark:border-zinc-500/30 dark:bg-zinc-600/10 dark:text-zinc-300";
}

export function riskTone(level: TeamMonitor["risk"]["level"]) {
  if (level === "HIGH") {
    return "border-rose-500/50 bg-rose-500/10 text-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300";
  }

  if (level === "MEDIUM") {
    return "border-amber-500/50 bg-amber-500/10 text-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)] dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300";
  }

  return "border-emerald-400/50 bg-emerald-400/10 text-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.2)] dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";
}

export function platformAccessLabel(snapshot: AdminSnapshot) {
  if (snapshot.capabilities.canManagePlatform) {
    return "Full host settings access";
  }

  if (snapshot.capabilities.canReadTelemetry || snapshot.capabilities.canReadReports) {
    return "Read-only monitoring access";
  }

  return "Hackathon workspace only";
}
