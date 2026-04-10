<script lang="ts">
  import Chart from "$lib/components/admin/Chart.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    Activity,
    Clock3,
    HardDrive,
    Layers3,
    RefreshCw,
    ShieldAlert,
    Users,
    LoaderCircle,
  } from "lucide-svelte";
  import { loadAdminSnapshot } from "$lib/admin/api";
  import { refreshSession, resolveAuthenticatedRoute } from "$lib/admin/auth";
  import type { AdminSnapshot, HostAccount } from "$lib/admin/types";

  let currentUser = $state<HostAccount | null>(null);
  let snapshot = $state<AdminSnapshot>({
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
  });

  let loading = $state(true);
  let refreshing = $state(false);
  let lastRefreshedAt = $state<Date | null>(null);
  let dashboardError = $state("");

  function getRiskStats() {
    const teams = snapshot.monitors;
    const total = teams.length || 1;
    const low = teams.filter((t) => t.risk.level === "LOW").length;
    const medium = teams.filter((t) => t.risk.level === "MEDIUM").length;
    const high = teams.filter((t) => t.risk.level === "HIGH").length;
    return { low, medium, high, total };
  }

  function getTopApps() {
    const map = new Map();
    snapshot.monitors.forEach((t) => {
      if (!t.syncData?.apps) return;
      Object.entries(t.syncData.apps).forEach(([appName, time]) => {
        map.set(appName, (map.get(appName) || 0) + time);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

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
      snapshot = await loadAdminSnapshot();
    } catch (err) {
      dashboardError = err instanceof Error ? err.message : "Unable to load dashboard data.";
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
</script>

<svelte:head>
  <title>Admin Dashboard | Sonar IDE</title>
</svelte:head>

{#if loading}
  <section class="flex min-h-[50vh] items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="flex flex-col items-center gap-4 text-center">
      <LoaderCircle size={28} class="animate-spin text-indigo-600 dark:text-indigo-400" />
      <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading overview...</p>
    </div>
  </section>
{:else}
  <section class="max-w-6xl mx-auto w-full flex flex-col gap-6 p-4 pb-20 sm:p-6 lg:p-8">
    <!-- Page Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">Overview</h2>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Aggregated monitoring and active host usage.</p>
      </div>
      <div class="flex items-center gap-3">
        {#if lastRefreshedAt}
          <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Clock3 size={14} />
            <span>Updated {lastRefreshedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
          </div>
        {/if}
        <button
          type="button"
          onclick={() => loadDashboard({ silent: true })}
          disabled={refreshing}
          class="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          <RefreshCw size={14} class={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>

    {#if dashboardError}
      <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
        {dashboardError}
      </div>
    {/if}

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
      <div class="flex flex-col">
        <div class="flex items-center gap-2 mb-3">
          <Users size={16} class="text-emerald-500" />
          <span class="text-sm font-medium text-zinc-500">Live Teams</span>
        </div>
        <div class="text-4xl font-semibold tracking-tight text-zinc-900">
          {snapshot.monitors.filter((t) => t.status === "online").length}
        </div>
      </div>
      
      <div class="flex flex-col border-l border-zinc-200 pl-8">
        <div class="flex items-center gap-2 mb-3">
          <Layers3 size={16} class="text-indigo-500" />
          <span class="text-sm font-medium text-zinc-500">Total Teams</span>
        </div>
        <div class="text-4xl font-semibold tracking-tight text-zinc-900">
          {snapshot.monitors.length}
        </div>
      </div>

      <div class="flex flex-col border-l border-zinc-200 pl-8">
         <div class="flex items-center gap-2 mb-3">
          <HardDrive size={16} class="text-rose-500" />
          <span class="text-sm font-medium text-zinc-500">Analysis Reports</span>
        </div>
        <div class="text-4xl font-semibold tracking-tight text-zinc-900">
          {snapshot.reports.length}
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
      <div class="flex flex-col">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-base font-semibold text-zinc-900">Risk Distribution</h3>
          <ShieldAlert size={16} class="text-zinc-400" />
        </div>
        <div class="h-[280px]">
          <Chart type="doughnut" data={riskChartData} options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }} />
        </div>
      </div>

      <div class="flex flex-col">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-base font-semibold text-zinc-900">Top Applications Usage</h3>
          <Activity size={16} class="text-zinc-400" />
        </div>
        {#if getTopApps().length > 0}
          <div class="h-[280px]">
            <Chart type="bar" data={appsChartData} options={{ 
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, grid: { color: '#f4f4f5' }, border: { display: false }, ticks: { maxTicksLimit: 6 } }
              }
            }} />
          </div>
        {:else}
          <div class="flex h-[280px] flex-col items-center justify-center gap-2 border-y border-zinc-200 bg-transparent">
            <span class="text-sm text-zinc-500">No application telemetry captured.</span>
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}