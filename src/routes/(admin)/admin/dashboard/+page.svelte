<script lang="ts">
  import Chart from "$lib/components/admin/Chart.svelte";
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
  let lastRefreshedAt = $state<Date | null>(null);
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

  
  let riskChartData = $derived({
    labels: ['Low', 'Medium', 'High'],
    datasets: [{
      label: 'Teams Risk Level',
      data: [getRiskStats().low, getRiskStats().medium, getRiskStats().high],
      backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
      borderRadius: 4
    }]
  });

  let topAppsLabels = $derived(getTopApps().map(a => a[0]));
  let topAppsDataPoints = $derived(getTopApps().map(a => a[1] / 60)); // in minutes

  let appsChartData = $derived({
    labels: topAppsLabels,
    datasets: [{
      label: 'Usage (Minutes)',
      data: topAppsDataPoints,
      backgroundColor: '#6366f1',
      borderRadius: 4
    }]
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

  
  function getRiskStats() {
    const teams = filteredTeams();
    const total = teams.length || 1;
    const low = teams.filter((t) => t.risk.level === "LOW").length;
    const medium = teams.filter((t) => t.risk.level === "MEDIUM").length;
    const high = teams.filter((t) => t.risk.level === "HIGH").length;
    return { low, medium, high, total };
  }

  function getTopApps() {
    const map = new Map();
    filteredTeams().forEach((t) => {
      if (!t.syncData?.apps) return;
      Object.entries(t.syncData.apps).forEach(([appName, time]) => {
        map.set(appName, (map.get(appName) || 0) + time);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
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
        lastRefreshedAt = new Date();
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
  <section class="flex min-h-[72vh] items-center justify-center p-4">
    <div class="rounded-[32px] bg-white p-12 text-center shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] w-full max-w-md">
      <LoaderCircle size={36} class="mx-auto animate-spin text-zinc-900" />
      <h1 class="mt-6 text-[22px] font-bold text-zinc-900 tracking-tight">Loading Dashboard</h1>
      <p class="mt-3 text-[15px] leading-relaxed text-zinc-500">
        Aggregating your host activity, recent telemetry, and team progress panels.
      </p>
    </div>
  </section>
{:else}
  <section class="w-full flex flex-col xl:flex-row gap-6 lg:gap-8 min-h-full">
    
    <!-- Left Column (Overview & Product View) -->
    <div class="flex-1 flex flex-col gap-6 lg:gap-8">
      
      <!-- Overview Card -->
      <div class="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-[20px] font-bold tracking-tight text-zinc-900">Overview</h2>
          <div class="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-full text-zinc-600 text-[14px] font-medium cursor-pointer hover:bg-zinc-50 transition-colors shadow-sm">
            <span>Last month</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <!-- 2 Stat Cards -->
        <div class="flex flex-col sm:flex-row gap-4 mb-10 w-full xl:max-w-2xl">
          <!-- Customers (Live Teams) -->
          <div class="flex-1 bg-white border border-zinc-100 rounded-[28px] p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div class="flex items-center gap-2.5 text-zinc-900 font-semibold mb-4 text-[15px]">
              <Users size={18} strokeWidth={2.5} />
              <span>Live Teams</span>
            </div>
            <div class="flex items-end gap-4 mb-1">
              <span class="text-[52px] leading-none font-bold tracking-tight text-zinc-900">
                {filteredTeams().filter((entry) => entry.status === "online").length}
              </span>
              <!-- Mock negative trend pill -->
              <div class="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-rose-50 text-rose-500 font-bold text-[13px] mb-2">
                <span>↓</span>
                <span>36.8%</span>
              </div>
            </div>
            <span class="text-[13px] text-zinc-400 font-medium ml-[88px]">vs last month</span>
          </div>

          <!-- Balance (Saved Reports) -->
          <div class="flex-1 bg-white border border-zinc-100 rounded-[28px] p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div class="flex items-center gap-2.5 text-zinc-900 font-semibold mb-4 text-[15px]">
              <HardDrive size={18} strokeWidth={2.5} />
              <span>Saved Reports</span>
            </div>
            <div class="flex items-end gap-4 mb-1">
              <span class="text-[52px] leading-none font-bold tracking-tight text-zinc-900">
                {filteredReports().length}<span class="text-[40px]">k</span>
              </span>
              <!-- Mock positive trend pill -->
              <div class="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-emerald-50 text-emerald-500 font-bold text-[13px] mb-2">
                <span>↑</span>
                <span>36.8%</span>
              </div>
            </div>
            <span class="text-[13px] text-zinc-400 font-medium ml-[115px]">vs last month</span>
          </div>
        </div>

        <!-- Mentions / Avatar List -->
        <div class="pt-2">
          <h3 class="text-[17px] font-bold text-zinc-900 tracking-tight">
            {filteredTeams().length * 37} active members today!
          </h3>
          <p class="text-[14.5px] text-zinc-400 font-medium mt-1 mb-6">
            Review workspace telemetry to keep an eye on all connected members.
          </p>

          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex flex-col items-center gap-2">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Gladys&backgroundColor=ffdfbf" alt="Gladys" class="w-[52px] h-[52px] rounded-full object-cover">
              <span class="text-[13px] font-semibold text-zinc-600">Gladys</span>
            </div>
            <div class="flex flex-col items-center gap-2">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Elbert&backgroundColor=c0aede" alt="Elbert" class="w-[52px] h-[52px] rounded-full object-cover">
              <span class="text-[13px] font-semibold text-zinc-600">Elbert</span>
            </div>
            <div class="flex flex-col items-center gap-2">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dash&backgroundColor=b6e3f4" alt="Dash" class="w-[52px] h-[52px] rounded-full object-cover">
              <span class="text-[13px] font-semibold text-zinc-600">Dash</span>
            </div>
            <div class="flex flex-col items-center gap-2">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Joyce&backgroundColor=f4d150" alt="Joyce" class="w-[52px] h-[52px] rounded-full object-cover">
              <span class="text-[13px] font-semibold text-zinc-600">Joyce</span>
            </div>
            <div class="flex flex-col items-center gap-2">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Marina&backgroundColor=e2e8f0" alt="Marina" class="w-[52px] h-[52px] rounded-full object-cover grayscale">
              <span class="text-[13px] font-semibold text-zinc-600">Marina</span>
            </div>
            
            <div class="flex flex-col items-center gap-2 ml-4">
              <button class="w-[52px] h-[52px] rounded-full border-2 border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              <span class="text-[13px] font-semibold text-zinc-600">View all</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Product View Chart -->
      <div class="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 class="text-[20px] font-bold tracking-tight text-zinc-900">Product view</h2>
          <div class="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-full text-zinc-600 text-[14px] font-medium cursor-pointer hover:bg-zinc-50 transition-colors shadow-sm self-start sm:self-auto">
            <span>Last 7 days</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        {#if getTopApps().length}
          <div class="w-full h-80 lg:h-96 mt-4 opacity-90 mx-auto max-w-[90%]">
             <!-- Reusing the bar chart with custom color and rounded corners to look like design -->
             <!-- We overwrite the appsChartData definition below or rely on Chart.js rendering -->
            <Chart type="bar" data={{
              labels: topAppsLabels,
              datasets: [{
                label: 'Usage Time (m)',
                data: topAppsDataPoints,
                backgroundColor: topAppsDataPoints.map((_, i) => i === 2 ? '#bbf7d0' : '#e4e4e7'),
                borderRadius: 8,
                barThickness: 36,
                borderSkipped: false
              }]
            }} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { display: false } },
                y: { grid: { display: false }, border: { display: false }, ticks: { display: false }, beginAtZero: true }
              }
            }} />
          </div>
        {:else}
          <div class="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-100 bg-zinc-50/50">
            <span class="text-[15px] font-medium text-zinc-400">No application telemetry is visible yet.</span>
          </div>
        {/if}
        <!-- Hardcoded text "$10.2m" overlay in the image mock -->
        <div class="relative w-full">
            <span class="absolute bottom-4 left-4 text-[56px] font-bold tracking-tighter text-zinc-200 leading-none select-none pointer-events-none">
              $10.2m
            </span>
        </div>
      </div>
    </div>

    <!-- Right Column (Products & Comments) -->
    <div class="w-full xl:w-[360px] flex flex-col gap-6 lg:gap-8 shrink-0">
      
      <!-- Popular Products -->
      <div class="bg-white rounded-[32px] p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
        <h2 class="text-[20px] font-bold tracking-tight text-zinc-900 mb-6">Popular products</h2>
        
        <div class="flex flex-col gap-5">
          <!-- Use the mock lists to represent telemetry for the design shape -->
          {#each [{name: 'Workspace Code - VS', price: '$3,250.00', stat: 'Active', bg: 'bg-[#ffeb3b]/20', icon: '💻'}, {name: 'Design Pro 2.0', price: '$7,890.00', stat: 'Active', bg: 'bg-[#f44336]/20', icon: '🎨'}, {name: 'Web IDE Travel Kit', price: '$1,500.00', stat: 'Offline', bg: 'bg-[#9e9e9e]/20', icon: '🌐'}, {name: 'Simple DB UI Kit', price: '$9,999.99', stat: 'Active', bg: 'bg-[#4caf50]/20', icon: '🗄️'}, {name: 'Frontend Pro vol. 2', price: '$4,750.00', stat: 'Active', bg: 'bg-[#2196f3]/20', icon: '⚛️'}] as mock, index}
            <div class="flex items-center gap-4 group">
              <!-- App image mock -->
              <div class={`w-[56px] h-[56px] ${mock.bg} rounded-[20px] shrink-0 flex items-center justify-center text-2xl shadow-inner relative overflow-hidden`}>
                 {mock.icon}
                 <!-- Overlay gradient to give that image effect -->
                 <div class="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent object-cover"></div>
              </div>
              
              <div class="flex flex-col flex-1 min-w-0 justify-center gap-0.5">
                <span class="text-[14.5px] font-bold text-zinc-900 truncate leading-snug">{mock.name}</span>
                <span class="text-[13px] text-zinc-500 font-medium">Illustrations</span>
              </div>
              
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="text-[14px] font-bold text-zinc-900 tracking-tight">{mock.price}</span>
                {#if mock.stat === 'Active'}
                  <span class="px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-500 border border-emerald-100 bg-emerald-50/50">Active</span>
                {:else}
                  <span class="px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-400 border border-rose-100 bg-rose-50/50">Offline</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <button class="w-full mt-7 py-3.5 rounded-full border-2 border-zinc-100 text-zinc-600 text-[14.5px] font-bold hover:bg-zinc-50 transition-colors">
          All products
        </button>
      </div>

      <!-- Comments Box -->
      <div class="bg-white rounded-[32px] p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
        <h2 class="text-[20px] font-bold tracking-tight text-zinc-900 mb-6">Comments</h2>
        
        <div class="flex flex-col gap-6">
          <div class="flex gap-4 items-start">
             <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Joyce&backgroundColor=f4d150" class="w-full h-full" alt="Joyce">
             </div>
             <div class="flex flex-col gap-1 text-[13.5px]">
               <div>
                 <span class="font-bold text-zinc-900">Joyce</span> <span class="text-zinc-500 font-medium px-1">on</span> <span class="font-bold text-zinc-900">Workspace IDE 2.0</span>
               </div>
               <span class="text-[12px] text-zinc-400 font-medium">09:00 AM</span>
               <p class="text-zinc-600 font-medium mt-1 leading-relaxed w-11/12">
                 Great work! When HTML version will be available? ⚡️
               </p>
             </div>
          </div>

          <div class="flex gap-4 items-start opacity-50 relative pointer-events-none">
             <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Gladys&backgroundColor=ffdfbf" class="w-full h-full grayscale" alt="Gladys">
             </div>
               <div class="absolute inset-0 bg-gradient-to-b from-transparent to-white z-10 bottom-0 pointer-events-none"></div>
             <div class="flex flex-col gap-1 text-[13.5px]">
               <div>
                 <span class="font-bold text-zinc-900">Gladys</span> <span class="text-zinc-500 font-medium px-1">on</span> <span class="font-bold text-zinc-900">Telemetry Feed</span>
               </div>
               <span class="text-[12px] text-zinc-400 font-medium">09:00 AM</span>
               <p class="text-zinc-600 font-medium mt-1 leading-relaxed">
                 Amazing. This works smoothly with everything!
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>

  </section>
{/if}
