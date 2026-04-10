import type {
  ActivityEvent,
  ActivitySyncData,
  ReportData,
  RiskSummary,
} from "$lib/admin/types";

export function parseSyncData(doc: {
  timestamp: string;
  status: "online" | "offline";
  windowTitle?: string;
}): ActivitySyncData {
  let parsed: unknown = null;

  try {
    if (doc.windowTitle) {
      parsed = JSON.parse(doc.windowTitle);
    }
  } catch {
    parsed = null;
  }

  const isArray = Array.isArray(parsed);
  const safeParsed =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  const activityEvents = isArray
    ? (parsed as ActivityEvent[])
    : Array.isArray(safeParsed.activityEvents)
      ? (safeParsed.activityEvents as ActivityEvent[])
      : [];

  return {
    sessionStart: doc.timestamp,
    heartbeatCount: 0,
    apps: {},
    files: [],
    windows: [],
    statusChanges: 0,
    totalOnlineSec: 0,
    totalOfflineSec: 0,
    lastStatus: doc.status,
    lastStatusAt: doc.timestamp,
    offlinePeriods: [],
    ...safeParsed,
    activityEvents,
  };
}

export function buildReportData(
  teamName: string,
  sync: ActivitySyncData,
): ReportData {
  const emptyReport: ReportData = {
    team: {
      teamName,
      role: "team",
    },
    sessionStart: "",
    sessionEnd: "",
    statusTimeline: [],
    appUsage: [],
    summary: {
      totalDuration: 0,
      totalOnlineTime: 0,
      totalOfflineTime: 0,
      disconnections: 0,
      longestOnlineStretch: 0,
      percentOnline: 0,
      percentInIDE: 0,
      appSwitches: 0,
    },
  };

  if (!sync) {
    return emptyReport;
  }

  const heartbeatCount = Number.isFinite(Number(sync.heartbeatCount))
    ? Number(sync.heartbeatCount)
    : 0;
  const events = Array.isArray(sync.activityEvents) ? sync.activityEvents : [];

  if (heartbeatCount === 0 && events.length === 0) {
    return emptyReport;
  }

  const apps =
    sync.apps && typeof sync.apps === "object" ? sync.apps : ({} as Record<string, number>);
  const offlinePeriods = Array.isArray(sync.offlinePeriods)
    ? sync.offlinePeriods
    : [];
  const totalOnlineSec = Number.isFinite(Number(sync.totalOnlineSec))
    ? Number(sync.totalOnlineSec)
    : 0;
  const totalOfflineSec = Number.isFinite(Number(sync.totalOfflineSec))
    ? Number(sync.totalOfflineSec)
    : 0;

  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  const inferredStart = sortedEvents[0]?.timestamp || "";
  const inferredEnd =
    sortedEvents[sortedEvents.length - 1]?.timestamp || inferredStart;
  const sessionStart = sync.sessionStart || inferredStart || "";
  const sessionEnd = sync.lastStatusAt || inferredEnd || sync.sessionStart || "";

  const inferredTotalDuration =
    sessionStart && sessionEnd
      ? Math.max(
          0,
          (new Date(sessionEnd).getTime() - new Date(sessionStart).getTime()) /
            1000,
        )
      : 0;

  const totalDuration = Math.max(
    totalOnlineSec + totalOfflineSec,
    inferredTotalDuration,
  );

  const statusTimeline = [];
  let longestOnline = 0;
  let previousEnd = sessionStart;

  const sortedOffline = [...offlinePeriods].sort(
    (left, right) =>
      new Date(left.from).getTime() - new Date(right.from).getTime(),
  );

  for (const period of sortedOffline) {
    const onlineDuration =
      (new Date(period.from).getTime() - new Date(previousEnd).getTime()) /
      1000;

    if (onlineDuration > 0) {
      statusTimeline.push({
        status: "online" as const,
        from: previousEnd,
        to: period.from,
        duration: onlineDuration,
      });
      if (onlineDuration > longestOnline) {
        longestOnline = onlineDuration;
      }
    }

    statusTimeline.push({
      status: "offline" as const,
      from: period.from,
      to: period.to,
      duration: period.duration,
    });
    previousEnd = period.to;
  }

  const finalOnlineDuration =
    (new Date(sessionEnd).getTime() - new Date(previousEnd).getTime()) / 1000;

  if (finalOnlineDuration > 0) {
    statusTimeline.push({
      status: "online" as const,
      from: previousEnd,
      to: sessionEnd,
      duration: finalOnlineDuration,
    });
    if (finalOnlineDuration > longestOnline) {
      longestOnline = finalOnlineDuration;
    }
  }

  if (statusTimeline.length === 0 && totalDuration > 0) {
    statusTimeline.push({
      status: "online" as const,
      from: sessionStart,
      to: sessionEnd,
      duration: totalDuration,
    });
    longestOnline = totalDuration;
  }

  const appUsage = Object.entries(apps)
    .map(([appName, totalTime]) => ({
      appName,
      windowTitle: appName,
      firstSeen: sessionStart,
      lastSeen: sessionEnd,
      totalTime,
    }))
    .sort((left, right) => right.totalTime - left.totalTime);

  const ideTime = appUsage
    .filter((entry) => entry.appName.toLowerCase() === "sonar code editor")
    .reduce((total, entry) => total + entry.totalTime, 0);

  const appSwitches = sortedEvents.filter((event) => event.type === "app_blur")
    .length;

  const onlineEvents = sortedEvents.filter(
    (event) => event.type === "status_online",
  ).length;
  const offlineEvents = sortedEvents.filter(
    (event) => event.type === "status_offline",
  ).length;

  const fallbackOnlineTime =
    totalOnlineSec > 0 ? totalOnlineSec : onlineEvents > 0 ? inferredTotalDuration : 0;
  const fallbackOfflineTime =
    totalOfflineSec > 0
      ? totalOfflineSec
      : offlineEvents > 0
        ? Math.max(0, inferredTotalDuration - fallbackOnlineTime)
        : 0;

  return {
    team: {
      teamName,
      role: "team",
    },
    sessionStart,
    sessionEnd,
    statusTimeline,
    appUsage,
    summary: {
      totalDuration,
      totalOnlineTime: fallbackOnlineTime,
      totalOfflineTime: fallbackOfflineTime,
      disconnections: Math.max(offlinePeriods.length, offlineEvents),
      longestOnlineStretch: longestOnline,
      percentOnline:
        totalDuration > 0
          ? Math.round((fallbackOnlineTime / totalDuration) * 100)
          : 0,
      percentInIDE:
        fallbackOnlineTime > 0
          ? Math.round((ideTime / fallbackOnlineTime) * 100)
          : 0,
      appSwitches,
    },
  };
}

