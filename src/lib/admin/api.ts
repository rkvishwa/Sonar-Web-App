import { browser } from "$app/environment";
import {
  Databases,
  ExecutionMethod,
  Functions,
  ID,
  Permission,
  Query,
  Role,
} from "appwrite";
import { account, client, isAppwriteConfigured } from "$lib/admin/auth";
import {
  buildReportData,
  computeRiskScore,
  parseSyncData,
} from "$lib/admin/analytics";
import type {
  AdminSnapshot,
  GlobalSettings,
  HackathonDraft,
  HackathonRecord,
  HackathonSettings,
  HostAccount,
  PlatformSettings,
  SessionRecord,
  StoredReport,
  TeamMonitor,
} from "$lib/admin/types";

const databases = isAppwriteConfigured ? new Databases(client) : null;
const functions = isAppwriteConfigured ? new Functions(client) : null;

const DB_ID = String(import.meta.env.VITE_APPWRITE_DB_NAME || "devwatch_db").trim();
const COL_SESSIONS = String(
  import.meta.env.VITE_APPWRITE_COLLECTION_SESSIONS || "sessions",
).trim();
const COL_ACTIVITY_LOGS = String(
  import.meta.env.VITE_APPWRITE_COLLECTION_ACTIVITY_LOGS || "activityLogs",
).trim();
const COL_REPORTS = String(
  import.meta.env.VITE_APPWRITE_COLLECTION_REPORTS || "reports",
).trim();
const COL_SETTINGS = String(
  import.meta.env.VITE_APPWRITE_COLLECTION_SETTINGS || "settings",
).trim();
const COL_HACKATHONS = String(
  import.meta.env.VITE_APPWRITE_COLLECTION_HACKATHONS || "",
).trim();
const SETTINGS_FUNCTION_ID = String(
  import.meta.env.VITE_APPWRITE_FUNCTION_SETTINGS || "sonar-settings",
).trim();
const HEARTBEAT_INTERVAL_MS = 15_000;
const LOCAL_HACKATHONS_KEY = "sonar.web.hackathons";
const GLOBAL_SETTINGS_KEY = "globalAdminSettings";
const HACKATHON_ID_LENGTH = 12;

type AnyDoc = Record<string, any>;

