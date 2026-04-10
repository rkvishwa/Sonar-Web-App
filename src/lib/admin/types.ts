export type AccountRole = "host" | "admin";
export type HostAccountType = "individual" | "organization";
export type HostAuthProvider = "email" | "google" | "github";

export interface HostAccountPrefs extends Record<string, unknown> {
  role?: AccountRole;
  registrationCompleted?: boolean;
  registrationCompletedAt?: string;
  accountType?: HostAccountType;
  organizationName?: string;
  registrantRole?: string;
  passwordConfigured?: boolean;
  authProviders?: HostAuthProvider[];
}

export interface HostAccount {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: AccountRole;
  labels: string[];
  prefs: HostAccountPrefs;
  registrationCompleted: boolean;
  accountType: HostAccountType | null;
  organizationName: string | null;
  registrantRole: string | null;
  passwordConfigured: boolean;
  authProviders: HostAuthProvider[];
  createdAt?: string;
}

export type HackathonStatus = "draft" | "live" | "archived";

export interface HackathonSettings {
  blockInternetAccess: boolean;
  blockNonEmptyWorkspace: boolean;
  accentColor?: string;
  editorTheme?: "system" | "light" | "dark";
  analyticsVisibility?: "hosts" | "organizers" | "readonly";
}

export interface GlobalSettings extends HackathonSettings {
}

export interface HackathonRecord {
  id: string;
  hackathonId: string;
  name: string;
  slug: string;
  description: string;
  status: HackathonStatus;
  hostUserId: string;
  hostName: string;
  startDate: string;
  endDate: string;
  settings: HackathonSettings;
  source: "appwrite" | "local";
  createdAt?: string;
  updatedAt?: string;
}

export interface HackathonDraft {
  hackathonId: string;
  name: string;
  description: string;
  status: HackathonStatus;
  startDate: string;
  endDate: string;
  settings: HackathonSettings;
}

export interface SessionRecord {
  id: string;
  teamId: string;
  teamName: string;
  hackathonId?: string;
  status: "online" | "offline";
  lastSeen: string;
  currentWindow?: string;
  currentFile?: string;
}

export interface ActivityEvent {
  type: string;
  timestamp: string;
  details?: string;
}

export interface ActivitySyncData {
  sessionStart: string;
  heartbeatCount: number;
  apps: Record<string, number>;
  files: string[];
  windows: string[];
  statusChanges: number;
  totalOnlineSec: number;
  totalOfflineSec: number;
  lastStatus: "online" | "offline";
  lastStatusAt: string;
  offlinePeriods: Array<{ from: string; to: string; duration: number }>;
  activityEvents?: ActivityEvent[];
}

export interface StatusEntry {
  status: "online" | "offline";
  from: string;
  to: string;
  duration: number;
}

export interface AppUsageEntry {
  appName: string;
  windowTitle: string;
  firstSeen: string;
  lastSeen: string;
  totalTime: number;
}

export interface ReportData {
  team: {
    teamName: string;
    role: "team" | "admin";
  };
  sessionStart: string;
  sessionEnd: string;
  statusTimeline: StatusEntry[];
  appUsage: AppUsageEntry[];
  summary: {
    totalDuration: number;
    totalOnlineTime: number;
    totalOfflineTime: number;
    disconnections: number;
    longestOnlineStretch: number;
    percentOnline: number;
    percentInIDE: number;
    appSwitches: number;
  };
}

export interface RiskSummary {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  flags: string[];
  onlineCount: number;
  extPasteCount: number;
  appBlurCount: number;
  appSwitchCount: number;
}

export interface TeamMonitor extends SessionRecord {
  syncData: ActivitySyncData;
  reportData: ReportData;
  risk: RiskSummary;
}

export interface StoredReport {
  id: string;
  teamId: string;
  teamName: string;
  hackathonId?: string;
  sessionStart: string;
  sessionEnd: string;
  generatedAt: string;
  reportData: string;
}

export interface PlatformSettings extends HackathonSettings {}

export interface AdminCapabilities {
  canReadTelemetry: boolean;
  canReadReports: boolean;
  canManagePlatform: boolean;
  isUsingFunctionFallback: boolean;
}

export interface AdminSnapshot {
  monitors: TeamMonitor[];
  reports: StoredReport[];
  settings: PlatformSettings;
  globalSettings: GlobalSettings;
  warnings: string[];
  capabilities: AdminCapabilities;
}