export function computeRiskScore(
  data: ReportData,
  events: ActivityEvent[] = [],
): RiskSummary {
  const flags: string[] = [];
  let score = 0;
  const counts: Record<string, number> = {};

  for (const event of events) {
    counts[event.type] = (counts[event.type] || 0) + 1;
  }

  const onlineCount = counts.status_online || 0;
  const extPasteCount = counts.clipboard_paste_external || 0;
  const appBlurCount = counts.app_blur || 0;

  if (data.summary.percentInIDE < 60) {
    score += 20;
    flags.push(`Low IDE focus: ${data.summary.percentInIDE}%`);
  } else if (data.summary.percentInIDE < 80) {
    score += 10;
  }

  if (onlineCount > 5) {
    score += 25;
    flags.push(`Went online ${onlineCount} times`);
  } else if (onlineCount > 2) {
    score += 15;
    flags.push(`Went online ${onlineCount} times`);
  } else if (onlineCount > 0) {
    score += 8;
    flags.push(`Went online ${onlineCount} time${onlineCount > 1 ? "s" : ""}`);
  }

  if (appBlurCount > 15) {
    score += 25;
    flags.push(`Excessive app switching: ${appBlurCount} times`);
  } else if (appBlurCount > 5) {
    score += 15;
    flags.push(`Frequent app switching: ${appBlurCount} times`);
  } else if (appBlurCount > 0) {
    score += 8;
    flags.push(`Switched away from IDE ${appBlurCount} time${appBlurCount > 1 ? "s" : ""}`);
  }

  if (extPasteCount > 5) {
    score += 25;
    flags.push(`Heavy external pasting: ${extPasteCount} times`);
  } else if (extPasteCount > 2) {
    score += 15;
    flags.push(`External paste detected: ${extPasteCount} times`);
  } else if (extPasteCount > 0) {
    score += 10;
    flags.push(`External paste detected: ${extPasteCount} time${extPasteCount > 1 ? "s" : ""}`);
  }

  const nonIdeApps = data.appUsage.filter(
    (entry) => entry.appName.toLowerCase() !== "sonar code editor",
  );

  if (nonIdeApps.length > 0) {
    score += Math.min(15, nonIdeApps.length * 5);
    flags.push(
      `Non-IDE apps: ${nonIdeApps
        .slice(0, 4)
        .map((entry) => entry.appName)
        .join(", ")}`,
    );
  }

  score = Math.min(100, score);

  return {
    score,
    level: score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW",
    flags,
    onlineCount,
    extPasteCount,
    appBlurCount,
    appSwitchCount: appBlurCount,
  };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0m";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

export function formatEventType(type: string): string {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