function assertConfigured() {
  if (!databases || !account) {
    throw new Error("Appwrite is not configured for the admin web app.");
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeHackathonId(value: string): string {
  return String(value || "").replace(/\D+/g, "");
}

function randomDigit(excludeZero = false): string {
  const min = excludeZero ? 1 : 0;
  const range = excludeZero ? 9 : 10;
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(1);
    const maxUnbiased = Math.floor(256 / range) * range;

    while (true) {
      cryptoApi.getRandomValues(bytes);
      if (bytes[0] < maxUnbiased) {
        return String(min + (bytes[0] % range));
      }
    }
  }

  return String(min + Math.floor(Math.random() * range));
}

export function generateHackathonId(length = 12): string {
  let value = randomDigit(true);

  while (value.length < length - 1) {
    value += randomDigit();
  }

  return `${value}${calculateLuhnCheckDigit(value)}`;
}

function getLuhnChecksum(value: string): number {
  let sum = 0;
  const parity = value.length % 2;

  for (let index = 0; index < value.length; index += 1) {
    let digit = Number(value[index] || 0);

    if (index % 2 === parity) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  return sum;
}

function calculateLuhnCheckDigit(baseDigits: string): string {
  const normalizedBase = normalizeHackathonId(baseDigits);
  const sum = getLuhnChecksum(`${normalizedBase}0`);
  return String((10 - (sum % 10)) % 10);
}

function isValidHackathonId(value: string): boolean {
  const normalized = normalizeHackathonId(value);

  return (
    normalized.length === HACKATHON_ID_LENGTH &&
    /^\d+$/.test(normalized) &&
    getLuhnChecksum(normalized) % 10 === 0
  );
}

export function defaultHackathonSettings(): HackathonSettings {
  return {
    blockInternetAccess: true,
    blockNonEmptyWorkspace: true,
    accentColor: "#4f46e5",
    editorTheme: "system",
    analyticsVisibility: "hosts",
  };
}

export function defaultGlobalSettings(): GlobalSettings {
  return {
    ...defaultHackathonSettings(),
  };
}

export function hackathonSettingsFromGlobal(
  settings?: Partial<GlobalSettings>,
): HackathonSettings {
  return {
    ...defaultHackathonSettings(),
    ...(settings || {}),
  };
}

export function defaultHackathonDraft(
  settings?: Partial<GlobalSettings>,
): HackathonDraft {
  return {
    hackathonId: generateHackathonId(),
    name: "",
    description: "",
    status: "draft",
    startDate: "",
    endDate: "",
    settings: hackathonSettingsFromGlobal(settings),
  };
}

function cloneHackathonSettings(
  settings?: Partial<HackathonSettings>,
): HackathonSettings {
  return {
    ...defaultHackathonSettings(),
    ...(settings || {}),
  };
}

function cloneGlobalSettings(
  settings?: Partial<GlobalSettings>,
): GlobalSettings {
  return {
    ...defaultGlobalSettings(),
    ...(settings || {}),
  };
}

function parseHackathonDocument(
  doc: AnyDoc,
  source: "appwrite" | "local",
): HackathonRecord {
  let parsedSettings: Partial<HackathonSettings> = {};

  try {
    if (typeof doc.settingsJson === "string" && doc.settingsJson.trim()) {
      parsedSettings = JSON.parse(doc.settingsJson);
    } else if (doc.settings && typeof doc.settings === "object") {
      parsedSettings = doc.settings;
    }
  } catch {
    parsedSettings = {};
  }

  return {
    id: String(doc.$id || doc.id || ID.unique()),
    hackathonId: String(doc.hackathonId || doc.slug || ""),
    name: String(doc.name || "Untitled Hackathon"),
    slug: String(doc.slug || slugify(String(doc.name || "hackathon"))),
    description: String(doc.description || ""),
    status:
      doc.status === "live" || doc.status === "archived" ? doc.status : "draft",
    hostUserId: String(doc.hostUserId || ""),
    hostName: String(doc.hostName || ""),
    startDate: String(doc.startDate || ""),
    endDate: String(doc.endDate || ""),
    settings: cloneHackathonSettings(parsedSettings),
    source,
    createdAt: doc.$createdAt || doc.createdAt,
    updatedAt: doc.$updatedAt || doc.updatedAt,
  };
}

function mapHackathonDocuments(
  docs: unknown,
  source: "appwrite" | "local",
): HackathonRecord[] {
  return Array.isArray(docs)
    ? docs.map((doc) => parseHackathonDocument(doc as AnyDoc, source))
    : [];
}

function createHackathonPayload(user: HostAccount, draft: HackathonDraft) {
  return {
    hackathonId: normalizeHackathonId(draft.hackathonId),
    name: draft.name.trim(),
    slug: slugify(draft.name),
    description: draft.description.trim(),
    status: draft.status,
    hostUserId: user.id,
    hostName: user.name,
    startDate: draft.startDate.trim(),
    endDate: draft.endDate.trim(),
    settingsJson: JSON.stringify(cloneHackathonSettings(draft.settings)),
  };
}

function toHackathonStoragePayload(
  payload: ReturnType<typeof createHackathonPayload>,
) {
  return {
    ...payload,
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
  };
}

function getLocalHackathons(): HackathonRecord[] {
  if (!browser) {
    return [];
  }

  try {
    const raw = localStorage.getItem(LOCAL_HACKATHONS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((entry) => parseHackathonDocument(entry, "local"))
      : [];
  } catch {
    return [];
  }
}

function setLocalHackathons(records: HackathonRecord[]) {
  if (!browser) {
    return;
  }

  localStorage.setItem(LOCAL_HACKATHONS_KEY, JSON.stringify(records));
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getDeveloperAccessPayload(): Promise<Record<string, unknown> | null> {
  if (!browser) {
    return null;
  }

  const raw = String(
    import.meta.env.VITE_DEV_KEY || import.meta.env.VITE_APPWRITE_DEV_KEY || "",
  ).trim();

  if (!raw) {
    return null;
  }

  const separatorIndex = raw.indexOf(":");
  const devUser = separatorIndex >= 0 ? raw.slice(0, separatorIndex) : "developer";
  const secret = separatorIndex >= 0 ? raw.slice(separatorIndex + 1) : raw;
  const timestamp = Date.now();
  const signature = await hmacSha256(secret, String(timestamp));

  return {
    type: "dev",
    devUser,
    timestamp,
    signature,
  };
}

async function executeSettingsFunction(
  payload: Record<string, unknown>,
): Promise<Record<string, any>> {
  assertConfigured();

  if (!functions) {
    throw new Error("Appwrite functions are unavailable.");
  }

  const accessPayload = await getDeveloperAccessPayload();

  if (!accessPayload) {
    throw new Error(
      "Function fallback requires VITE_DEV_KEY or VITE_APPWRITE_DEV_KEY during this migration.",
    );
  }

  const execution = await functions.createExecution(
    SETTINGS_FUNCTION_ID,
    JSON.stringify({
      ...payload,
      ...accessPayload,
    }),
    false,
    "/",
    ExecutionMethod.POST,
  );

  const data = JSON.parse(execution.responseBody || "{}");
  if (data?.success !== true) {
    throw new Error(data?.error || "Appwrite function execution failed.");
  }

  return data;
}

async function listHackathonsViaFunction(user: HostAccount): Promise<HackathonRecord[]> {
  const data = await executeSettingsFunction({
    action: "listHackathons",
    hostUserId: user.id,
  });

  return mapHackathonDocuments(data.documents, "appwrite");
}

async function findHackathonByPublicIdViaFunction(
  hackathonId: string,
  currentRecordId?: string,
): Promise<HackathonRecord | null> {
  const data = await executeSettingsFunction({
    action: "findHackathonByPublicId",
    hackathonId: normalizeHackathonId(hackathonId),
    currentRecordId,
  });

  if (!data.document) {
    return null;
  }

  return parseHackathonDocument(data.document as AnyDoc, "appwrite");
}

async function createHackathonViaFunction(
  payload: ReturnType<typeof createHackathonPayload>,
): Promise<HackathonRecord> {
  const data = await executeSettingsFunction({
    action: "createHackathon",
    payload: toHackathonStoragePayload(payload),
  });

  return parseHackathonDocument(data.document as AnyDoc, "appwrite");
}

async function updateHackathonViaFunction(
  recordId: string,
  payload: ReturnType<typeof createHackathonPayload>,
): Promise<HackathonRecord> {
  const data = await executeSettingsFunction({
    action: "updateHackathon",
    recordId,
    payload: toHackathonStoragePayload(payload),
  });

  return parseHackathonDocument(data.document as AnyDoc, "appwrite");
}

async function deleteHackathonViaFunction(recordId: string): Promise<void> {
  await executeSettingsFunction({
    action: "deleteHackathon",
    recordId,
  });
}

async function listDocumentsWithFallback(
  collectionId: string,
  queries: string[],
): Promise<{ documents: AnyDoc[]; viaFunction: boolean }> {
  assertConfigured();

  try {
    const result = await databases!.listDocuments(DB_ID, collectionId, queries);
    return {
      documents: result.documents as unknown as AnyDoc[],
      viaFunction: false,
    };
  } catch (directError) {
    const data = await executeSettingsFunction({
      action: "listDocuments",
      collectionId,
      queries,
    });

    return {
      documents: Array.isArray(data.documents) ? data.documents : [],
      viaFunction: true,
    };
  }
}

async function getSettingValueWithFallback(
  settingType: string,
): Promise<{ value: string | null; viaFunction: boolean }> {
  assertConfigured();

  try {
    const result = await databases!.listDocuments(DB_ID, COL_SETTINGS, [
      Query.equal("settingType", settingType),
      Query.limit(1),
    ]);

    return {
      value:
        result.documents.length > 0
          ? String(result.documents[0].settingValue ?? "")
          : null,
      viaFunction: false,
    };
  } catch {
    const data = await executeSettingsFunction({
      action: "getSettingValue",
      settingType,
    });

    return {
      value:
        typeof data.value === "string"
          ? data.value
          : data.value == null
            ? null
            : String(data.value),
      viaFunction: true,
    };
  }
}

async function getBooleanSettingWithFallback(
  settingType: string,
): Promise<{ value: boolean; viaFunction: boolean }> {
  const result = await getSettingValueWithFallback(settingType);

  return {
    value: String(result.value || "").toLowerCase() === "true",
    viaFunction: result.viaFunction,
  };
}

async function loadGlobalSettingsWithFallback(
  fallbackSettings?: Partial<GlobalSettings>,
): Promise<{ settings: GlobalSettings; viaFunction: boolean }> {
  const stored = await getSettingValueWithFallback(GLOBAL_SETTINGS_KEY);

  if (!stored.value) {
    return {
      settings: cloneGlobalSettings(fallbackSettings),
      viaFunction: stored.viaFunction,
    };
  }

  try {
    const parsed = JSON.parse(stored.value);
    return {
      settings: cloneGlobalSettings({
        ...(fallbackSettings || {}),
        ...(parsed && typeof parsed === "object" ? parsed : {}),
      }),
      viaFunction: stored.viaFunction,
    };
  } catch {
    return {
      settings: cloneGlobalSettings(fallbackSettings),
      viaFunction: stored.viaFunction,
    };
  }
}

async function upsertSettingValueDirect(settingType: string, value: string) {
  assertConfigured();

  const result = await databases!.listDocuments(DB_ID, COL_SETTINGS, [
    Query.equal("settingType", settingType),
    Query.limit(1),
  ]);

  if (result.documents.length > 0) {
    await databases!.updateDocument(DB_ID, COL_SETTINGS, result.documents[0].$id, {
      settingValue: value,
    });
    return;
  }

  await databases!.createDocument(DB_ID, COL_SETTINGS, ID.unique(), {
    settingType,
    settingValue: value,
  });
}

async function updateSettingValueWithFallback(settingType: string, value: string) {
  try {
    await upsertSettingValueDirect(settingType, value);
  } catch {
    await executeSettingsFunction({
      action: "updateSetting",
      settingType,
      settingValue: value,
    });
  }
}

async function updateSettingWithFallback(settingType: string, value: boolean) {
  await updateSettingValueWithFallback(settingType, String(value));
}

async function ensureHackathonIdAvailable(hackathonId: string, currentRecordId?: string) {
  let conflicting: AnyDoc | HackathonRecord | null = null;

  if (COL_HACKATHONS && databases) {
    try {
      const result = await databases.listDocuments(DB_ID, COL_HACKATHONS, [
        Query.equal("hackathonId", normalizeHackathonId(hackathonId)),
        Query.limit(10),
      ]);

      conflicting =
        result.documents.find((doc) => doc.$id !== currentRecordId) || null;
    } catch {
      conflicting = await findHackathonByPublicIdViaFunction(
        hackathonId,
        currentRecordId,
      );
    }
  } else {
    conflicting = await findHackathonByPublicIdViaFunction(
      hackathonId,
      currentRecordId,
    );
  }

  if (conflicting) {
    throw new Error("That hackathon ID is already in use.");
  }
}

function hasLocalHackathonIdConflict(hackathonId: string, currentRecordId?: string) {
  return getLocalHackathons().some(
    (entry) =>
      entry.hackathonId === hackathonId &&
      (!currentRecordId || entry.id !== currentRecordId),
  );
}

function isHackathonIdConflictError(error: unknown) {
  return error instanceof Error && error.message.includes("already in use");
}

async function generateAvailableHackathonId(currentRecordId?: string): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateHackathonId();

    if (hasLocalHackathonIdConflict(candidate, currentRecordId)) {
      continue;
    }

    if (!databases) {
      return candidate;
    }

    try {
      await ensureHackathonIdAvailable(candidate, currentRecordId);
      return candidate;
    } catch (error) {
      if (isHackathonIdConflictError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a unique hackathon ID right now.");
}

function dedupeSessions(rows: AnyDoc[]): SessionRecord[] {
  const byTeam = new Map<string, SessionRecord>();

  for (const row of rows) {
    const teamId = String(row.teamId || row.$id || "");
    if (!teamId) {
      continue;
    }

    const next: SessionRecord = {
      id: String(row.$id || row.id || teamId),
      teamId,
      teamName: String(row.teamName || "Unknown Team"),
      hackathonId: row.hackathonId ? String(row.hackathonId) : undefined,
      status: row.status === "offline" ? "offline" : "online",
      lastSeen: String(row.lastSeen || row.timestamp || new Date().toISOString()),
      currentWindow: row.currentWindow ? String(row.currentWindow) : undefined,
      currentFile: row.currentFile ? String(row.currentFile) : undefined,
    };

    const existing = byTeam.get(teamId);
    if (!existing) {
      byTeam.set(teamId, next);
      continue;
    }

    const nextTime = new Date(next.lastSeen).getTime();
    const existingTime = new Date(existing.lastSeen).getTime();
    if (nextTime >= existingTime) {
      byTeam.set(teamId, next);
    }
  }

  return Array.from(byTeam.values());
}

function dedupeLogs(rows: AnyDoc[]): AnyDoc[] {
  const byTeam = new Map<string, AnyDoc>();

  for (const row of rows) {
    const teamId = String(row.teamId || "");
    if (!teamId || byTeam.has(teamId)) {
      continue;
    }

    byTeam.set(teamId, row);
  }

  return Array.from(byTeam.values());
}

function buildTeamMonitors(sessionRows: AnyDoc[], activityRows: AnyDoc[]): TeamMonitor[] {
  const sessions = dedupeSessions(sessionRows);
  const logs = dedupeLogs(activityRows);
  const logMap = new Map<string, AnyDoc>();

  for (const row of logs) {
    logMap.set(String(row.teamId), row);
  }

  const now = Date.now();
  const teamIds = new Set<string>([
    ...sessions.map((entry) => entry.teamId),
    ...logs.map((entry) => String(entry.teamId)),
  ]);

  const monitors: TeamMonitor[] = [];

  for (const teamId of teamIds) {
    const session = sessions.find((entry) => entry.teamId === teamId);
    const log = logMap.get(teamId);

    const lastSeen = session?.lastSeen || String(log?.timestamp || new Date().toISOString());
    const stale = now - new Date(lastSeen).getTime() > HEARTBEAT_INTERVAL_MS * 2;
    const syncData = parseSyncData({
      timestamp: String(log?.timestamp || lastSeen),
      status: log?.status === "offline" ? "offline" : session?.status === "offline" ? "offline" : "online",
      windowTitle: typeof log?.windowTitle === "string" ? log.windowTitle : "",
    });

    const baseSession: SessionRecord = {
      id: session?.id || String(log?.$id || teamId),
      teamId,
      teamName: session?.teamName || String(log?.teamName || "Unknown Team"),
      hackathonId:
        session?.hackathonId ||
        (log?.hackathonId ? String(log.hackathonId) : undefined),
      status: stale ? "offline" : session?.status || (log?.status === "offline" ? "offline" : "online"),
      lastSeen,
      currentWindow: session?.currentWindow || (log?.currentWindow ? String(log.currentWindow) : undefined),
      currentFile: session?.currentFile || (log?.currentFile ? String(log.currentFile) : undefined),
    };

    const reportData = buildReportData(baseSession.teamName, syncData);
    const risk = computeRiskScore(reportData, syncData.activityEvents || []);

    monitors.push({
      ...baseSession,
      syncData,
      reportData,
      risk,
    });
  }

  return monitors.sort(
    (left, right) =>
      new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime(),
  );
}

function mapReports(rows: AnyDoc[]): StoredReport[] {
  return rows.map((row) => ({
    id: String(row.$id || row.id || ID.unique()),
    teamId: String(row.teamId || ""),
    teamName: String(row.teamName || "Unknown Team"),
    hackathonId: row.hackathonId ? String(row.hackathonId) : undefined,
    sessionStart: String(row.sessionStart || ""),
    sessionEnd: String(row.sessionEnd || ""),
    generatedAt: String(row.generatedAt || row.$createdAt || ""),
    reportData: String(row.reportData || ""),
  }));
}

export async function listHackathons(user: HostAccount): Promise<{
  hackathons: HackathonRecord[];
  source: "appwrite" | "local";
  warning: string | null;
}> {
  if (!databases) {
    return {
      hackathons: getLocalHackathons().filter((item) => item.hostUserId === user.id),
      source: "local",
      warning:
        "Hackathons are currently stored locally because VITE_APPWRITE_COLLECTION_HACKATHONS is not configured.",
    };
  }

  try {
    const result = await databases.listDocuments(DB_ID, COL_HACKATHONS, [
      Query.equal("hostUserId", user.id),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);

    return {
      hackathons: result.documents.map((doc) =>
        parseHackathonDocument(doc as unknown as AnyDoc, "appwrite"),
      ),
      source: "appwrite",
      warning: null,
    };
  } catch {
    try {
      return {
        hackathons: await listHackathonsViaFunction(user),
        source: "appwrite",
        warning: null,
      };
    } catch {
      return {
        hackathons: getLocalHackathons().filter((item) => item.hostUserId === user.id),
        source: "local",
        warning:
          "Appwrite hackathon storage is not ready yet, so the dashboard fell back to local browser storage.",
      };
    }
  }
}

export async function createHackathon(
  user: HostAccount,
  draft: HackathonDraft,
): Promise<{ record: HackathonRecord; source: "appwrite" | "local"; warning: string | null }> {
  let payload = createHackathonPayload(user, draft);

  if (!isValidHackathonId(payload.hackathonId)) {
    payload = {
      ...payload,
      hackathonId: await generateAvailableHackathonId(),
    };
  }

  if (!payload.name) {
    throw new Error("Hackathon name is required.");
  }

  if (!databases) {
    if (hasLocalHackathonIdConflict(payload.hackathonId)) {
      payload = {
        ...payload,
        hackathonId: await generateAvailableHackathonId(),
      };
    }

    const localRecord = parseHackathonDocument(
      {
        id: crypto.randomUUID(),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "local",
    );
    const next = [localRecord, ...getLocalHackathons()];
    setLocalHackathons(next);

    return {
      record: localRecord,
      source: "local",
      warning:
        "Saved locally because the Appwrite hackathons collection is not configured yet.",
    };
  }

  try {
    await ensureHackathonIdAvailable(payload.hackathonId);
  } catch (error) {
    if (isHackathonIdConflictError(error)) {
      payload = {
        ...payload,
        hackathonId: await generateAvailableHackathonId(),
      };
    } else {
      throw error;
    }
  }

  try {
    const storagePayload = toHackathonStoragePayload(payload);
    const created = await databases.createDocument(
      DB_ID,
      COL_HACKATHONS,
      ID.unique(),
      storagePayload,
      [
        Permission.read(Role.user(user.id)),
        Permission.update(Role.user(user.id)),
        Permission.delete(Role.user(user.id)),
      ],
    );

    return {
      record: parseHackathonDocument(created as unknown as AnyDoc, "appwrite"),
      source: "appwrite",
      warning: null,
    };
  } catch {
    try {
      return {
        record: await createHackathonViaFunction(payload),
        source: "appwrite",
        warning: null,
      };
    } catch (functionError) {
      if (isHackathonIdConflictError(functionError)) {
        throw functionError;
      }
    }

    if (hasLocalHackathonIdConflict(payload.hackathonId)) {
      payload = {
        ...payload,
        hackathonId: await generateAvailableHackathonId(),
      };
    }

    const localRecord = parseHackathonDocument(
      {
        id: crypto.randomUUID(),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "local",
    );
    const next = [localRecord, ...getLocalHackathons()];
    setLocalHackathons(next);

    return {
      record: localRecord,
      source: "local",
      warning:
        "Appwrite create failed, so the hackathon was saved locally in this browser instead.",
    };
  }
}

export async function updateHackathon(
  user: HostAccount,
  record: HackathonRecord,
): Promise<{ record: HackathonRecord; source: "appwrite" | "local"; warning: string | null }> {
  const payload = createHackathonPayload(user, {
    hackathonId: record.hackathonId,
    name: record.name,
    description: record.description,
    status: record.status,
    startDate: record.startDate,
    endDate: record.endDate,
    settings: record.settings,
  });

  if (!isValidHackathonId(payload.hackathonId)) {
    throw new Error("Hackathon ID must be a valid 12-digit event ID.");
  }

  if (record.source === "local" || !databases) {
    if (
      getLocalHackathons().some(
        (entry) =>
          entry.hackathonId === payload.hackathonId && entry.id !== record.id,
      )
    ) {
      throw new Error("That hackathon ID is already in use.");
    }

    const next = getLocalHackathons().map((entry) =>
      entry.id === record.id
        ? {
            ...record,
            ...payload,
            updatedAt: new Date().toISOString(),
            source: "local" as const,
          }
        : entry,
    );
    setLocalHackathons(next);

    return {
      record: next.find((entry) => entry.id === record.id) || record,
      source: "local",
      warning:
        record.source === "local"
          ? null
          : "Saved locally because Appwrite hackathon storage is not available for updates yet.",
    };
  }

  try {
    await ensureHackathonIdAvailable(payload.hackathonId, record.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already in use")) {
      throw error;
    }
  }

  try {
    const storagePayload = toHackathonStoragePayload(payload);
    const updated = await databases.updateDocument(
      DB_ID,
      COL_HACKATHONS,
      record.id,
      storagePayload,
    );
    return {
      record: parseHackathonDocument(updated as unknown as AnyDoc, "appwrite"),
      source: "appwrite",
      warning: null,
    };
  } catch {
    try {
      return {
        record: await updateHackathonViaFunction(record.id, payload),
        source: "appwrite",
        warning: null,
      };
    } catch (functionError) {
      if (
        functionError instanceof Error &&
        functionError.message.includes("already in use")
      ) {
        throw functionError;
      }
    }

    const fallbackRecord: HackathonRecord = {
      ...record,
      ...payload,
      updatedAt: new Date().toISOString(),
      source: "local",
    };
    const next = [
      fallbackRecord,
      ...getLocalHackathons().filter((entry) => entry.id !== record.id),
    ];
    setLocalHackathons(next);

    return {
      record: fallbackRecord,
      source: "local",
      warning:
        "Appwrite update failed, so the latest hackathon changes were stored locally in this browser.",
    };
  }
}

export async function deleteHackathon(record: HackathonRecord) {
  if (record.source === "local" || !databases) {
    setLocalHackathons(getLocalHackathons().filter((entry) => entry.id !== record.id));
    return;
  }

  try {
    await databases.deleteDocument(DB_ID, COL_HACKATHONS, record.id);
  } catch {
    try {
      await deleteHackathonViaFunction(record.id);
    } catch {
      setLocalHackathons(getLocalHackathons().filter((entry) => entry.id !== record.id));
    }
  }
}

export async function loadAdminSnapshot(): Promise<AdminSnapshot> {
  assertConfigured();

  const warnings = new Set<string>();
  const capabilities = {
    canReadTelemetry: false,
    canReadReports: false,
    canManagePlatform: false,
    isUsingFunctionFallback: false,
  };
  const settings: PlatformSettings = {
    blockInternetAccess: false,
    blockNonEmptyWorkspace: false,
  };
  let globalSettings = cloneGlobalSettings();

  let sessionRows: AnyDoc[] = [];
  let activityRows: AnyDoc[] = [];
  let reportRows: AnyDoc[] = [];

  try {
    const result = await listDocumentsWithFallback(COL_SESSIONS, [Query.limit(100)]);
    sessionRows = result.documents;
    capabilities.canReadTelemetry = true;
    capabilities.isUsingFunctionFallback ||= result.viaFunction;
  } catch {
    warnings.add(
      "Live editor sessions are not accessible yet for this account in the web admin panel.",
    );
  }

  try {
    const result = await listDocumentsWithFallback(COL_ACTIVITY_LOGS, [
      Query.orderDesc("timestamp"),
      Query.limit(100),
    ]);
    activityRows = result.documents;
    capabilities.canReadTelemetry = true;
    capabilities.isUsingFunctionFallback ||= result.viaFunction;
  } catch {
    warnings.add(
      "Activity analytics are still locked behind the current Appwrite permissions or function gate.",
    );
  }

  try {
    const internet = await getBooleanSettingWithFallback("blockInternetAccess");
    const workspace = await getBooleanSettingWithFallback("blockNonEmptyWorkspace");
    settings.blockInternetAccess = internet.value;
    settings.blockNonEmptyWorkspace = workspace.value;
    capabilities.canManagePlatform = true;
    capabilities.isUsingFunctionFallback ||= internet.viaFunction || workspace.viaFunction;
  } catch {
    warnings.add(
      "Global editor restrictions are not available from the web for this account yet.",
    );
  }

  try {
    const result = await loadGlobalSettingsWithFallback({
      blockInternetAccess: settings.blockInternetAccess,
      blockNonEmptyWorkspace: settings.blockNonEmptyWorkspace,
    });
    globalSettings = result.settings;
    capabilities.canManagePlatform = true;
    capabilities.isUsingFunctionFallback ||= result.viaFunction;
  } catch {
    globalSettings = cloneGlobalSettings({
      blockInternetAccess: settings.blockInternetAccess,
      blockNonEmptyWorkspace: settings.blockNonEmptyWorkspace,
    });
    warnings.add(
      "Global hackathon defaults are using built-in values until host settings access is available.",
    );
  }

  try {
    const result = await listDocumentsWithFallback(COL_REPORTS, [
      Query.orderDesc("generatedAt"),
      Query.limit(50),
    ]);
    reportRows = result.documents;
    capabilities.canReadReports = true;
    capabilities.isUsingFunctionFallback ||= result.viaFunction;
  } catch {
    warnings.add("Saved reports are not accessible from the web for this account yet.");
  }

  return {
    monitors: capabilities.canReadTelemetry
      ? buildTeamMonitors(sessionRows, activityRows)
      : [],
    reports: capabilities.canReadReports ? mapReports(reportRows) : [],
    settings,
    globalSettings,
    warnings: Array.from(warnings),
    capabilities,
  };
}

export async function updateGlobalPlatformSetting(
  settingType: keyof PlatformSettings,
  value: boolean,
) {
  const mappedType =
    settingType === "blockInternetAccess"
      ? "blockInternetAccess"
      : "blockNonEmptyWorkspace";

  await updateSettingWithFallback(mappedType, value);
}

export async function updateGlobalSettings(settings: GlobalSettings) {
  await updateSettingValueWithFallback(
    GLOBAL_SETTINGS_KEY,
    JSON.stringify(cloneGlobalSettings(settings)),
  );
}

export async function applyHackathonSettingsToPlatform(settings: HackathonSettings) {
  await Promise.all([
    updateSettingWithFallback("blockInternetAccess", settings.blockInternetAccess),
    updateSettingWithFallback(
      "blockNonEmptyWorkspace",
      settings.blockNonEmptyWorkspace,
    ),
  ]);
}

export async function flushActivityLogs() {
  await executeSettingsFunction({
    action: "flushActivityLogs",
  });
}
