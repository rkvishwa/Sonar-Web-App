<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock3,
    FileText,
    Flag,
    Globe,
    HardDrive,
    KeyRound,
    Layers3,
    LoaderCircle,
    LogOut,
    Plus,
    Radar,
    RefreshCw,
    Save,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Trash2,
    Users,
    WifiOff,
  } from "lucide-svelte";
  import {
    applyHackathonSettingsToPlatform,
    createHackathon,
    defaultHackathonDraft,
    deleteHackathon,
    flushActivityLogs,
    listHackathons,
    loadAdminSnapshot,
    updateGlobalPlatformSetting,
    updateHackathon,
  } from "$lib/admin/api";
  import {
    changeCurrentPassword,
    refreshSession,
    resolveAuthenticatedRoute,
    signOut,
  } from "$lib/admin/auth";
  import {
    formatDateTime,
    formatDuration,
    formatEventType,
  } from "$lib/admin/analytics";
  import type {
    AdminSnapshot,
    HackathonDraft,
    HackathonRecord,
    HostAccount,
    TeamMonitor,
  } from "$lib/admin/types";

  const emptySnapshot: AdminSnapshot = {
    monitors: [],
    reports: [],
    settings: {
      blockInternetAccess: false,
      blockNonEmptyWorkspace: false,
    },
    globalSettings: {
      blockInternetAccess: false,
      blockNonEmptyWorkspace: false,
    },
    warnings: [],
    capabilities: {
      canReadTelemetry: false,
      canReadReports: false,
      canManagePlatform: false,
      isUsingFunctionFallback: false,
    },
  };

  let currentUser = $state<HostAccount | null>(null);
  let snapshot = $state<AdminSnapshot>(emptySnapshot);
  let hackathons = $state<HackathonRecord[]>([]);
  let hackathonSource = $state<"appwrite" | "local">("local");
  let hackathonWarning = $state<string | null>(null);
  let selectedHackathonId = $state<string | null>(null);
  let selectedTeamId = $state<string | null>(null);
  let hackathonEditor = $state<HackathonRecord | null>(null);
  let newHackathon = $state<HackathonDraft>(defaultHackathonDraft());
  let search = $state("");

  let loading = $state(true);
  let refreshing = $state(false);
  let creatingHackathon = $state(false);
  let savingHackathon = $state(false);
  let deletingHackathon = $state(false);
  let syncingSettings = $state(false);
  let flushingLogs = $state(false);
  let updatingPassword = $state(false);
  let togglingSetting = $state<"internet" | "workspace" | null>(null);

  let passwordForm = $state({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  let dashboardError = $state("");
  let actionError = $state("");
  let actionMessage = $state("");

  function cloneHackathon(record: HackathonRecord): HackathonRecord {
    return {
      ...record,
      settings: {
        ...record.settings,
      },
    };
  }

  function syncHackathonEditor() {
    const selected =
      hackathons.find((entry) => entry.id === selectedHackathonId) || null;
    hackathonEditor = selected ? cloneHackathon(selected) : null;
  }

  function selectedHackathon(): HackathonRecord | null {
    return hackathons.find((entry) => entry.id === selectedHackathonId) || null;
  }

  function syncSelectedTeam() {
    const teams = filteredTeams();
    if (!teams.length) {
      selectedTeamId = null;
      return;
    }

    if (!selectedTeamId || !teams.some((entry) => entry.teamId === selectedTeamId)) {
      selectedTeamId = teams[0].teamId;
    }
  }

  function filteredTeams() {
    const query = search.trim().toLowerCase();
    const activeHackathon = selectedHackathon();
    const next = snapshot.monitors.filter((entry) => {
      if (activeHackathon && entry.hackathonId !== activeHackathon.hackathonId) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [entry.teamName, entry.currentFile, entry.currentWindow, entry.hackathonId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    return next;
  }

  function filteredReports() {
    const activeHackathon = selectedHackathon();
    if (!activeHackathon) {
      return snapshot.reports;
    }

    return snapshot.reports.filter(
      (entry) => entry.hackathonId === activeHackathon.hackathonId,
    );
  }

  function selectedTeam(): TeamMonitor | null {
    const teams = filteredTeams();
    return teams.find((entry) => entry.teamId === selectedTeamId) || teams[0] || null;
  }

  function statusTone(status: "online" | "offline") {
    return status === "online"
      ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200"
      : "border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }

  function riskTone(level: TeamMonitor["risk"]["level"]) {
    if (level === "HIGH") {
      return "border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200";
    }

    if (level === "MEDIUM") {
      return "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200";
    }

    return "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  function platformAccessLabel() {
    if (snapshot.capabilities.canManagePlatform) {
      return snapshot.capabilities.isUsingFunctionFallback
        ? "Full admin access through function fallback"
        : "Full admin access";
    }

    if (snapshot.capabilities.canReadTelemetry || snapshot.capabilities.canReadReports) {
      return "Read-only monitoring access";
    }

    return "Hackathon workspace only";
  }

  async function loadDashboard(options: { silent?: boolean } = {}) {
    if (options.silent) {
      refreshing = true;
    } else {
      loading = true;
    }

    dashboardError = "";

    try {
      const session = await refreshSession();
      if (!session.user || !session.user.registrationCompleted) {
        await goto(resolveAuthenticatedRoute(session.user), { replaceState: true });
        return;
      }

      currentUser = session.user;

      const [hackathonResult, adminResult] = await Promise.all([
        listHackathons(session.user),
        loadAdminSnapshot(),
      ]);

      hackathons = hackathonResult.hackathons;
      hackathonSource = hackathonResult.source;
      hackathonWarning = hackathonResult.warning;
      snapshot = adminResult;

      if (
        !selectedHackathonId ||
        !hackathons.some((entry) => entry.id === selectedHackathonId)
      ) {
        selectedHackathonId = hackathons[0]?.id || null;
      }

      syncHackathonEditor();
      syncSelectedTeam();
    } catch (err) {
      dashboardError =
        err instanceof Error
          ? err.message
          : "Unable to load the web admin dashboard right now.";
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  onMount(() => {
    void loadDashboard();

    const intervalId = window.setInterval(() => {
      void loadDashboard({ silent: true });
    }, 20_000);

    return () => {
      window.clearInterval(intervalId);
    };
  });

  async function handleCreateHackathon(event: SubmitEvent) {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    creatingHackathon = true;
    actionError = "";
    actionMessage = "";

    try {
      const created = await createHackathon(currentUser, newHackathon);
      newHackathon = defaultHackathonDraft();
      selectedHackathonId = created.record.id;
      actionMessage = `Created "${created.record.name}" on the web dashboard.`;
      if (created.warning) {
        hackathonWarning = created.warning;
      }
      await loadDashboard({ silent: true });
      syncHackathonEditor();
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to create the hackathon.";
    } finally {
      creatingHackathon = false;
    }
  }

  async function handleSaveHackathon() {
    if (!currentUser || !hackathonEditor) {
      return;
    }

    savingHackathon = true;
    actionError = "";
    actionMessage = "";

    try {
      const updated = await updateHackathon(currentUser, hackathonEditor);
      selectedHackathonId = updated.record.id;
      actionMessage = `Saved "${updated.record.name}" in the web admin panel.`;
      if (updated.warning) {
        hackathonWarning = updated.warning;
      }
      await loadDashboard({ silent: true });
      syncHackathonEditor();
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to save the hackathon.";
    } finally {
      savingHackathon = false;
    }
  }

  async function handleDeleteHackathon() {
    if (!hackathonEditor || deletingHackathon) {
      return;
    }

    if (!window.confirm(`Delete "${hackathonEditor.name}" from this web workspace?`)) {
      return;
    }

    deletingHackathon = true;
    actionError = "";
    actionMessage = "";

    try {
      await deleteHackathon(hackathonEditor);
      actionMessage = `Deleted "${hackathonEditor.name}".`;
      selectedHackathonId = null;
      await loadDashboard({ silent: true });
      syncHackathonEditor();
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to delete the hackathon.";
    } finally {
      deletingHackathon = false;
    }
  }

  async function handleTogglePlatformSetting(
    type: "internet" | "workspace",
    value: boolean,
  ) {
    togglingSetting = type;
    actionError = "";
    actionMessage = "";

    try {
      await updateGlobalPlatformSetting(
        type === "internet" ? "blockInternetAccess" : "blockNonEmptyWorkspace",
        value,
      );

      snapshot = {
        ...snapshot,
        settings: {
          ...snapshot.settings,
          [type === "internet" ? "blockInternetAccess" : "blockNonEmptyWorkspace"]:
            value,
        },
      };

      actionMessage =
        type === "internet"
          ? `Updated live internet restriction to ${value ? "blocked" : "allowed"}.`
          : `Updated live workspace policy to ${value ? "empty-only" : "allow existing files"}.`;
    } catch (err) {
      actionError =
        err instanceof Error
          ? err.message
          : "Unable to update the live platform setting.";
    } finally {
      togglingSetting = null;
    }
  }

  async function handleApplyHackathonSettings() {
    if (!hackathonEditor) {
      return;
    }

    syncingSettings = true;
    actionError = "";
    actionMessage = "";

    try {
      await applyHackathonSettingsToPlatform(hackathonEditor.settings);
      snapshot = {
        ...snapshot,
        settings: {
          blockInternetAccess: hackathonEditor.settings.blockInternetAccess,
          blockNonEmptyWorkspace: hackathonEditor.settings.blockNonEmptyWorkspace,
        },
      };
      actionMessage = `Applied "${hackathonEditor.name}" restriction defaults to the current live editor platform.`;
    } catch (err) {
      actionError =
        err instanceof Error
          ? err.message
          : "Unable to apply hackathon settings to the live platform.";
    } finally {
      syncingSettings = false;
    }
  }

  async function handleFlushLogs() {
    if (!window.confirm("Flush all activity logs from the current shared platform data?")) {
      return;
    }

    flushingLogs = true;
    actionError = "";
    actionMessage = "";

    try {
      await flushActivityLogs();
      actionMessage = "Flushed the shared activity logs used by the current editor admin flow.";
      await loadDashboard({ silent: true });
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to flush activity logs.";
    } finally {
      flushingLogs = false;
    }
  }

  async function handlePasswordUpdate(event: SubmitEvent) {
    event.preventDefault();
    updatingPassword = true;
    actionError = "";
    actionMessage = "";

    try {
      if (passwordForm.nextPassword.length < 8) {
        throw new Error("Use at least 8 characters for the new password.");
      }

      if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
        throw new Error("New passwords do not match.");
      }

      await changeCurrentPassword({
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.nextPassword,
      });

      passwordForm = {
        currentPassword: "",
        nextPassword: "",
        confirmPassword: "",
      };
      actionMessage = "Updated your account password.";
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to update the password.";
    } finally {
      updatingPassword = false;
    }
  }

  async function handleSignOut() {
    await signOut();
    await goto("/admin/signin");
  }
</script>

<svelte:head>
  <title>Admin Dashboard | Sonar IDE</title>
  <meta
    name="description"
    content="Manage hackathons, monitoring, analytics, and migrated admin functionality from the Sonar web app."
  />
</svelte:head>

{#if loading}
  <section id="overview" class="flex min-h-[72vh] items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="rounded-xl border border-zinc-200 bg-white px-8 py-10 text-center shadow-sm  dark:border-zinc-800 dark:bg-zinc-900/50">
      <LoaderCircle size={32} class="mx-auto animate-spin text-indigo-600 dark:text-indigo-300" />
      <h1 class="mt-4 text-3xl font-bold text-zinc-900 dark:text-white">Loading admin workspace</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        We’re assembling your host dashboard, hackathons, and the migrated monitoring panels.
      </p>
    </div>
  </section>
{:else}
  <section id="overview" class="relative p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm  dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <p class="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-700 dark:text-indigo-300">
              Web Admin
            </p>
            <h1 class="mt-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
              Host dashboard for hackathons and admin controls
            </h1>
            <p class="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">
              Signed in as <span class="font-semibold text-zinc-900 dark:text-white">{currentUser?.name}</span>.
              This dashboard is already shaped for the web-first admin move: host accounts, multiple hackathons, shared monitoring visibility, and live platform settings.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onclick={() => loadDashboard({ silent: true })}
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-indigo-400 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:text-indigo-200"
            >
              {#if refreshing}
                <LoaderCircle size={18} class="animate-spin" />
              {:else}
                <RefreshCw size={18} />
              {/if}
              Refresh Data
            </button>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <div class="rounded-full border border-indigo-300/40 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 dark:border-zinc-800 dark:bg-indigo-500/10 dark:text-indigo-200">
            {platformAccessLabel()}
          </div>
          <div class="rounded-full border border-zinc-300/60 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Hackathons stored in {hackathonSource === "appwrite" ? "Appwrite" : "local browser storage"}
          </div>
          {#if currentUser}
            <div class="rounded-full border border-zinc-300/60 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Role: {currentUser.role}
            </div>
          {/if}
        </div>
      </div>

      {#if dashboardError}
        <div class="rounded-xl border border-rose-300/60 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
          {dashboardError}
        </div>
      {/if}

      {#if hackathonWarning}
        <div class="rounded-xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
          {hackathonWarning}
        </div>
      {/if}

      {#if snapshot.warnings.length}
        <div class="rounded-xl border border-amber-300/60 bg-amber-50 px-5 py-4 dark:border-amber-400/25 dark:bg-amber-500/10">
          <div class="flex items-start gap-3">
            <AlertTriangle size={18} class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div class="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              {#each snapshot.warnings as warning}
                <p>{warning}</p>
              {/each}
              <p>
                Teams that sign in through the updated code editor now send their hackathon ID with telemetry. Older sessions without that field may still appear outside event-specific filtering until they reconnect.
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if actionMessage}
        <div class="rounded-xl border border-emerald-300/60 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
          {actionMessage}
        </div>
      {/if}

      {#if actionError}
        <div class="rounded-xl border border-rose-300/60 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
          {actionError}
        </div>
      {/if}

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">Hosted hackathons</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{hackathons.length}</p>
            </div>
            <Layers3 size={24} class="text-indigo-600 dark:text-indigo-300" />
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">Live teams</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {filteredTeams().filter((entry) => entry.status === "online").length}
              </p>
            </div>
            <Activity size={24} class="text-indigo-600 dark:text-indigo-300" />
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">Flagged teams</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {filteredTeams().filter((entry) => entry.risk.level !== "LOW").length}
              </p>
            </div>
            <Flag size={24} class="text-indigo-600 dark:text-indigo-300" />
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">Saved reports</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{filteredReports().length}</p>
            </div>
            <FileText size={24} class="text-indigo-600 dark:text-indigo-300" />
          </div>
        </div>
      </div>

      <div id="hackathons" class="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] scroll-mt-24">
        <div class="space-y-6">
          <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                  New Hackathon
                </p>
                <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                  Create an event workspace
                </h2>
              </div>
              <Sparkles size={22} class="text-indigo-600 dark:text-indigo-300" />
            </div>

            <form class="mt-6 space-y-4" onsubmit={handleCreateHackathon}>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Hackathon ID</span>
                  <input
                    bind:value={newHackathon.hackathonId}
                    type="text"
                    required
                    placeholder="national-finals-2026"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                  />
                  <span class="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                    Participants use this ID in Sonar Code Editor to register and sign in.
                  </span>
                </label>

                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Name</span>
                  <input
                    bind:value={newHackathon.name}
                    type="text"
                    required
                    placeholder="National Finals 2026"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                  />
                </label>

                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Status</span>
                  <select
                    bind:value={newHackathon.status}
                    class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                  >
                    <option value="draft">Draft</option>
                    <option value="live">Live</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Description</span>
                <textarea
                  bind:value={newHackathon.description}
                  rows="3"
                  placeholder="Brief notes for organizers, judges, or proctors"
                  class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                ></textarea>
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Start</span>
                  <input
                    bind:value={newHackathon.startDate}
                    type="datetime-local"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                  />
                </label>

                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">End</span>
                  <input
                    bind:value={newHackathon.endDate}
                    type="datetime-local"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                  />
                </label>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-white/4">
                  <span>
                    <span class="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Block internet</span>
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">Saved as hackathon default</span>
                  </span>
                  <input bind:checked={newHackathon.settings.blockInternetAccess} type="checkbox" class="h-5 w-5 accent-indigo-600" />
                </label>

                <label class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-white/4">
                  <span>
                    <span class="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Require empty workspace</span>
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">Saved as hackathon default</span>
                  </span>
                  <input bind:checked={newHackathon.settings.blockNonEmptyWorkspace} type="checkbox" class="h-5 w-5 accent-indigo-600" />
                </label>
              </div>

              <button
                type="submit"
                class="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-linear-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={creatingHackathon}
              >
                {#if creatingHackathon}
                  <LoaderCircle size={18} class="animate-spin" />
                  Creating hackathon
                {:else}
                  <Plus size={18} />
                  Create hackathon
                {/if}
              </button>
            </form>
          </div>

          <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                  Hosted Events
                </p>
                <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                  Your hackathons
                </h2>
              </div>
              <Layers3 size={22} class="text-indigo-600 dark:text-indigo-300" />
            </div>

            <div class="mt-6 space-y-3">
              {#if hackathons.length}
                {#each hackathons as entry}
                  <button
                    type="button"
                    onclick={() => {
                      selectedHackathonId = entry.id;
                      syncHackathonEditor();
                    }}
                    class={`w-full rounded-lg border px-4 py-4 text-left transition-colors ${
                      selectedHackathonId === entry.id
                        ? "border-indigo-400/60 bg-indigo-50 dark:border-zinc-200 dark:bg-indigo-500/10"
                        : "border-zinc-200 bg-white hover:border-indigo-300 dark:border-zinc-700 dark:bg-white/4 dark:hover:border-indigo-300/25"
                    }`}
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="text-base font-semibold text-zinc-900 dark:text-zinc-100">{entry.name}</p>
                        <p class="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">
                          ID: {entry.hackathonId}
                        </p>
                        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {entry.description || "No description yet."}
                        </p>
                      </div>
                      <span class={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        entry.status === "live"
                          ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : entry.status === "archived"
                            ? "border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            : "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200"
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Start: {entry.startDate ? formatDateTime(entry.startDate) : "TBD"}</span>
                      <span>End: {entry.endDate ? formatDateTime(entry.endDate) : "TBD"}</span>
                    </div>
                  </button>
                {/each}
              {:else}
                <div class="rounded-lg border border-dashed border-zinc-300/80 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No hackathons yet. Create the first event to start shaping the web-first admin flow.
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                  Selected Hackathon
                </p>
                <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                  Event settings and live handoff
                </h2>
              </div>
              <ShieldCheck size={22} class="text-indigo-600 dark:text-indigo-300" />
            </div>

            {#if hackathonEditor}
              <div class="mt-6 space-y-4">
                <div class="grid gap-4 md:grid-cols-2">
                  <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Hackathon ID</span>
                    <input
                      bind:value={hackathonEditor.hackathonId}
                      type="text"
                      class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                    />
                    <span class="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                      Share this ID with participants for registration and sign-in.
                    </span>
                  </label>

                  <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Name</span>
                    <input
                      bind:value={hackathonEditor.name}
                      type="text"
                      class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                    />
                  </label>

                  <label class="block md:col-span-2">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Status</span>
                    <select
                      bind:value={hackathonEditor.status}
                      class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                    >
                      <option value="draft">Draft</option>
                      <option value="live">Live</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                </div>

                <label class="block">
                  <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Description</span>
                  <textarea
                    bind:value={hackathonEditor.description}
                    rows="3"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                  ></textarea>
                </label>

                <div class="grid gap-4 md:grid-cols-2">
                  <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Start</span>
                    <input
                      bind:value={hackathonEditor.startDate}
                      type="datetime-local"
                      class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                    />
                  </label>

                  <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">End</span>
                    <input
                      bind:value={hackathonEditor.endDate}
                      type="datetime-local"
                      class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                    />
                  </label>
                </div>

                <div class="grid gap-3 lg:grid-cols-3">
                  <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Accent color</span>
                    <input
                      bind:value={hackathonEditor.settings.accentColor}
                      type="color"
                      class="h-12 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-700 dark:bg-white/4"
                    />
                  </label>

                  <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Editor theme</span>
                    <select
                      bind:value={hackathonEditor.settings.editorTheme}
                      class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>

                  <label class="block">
                    <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Analytics visibility</span>
                    <select
                      bind:value={hackathonEditor.settings.analyticsVisibility}
                      class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                    >
                      <option value="hosts">Hosts</option>
                      <option value="organizers">Organizers</option>
                      <option value="readonly">Read only</option>
                    </select>
                  </label>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <label class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-white/4">
                    <span>
                      <span class="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Block internet</span>
                      <span class="text-xs text-zinc-500 dark:text-zinc-400">Hackathon default</span>
                    </span>
                    <input bind:checked={hackathonEditor.settings.blockInternetAccess} type="checkbox" class="h-5 w-5 accent-indigo-600" />
                  </label>

                  <label class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-white/4">
                    <span>
                      <span class="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Require empty workspace</span>
                      <span class="text-xs text-zinc-500 dark:text-zinc-400">Hackathon default</span>
                    </span>
                    <input bind:checked={hackathonEditor.settings.blockNonEmptyWorkspace} type="checkbox" class="h-5 w-5 accent-indigo-600" />
                  </label>
                </div>

                <div class="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onclick={handleSaveHackathon}
                    class="inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={savingHackathon}
                  >
                    {#if savingHackathon}
                      <LoaderCircle size={18} class="animate-spin" />
                    {:else}
                      <Save size={18} />
                    {/if}
                    Save event
                  </button>

                  <button
                    type="button"
                    onclick={handleApplyHackathonSettings}
                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:text-indigo-200"
                    disabled={syncingSettings || !snapshot.capabilities.canManagePlatform}
                  >
                    {#if syncingSettings}
                      <LoaderCircle size={18} class="animate-spin" />
                    {:else}
                      <ShieldCheck size={18} />
                    {/if}
                    Apply restrictions live
                  </button>

                  <button
                    type="button"
                    onclick={handleDeleteHackathon}
                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300/45 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                    disabled={deletingHackathon}
                  >
                    {#if deletingHackathon}
                      <LoaderCircle size={18} class="animate-spin" />
                    {:else}
                      <Trash2 size={18} />
                    {/if}
                    Delete event
                  </button>
                </div>
              </div>
            {:else}
              <div class="mt-6 rounded-lg border border-dashed border-zinc-300/80 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Select a hackathon to edit its web-side settings and optionally push the restriction defaults to the current shared editor platform.
              </div>
            {/if}
          </div>

          <div id="settings" class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 scroll-mt-24">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                  Live Platform Controls
                </p>
                <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                  Current shared editor state
                </h2>
              </div>
              <Radar size={22} class="text-indigo-600 dark:text-indigo-300" />
            </div>

            <div class="mt-6 grid gap-4 lg:grid-cols-2">
              <label class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-white/4">
                <span>
                  <span class="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Internet access</span>
                  <span class="text-xs text-zinc-500 dark:text-zinc-400">Current live editor policy</span>
                </span>
                <button
                  type="button"
                  onclick={() =>
                    handleTogglePlatformSetting(
                      "internet",
                      !snapshot.settings.blockInternetAccess,
                    )}
                  class={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                    snapshot.settings.blockInternetAccess
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                  disabled={!snapshot.capabilities.canManagePlatform || togglingSetting !== null}
                >
                  {#if togglingSetting === "internet"}
                    Updating
                  {:else if snapshot.settings.blockInternetAccess}
                    Blocked
                  {:else}
                    Allowed
                  {/if}
                </button>
              </label>

              <label class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-white/4">
                <span>
                  <span class="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Workspace policy</span>
                  <span class="text-xs text-zinc-500 dark:text-zinc-400">Current live editor policy</span>
                </span>
                <button
                  type="button"
                  onclick={() =>
                    handleTogglePlatformSetting(
                      "workspace",
                      !snapshot.settings.blockNonEmptyWorkspace,
                    )}
                  class={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                    snapshot.settings.blockNonEmptyWorkspace
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-700 text-white dark:bg-zinc-200 dark:text-zinc-900"
                  }`}
                  disabled={!snapshot.capabilities.canManagePlatform || togglingSetting !== null}
                >
                  {#if togglingSetting === "workspace"}
                    Updating
                  {:else if snapshot.settings.blockNonEmptyWorkspace}
                    Empty only
                  {:else}
                    Existing okay
                  {/if}
                </button>
              </label>
            </div>

            <button
              type="button"
              onclick={handleFlushLogs}
              class="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300/45 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
              disabled={!snapshot.capabilities.canManagePlatform || flushingLogs}
            >
              {#if flushingLogs}
                <LoaderCircle size={18} class="animate-spin" />
              {:else}
                <WifiOff size={18} />
              {/if}
              Flush shared activity logs
            </button>
          </div>
        </div>
      </div>

      <div id="monitoring" class="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] scroll-mt-24">
        <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                Team Monitoring
              </p>
              <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                Current editor sessions
              </h2>
            </div>

            <div class="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-white/4">
              <Search size={18} class="text-zinc-400" />
              <input
                bind:value={search}
                type="text"
                placeholder="Search team, hackathon ID, file, or window"
                class="w-64 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                oninput={syncSelectedTeam}
              />
            </div>
          </div>

          <div class="mt-6 overflow-x-auto">
            <table class="min-w-full text-left">
              <thead>
                <tr class="border-b border-zinc-200 dark:border-zinc-700">
                  <th class="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Team</th>
                  <th class="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Status</th>
                  <th class="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Last seen</th>
                  <th class="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Current file</th>
                  <th class="px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Risk</th>
                </tr>
              </thead>
              <tbody>
                {#if filteredTeams().length}
                  {#each filteredTeams() as entry}
                    <tr
                      class={`cursor-pointer border-b border-zinc-100 transition-colors hover:bg-indigo-50/80 dark:border-white/5 dark:hover:bg-white/4 ${
                        selectedTeamId === entry.teamId ? "bg-indigo-50 dark:bg-indigo-500/10" : ""
                      }`}
                      onclick={() => {
                        selectedTeamId = entry.teamId;
                      }}
                    >
                      <td class="px-3 py-4">
                        <div>
                          <p class="font-semibold text-zinc-900 dark:text-zinc-100">{entry.teamName}</p>
                          {#if entry.hackathonId}
                            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300">
                              {entry.hackathonId}
                            </p>
                          {/if}
                          <p class="text-xs text-zinc-500 dark:text-zinc-400">{entry.teamId}</p>
                        </div>
                      </td>
                      <td class="px-3 py-4">
                        <span class={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(entry.status)}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td class="px-3 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(entry.lastSeen)}
                      </td>
                      <td class="px-3 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {entry.currentFile || "Not reported"}
                      </td>
                      <td class="px-3 py-4">
                        <span class={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${riskTone(entry.risk.level)}`}>
                          {entry.risk.level} {entry.risk.score}
                        </span>
                      </td>
                    </tr>
                  {/each}
                {:else}
                  <tr>
                    <td colspan="5" class="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No session data available yet for this account.
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                Analytics
              </p>
              <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                Team detail view
              </h2>
            </div>
            <BarChart3 size={22} class="text-indigo-600 dark:text-indigo-300" />
          </div>

          {#if selectedTeam()}
            {@const activeTeam = selectedTeam()!}
            <div class="mt-6 space-y-5">
              <div>
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-xl font-bold text-zinc-900 dark:text-white">{activeTeam.teamName}</h3>
                  <span class={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(activeTeam.status)}`}>
                    {activeTeam.status}
                  </span>
                  <span class={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${riskTone(activeTeam.risk.level)}`}>
                    {activeTeam.risk.level} risk
                  </span>
                </div>
                <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Last seen {formatDateTime(activeTeam.lastSeen)}
                </p>
                {#if activeTeam.hackathonId}
                  <p class="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300">
                    Hackathon ID: {activeTeam.hackathonId}
                  </p>
                {/if}
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">IDE focus</p>
                  <p class="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                    {activeTeam.reportData.summary.percentInIDE}%
                  </p>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">Online coverage</p>
                  <p class="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                    {activeTeam.reportData.summary.percentOnline}%
                  </p>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">App switches</p>
                  <p class="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                    {activeTeam.risk.appBlurCount}
                  </p>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">External pastes</p>
                  <p class="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                    {activeTeam.risk.extPasteCount}
                  </p>
                </div>
              </div>

              <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Risk flags</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  {#if activeTeam.risk.flags.length}
                    {#each activeTeam.risk.flags as flag}
                      <span class={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone(activeTeam.risk.level)}`}>
                        {flag}
                      </span>
                    {/each}
                  {:else}
                    <span class="text-sm text-zinc-500 dark:text-zinc-400">No elevated risk flags detected from the latest telemetry snapshot.</span>
                  {/if}
                </div>
              </div>

              <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top applications</p>
                <div class="mt-3 space-y-2">
                  {#if activeTeam.reportData.appUsage.length}
                    {#each activeTeam.reportData.appUsage.slice(0, 5) as app}
                      <div class="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 dark:border-white/5">
                        <span class="text-sm text-zinc-700 dark:text-zinc-200">{app.appName}</span>
                        <span class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          {formatDuration(app.totalTime)}
                        </span>
                      </div>
                    {/each}
                  {:else}
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">No application usage summary is available yet.</p>
                  {/if}
                </div>
              </div>

              <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent activity events</p>
                <div class="mt-3 space-y-2">
                  {#if (activeTeam.syncData.activityEvents || []).length}
                    {#each [...(activeTeam.syncData.activityEvents || [])].slice(-6).reverse() as event}
                      <div class="rounded-xl border border-zinc-100 px-3 py-3 dark:border-white/5">
                        <div class="flex items-center justify-between gap-4">
                          <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatEventType(event.type)}
                          </p>
                          <p class="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDateTime(event.timestamp)}
                          </p>
                        </div>
                        {#if event.details}
                          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{event.details}</p>
                        {/if}
                      </div>
                    {/each}
                  {:else}
                    <p class="text-sm text-zinc-500 dark:text-zinc-400">No event timeline is available from the latest snapshot.</p>
                  {/if}
                </div>
              </div>
            </div>
          {:else}
            <div class="mt-6 rounded-lg border border-dashed border-zinc-300/80 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Select a team from the monitoring table to inspect analytics and risk signals.
            </div>
          {/if}
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                Saved Reports
              </p>
              <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                Existing report artifacts
              </h2>
            </div>
            <FileText size={22} class="text-indigo-600 dark:text-indigo-300" />
          </div>

          <div class="mt-6 space-y-3">
            {#if filteredReports().length}
              {#each filteredReports().slice(0, 8) as report}
                <div class="rounded-lg border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-white/4">
                  <div class="flex items-center justify-between gap-4">
                    <div>
                      <p class="font-semibold text-zinc-900 dark:text-zinc-100">{report.teamName}</p>
                      {#if report.hackathonId}
                        <p class="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300">
                          {report.hackathonId}
                        </p>
                      {/if}
                      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Generated {formatDateTime(report.generatedAt)}
                      </p>
                    </div>
                    <div class="text-right text-xs text-zinc-500 dark:text-zinc-400">
                      <p>Start: {report.sessionStart ? formatDateTime(report.sessionStart) : "N/A"}</p>
                      <p>End: {report.sessionEnd ? formatDateTime(report.sessionEnd) : "N/A"}</p>
                    </div>
                  </div>
                </div>
              {/each}
            {:else}
              <div class="rounded-lg border border-dashed border-zinc-300/80 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No saved reports are visible yet from the shared editor platform.
              </div>
            {/if}
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
                Account
              </p>
              <h2 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
                Password and host profile
              </h2>
            </div>
            <KeyRound size={22} class="text-indigo-600 dark:text-indigo-300" />
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
              <p class="text-sm text-zinc-500 dark:text-zinc-400">Signed in as</p>
              <p class="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">{currentUser?.name}</p>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">{currentUser?.email}</p>
            </div>

            <div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white/4">
              <p class="text-sm text-zinc-500 dark:text-zinc-400">Access mode</p>
              <p class="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">{platformAccessLabel()}</p>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">
                Hackathon IDs now connect the web admin dashboard and code editor team flows. Older legacy sessions may still appear without an event ID until those clients reconnect.
              </p>
            </div>
          </div>

          <form class="mt-6 space-y-4" onsubmit={handlePasswordUpdate}>
            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Current password</span>
              <input
                bind:value={passwordForm.currentPassword}
                type="password"
                required
                autocomplete="current-password"
                class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
              />
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">New password</span>
                <input
                  bind:value={passwordForm.nextPassword}
                  type="password"
                  required
                  autocomplete="new-password"
                  class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Confirm new password</span>
                <input
                  bind:value={passwordForm.confirmPassword}
                  type="password"
                  required
                  autocomplete="new-password"
                  class="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 dark:border-zinc-700 dark:bg-white/4 dark:text-zinc-100"
                />
              </label>
            </div>

            <button
              type="submit"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={updatingPassword}
            >
              {#if updatingPassword}
                <LoaderCircle size={18} class="animate-spin" />
              {:else}
                <ShieldAlert size={18} />
              {/if}
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  </section>
{/if}
