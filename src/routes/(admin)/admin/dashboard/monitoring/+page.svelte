<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import {
    Activity,
    AlertTriangle,
    BarChart3,
    FileText,
    Flag,
    Layers3,
    LoaderCircle,
    RefreshCw,
    Search,
    X,
    ArrowRightLeft,
    Clipboard
  } from "lucide-svelte";
  import type {
    HackathonRecord,
    TeamMonitor,
  } from "$lib/admin/types";
  import {
    isAuthRedirectRequiredError,
    riskTone,
    statusTone,
  } from "$lib/admin/hostDashboard";
  import Chart from "$lib/components/admin/Chart.svelte";
  import Skeleton from "$lib/components/admin/Skeleton.svelte";
  import {
    formatDateTime,
    formatDuration,
    formatEventType,
  } from "$lib/admin/analytics";
  import { adminStore } from "$lib/admin/adminStore.svelte";

  let selectedHackathonId = $state("");
  let selectedTeamId = $state<string | null>(null);
  let search = $state("");
  let isDrawerOpen = $state(false);

  let snapshot = $derived(adminStore.snapshot);
  let hackathons = $derived(adminStore.hackathons);
  let loading = $derived(adminStore.loading);
  let refreshing = $derived(adminStore.refreshing);
  let dashboardError = $derived(adminStore.error);

  function filteredTeams() {
    const query = search.trim().toLowerCase();

    return snapshot.monitors.filter((entry) => {
      if (selectedHackathonId && entry.hackathonId !== selectedHackathonId) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [entry.teamName, entry.currentFile, entry.currentWindow, entry.hackathonId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }

  function filteredReports() {
    if (!selectedHackathonId) {
      return snapshot.reports;
    }

    return snapshot.reports.filter(
      (entry) => entry.hackathonId === selectedHackathonId,
    );
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

  function selectedTeam(): TeamMonitor | null {
    const teams = filteredTeams();
    return teams.find((entry) => entry.teamId === selectedTeamId) || teams[0] || null;
  }

  function filteredCount(status: "online" | "offline") {
    return filteredTeams().filter((entry) => entry.status === status).length;
  }

  function openTeamDetail(teamId: string) {
    selectedTeamId = teamId;
    isDrawerOpen = true;
  }

  function closeDrawer() {
    isDrawerOpen = false;
  }

  async function handleRefresh() {
    try {
      await adminStore.forceRefresh();
      syncSelectedTeam();
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
      }
    }
  }

  onMount(async () => {
    try {
      await adminStore.ensure();
      if (!adminStore.currentUser) {
        await goto("/admin/signin", { replaceState: true });
        return;
      }
      syncSelectedTeam();
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
      }
    }
  });
</script>

<svelte:head>
  <title>Monitoring | Sonar</title>
  <meta
    name="description"
    content="Monitor live team sessions, review telemetry, and inspect saved report artifacts."
  />
</svelte:head>

{#if loading}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <!-- Header skeleton -->
      <div class="border-b border-zinc-200 pb-8 dark:border-zinc-800 xl:border-r-0">
        <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <Skeleton variant="text" width="200px" height="28px" />
          <Skeleton variant="text" width="100px" height="40px" />
        </div>
      </div>

      <!-- Stats skeleton -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6 border-b border-zinc-200 pb-8 dark:border-zinc-800 xl:border-r-0">
        {#each Array(4) as _}
          <Skeleton variant="card" />
        {/each}
      </div>

      <!-- Table skeleton -->
      <div class="py-4">
        <div class="flex flex-col gap-2 mb-5">
          <Skeleton variant="text" width="140px" height="12px" />
          <Skeleton variant="text" width="200px" height="20px" />
        </div>
        <Skeleton variant="table" rows={5} columns={5} />
      </div>
    </div>
  </section>
{:else}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">

      <!-- Page Header -->
      <div class="border-b border-zinc-200 pb-8 dark:border-zinc-800 xl:border-r-0">
        <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div class="max-w-3xl">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
              Monitoring
            </h1>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onclick={handleRefresh}
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {#if refreshing}
                <LoaderCircle size={16} class="animate-spin" />
              {:else}
                <RefreshCw size={16} />
              {/if}
              Refresh
            </button>
          </div>
        </div>


      </div>

      {#if dashboardError}
        <div class="border-l-2 border-rose-500 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
          {dashboardError}
        </div>
      {/if}

      {#if snapshot.warnings.length}
        <div class="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 dark:bg-amber-950/50">
          <div class="flex items-start gap-3">
            <AlertTriangle size={16} class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div class="space-y-1 text-sm font-medium text-amber-800 dark:text-amber-400">
              {#each snapshot.warnings as warning}
                <p>{warning}</p>
              {/each}
              <p>Teams that reconnect from the updated code editor will report their hackathon ID more reliably.</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Stats -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6 border-b border-zinc-200 pb-8 dark:border-zinc-800 xl:border-r-0">
        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Visible Teams</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{filteredTeams().length}</p>
            </div>
            <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <Activity size={20} class="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Online Now</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{filteredCount("online")}</p>
            </div>
            <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <Layers3 size={20} class="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Flagged Teams</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {filteredTeams().filter((entry) => entry.risk.level !== "LOW").length}
              </p>
            </div>
            <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <Flag size={20} class="text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Reports</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{filteredReports().length}</p>
            </div>
            <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <FileText size={20} class="text-zinc-600 dark:text-zinc-400" />
            </div>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid gap-6 xl:grid-cols-1">
        <!-- Team Table -->
        <div class="py-4">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Team Monitoring</p>
              <h2 class="mt-1.5 text-lg font-bold text-zinc-900 dark:text-white">Current editor sessions</h2>
            </div>

            <div class="flex flex-col gap-3 md:flex-row">
              <label class="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Event</span>
                <select
                  bind:value={selectedHackathonId}
                  class="bg-transparent text-sm text-zinc-900 outline-none dark:text-zinc-100"
                  onchange={syncSelectedTeam}
                >
                  <option value="">All events</option>
                  {#each hackathons as hackathon}
                    <option value={hackathon.hackathonId}>{hackathon.name}</option>
                  {/each}
                </select>
              </label>

              <div class="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                <Search size={15} class="text-zinc-400" />
                <input
                  bind:value={search}
                  type="text"
                  placeholder="Search team, file, or window"
                  class="w-52 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                  oninput={syncSelectedTeam}
                />
              </div>
            </div>
          </div>

          <div class="overflow-x-auto rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/50 shadow-sm">
            <table class="min-w-full text-left">
              <thead class="bg-zinc-50/80 border-b border-zinc-200 dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/80 tracking-wider font-semibold text-xs text-zinc-500 uppercase">
                <tr>
                  <th class="px-6 py-4">Team</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">Last seen</th>
                  <th class="px-6 py-4">Current file</th>
                  <th class="px-6 py-4 text-right">Risk</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                {#if filteredTeams().length}
                  {#each filteredTeams() as entry}
                    <tr
                      class={`cursor-pointer transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 ${
                        selectedTeamId === entry.teamId ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                      }`}
                      onclick={() => openTeamDetail(entry.teamId)}
                    >
                      <td class="px-6 py-4 align-top">
                        <div class="space-y-1">
                          <p class="text-sm font-bold text-zinc-900 dark:text-white">{entry.teamName}</p>
                          {#if entry.hackathonId}
                            <p class="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 pb-0.5">{entry.hackathonId}</p>
                          {/if}
                          <p class="text-xs text-zinc-400 dark:text-zinc-500">{entry.teamId}</p>
                        </div>
                      </td>
                      <td class="px-6 py-4 align-top">
                        <span class={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide inline-block mt-0.5 ${statusTone(entry.status)}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-[13px] text-zinc-500 dark:text-zinc-400 align-top pt-5">{formatDateTime(entry.lastSeen)}</td>
                      <td class="px-6 py-4 text-[13px] text-zinc-500 dark:text-zinc-400 align-top pt-5">{entry.currentFile || "Not reported"}</td>
                      <td class="px-6 py-4 align-top text-right pt-4">
                        <span class={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide inline-block ${riskTone(entry.risk.level)}`}>
                          {entry.risk.level} {entry.risk.score}
                        </span>
                      </td>
                    </tr>
                  {/each}
                {:else}
                  <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                      No session data is visible for the current filters.
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Reports -->
      <div class="border-t border-zinc-200 pt-8 mt-2 dark:border-zinc-800 xl:border-r-0">
        <div class="flex items-center justify-between mb-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Saved Reports</p>
            <h2 class="mt-1.5 text-lg font-bold text-zinc-900 dark:text-white">Existing report artifacts</h2>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/40 shadow-sm dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/30">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th class="px-5 py-3">Team & Event</th>
                <th class="px-5 py-3">Generated</th>
                <th class="px-5 py-3 text-right">Session Window</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
              {#if filteredReports().length}
                {#each filteredReports() as report}
                  <tr class="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-800/40">
                    <td class="px-5 py-4">
                      <div>
                        <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{report.teamName}</p>
                        {#if report.hackathonId}
                          <p class="mt-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{report.hackathonId}</p>
                        {/if}
                      </div>
                    </td>
                    <td class="px-5 py-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(report.generatedAt)}
                    </td>
                    <td class="px-5 py-4 text-right">
                      <div class="text-[11px] text-zinc-400 dark:text-zinc-500 space-y-0.5">
                        <p>Start: {report.sessionStart ? formatDateTime(report.sessionStart) : "N/A"}</p>
                        <p>End: {report.sessionEnd ? formatDateTime(report.sessionEnd) : "N/A"}</p>
                      </div>
                    </td>
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan="3" class="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500 italic">
                    No saved reports are visible yet for the current filter.
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Team Detail Drawer -->
      {#if isDrawerOpen}
        <div class="fixed inset-0 z-50 flex items-end xl:left-[var(--sidebar-width,260px)]">
          <button 
            type="button"
            aria-label="Close drawer"
            onclick={closeDrawer}
            onkeydown={(e) => e.key === 'Escape' && closeDrawer()}
            transition:fade={{ duration: 200 }}
            class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity w-full border-none cursor-default"
          ></button>
          
          <div 
            transition:fly={{ y: 800, duration: 300 }}
            class="relative z-50 w-full bg-white dark:bg-zinc-900 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.3)] overflow-y-auto border border-zinc-200 dark:border-zinc-800 xl:border-r-0 border-b-0 flex flex-col h-[85vh] sm:h-[calc(100vh-4rem)] xl:h-[calc(100vh-0.75rem)] rounded-t-2xl xl:rounded-tl-[24px] xl:rounded-tr-none"
          >
             <div class="sticky top-0 z-20 flex w-full items-center justify-center bg-white pt-2 pb-1 dark:bg-zinc-900">
               <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
             </div>
             <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 xl:border-r-0 px-6 py-4 bg-white dark:bg-zinc-900 sticky top-7 z-10 hidden sm:flex">
                <div class="flex flex-col gap-1">
                  <h2 class="text-lg font-bold text-zinc-900 dark:text-white">Team detail view</h2>
                  <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Analytics</p>
                </div>
                <button type="button" onclick={closeDrawer} class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer">
                    <X size={20} />
                </button>
             </div>

             <div class="p-6 flex-1">
               {#if selectedTeam()}
                 {@const activeTeam = selectedTeam()!}
                 <div class="space-y-8">
                   <div>
                     <div class="flex flex-wrap items-center gap-2 mb-2">
                       <h3 class="text-xl font-bold text-zinc-900 dark:text-white">{activeTeam.teamName}</h3>
                       <span class={`font-bold inline-block rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-wide ${statusTone(activeTeam.status)}`}>
                         {activeTeam.status}
                       </span>
                       <span class={`font-bold inline-block rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-wide ${riskTone(activeTeam.risk.level)}`}>
                         {activeTeam.risk.level} risk
                       </span>
                     </div>
                     <p class="text-xs text-zinc-500 dark:text-zinc-400">Last seen {formatDateTime(activeTeam.lastSeen)}</p>
                     {#if activeTeam.hackathonId}
                       <p class="mt-2 text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                         Hackathon ID: {activeTeam.hackathonId}
                       </p>
                     {/if}
                   </div>

                   <div class="grid grid-cols-2 gap-4 mt-6">
                     <div class="col-span-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-800/20 flex flex-col items-center justify-center">
                       <p class="text-[10px] font-semibold uppercase w-full tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Time Allocation</p>
                       <div class="h-32 w-full max-w-[200px]">
                         <Chart 
                           type="doughnut" 
                           data={{
                             labels: ['Online Time', 'Offline Time'],
                             datasets: [{
                               data: [activeTeam.reportData.summary.totalOnlineTime, activeTeam.reportData.summary.totalOfflineTime],
                               backgroundColor: ['#10b981', '#ef4444'],
                               borderWidth: 0,
                               hoverOffset: 4
                             }]
                           }}
                           options={{
                             responsive: true,
                             maintainAspectRatio: false,
                             cutout: '70%',
                             plugins: {
                               legend: { display: false }
                             }
                           }}
                         />
                       </div>
                       <div class="flex gap-4 mt-2 w-full justify-center">
                         <div class="flex items-center gap-1.5">
                           <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                           <span class="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">Online: {Math.round(activeTeam.reportData.summary.totalOnlineTime / 60)}m</span>
                         </div>
                         <div class="flex items-center gap-1.5">
                           <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                           <span class="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">Offline: {Math.round(activeTeam.reportData.summary.totalOfflineTime / 60)}m</span>
                         </div>
                       </div>
                     </div>

                     <div class="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-800/20">
                       <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">IDE focus</p>
                       <p class="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{activeTeam.reportData.summary.percentInIDE}%</p>
                     </div>
                     <div class="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 xl:border-r-0 dark:bg-zinc-800/20">
                       <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">App switches</p>
                       <p class="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{activeTeam.risk.appSwitchCount}</p>
                     </div>
                   </div>

                   <div class="border-l-2 border-zinc-200 pl-4 py-1 dark:border-zinc-800 xl:border-r-0">
                     <p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Risk flags</p>
                     <div class="flex flex-wrap gap-2">
                       {#if activeTeam.risk.flags.length}
                         {#each activeTeam.risk.flags as flag}
                           <span class={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${riskTone(activeTeam.risk.level)}`}>{flag}</span>
                         {/each}
                       {:else}
                         <span class="text-xs text-zinc-400 dark:text-zinc-500 italic">No elevated risk flags detected.</span>
                       {/if}
                     </div>
                   </div>

                   <div class="border-l-2 border-zinc-200 pl-4 py-1 dark:border-zinc-800 xl:border-r-0">
                     <p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Top applications</p>
                     
                     {#if activeTeam.reportData.appUsage.length}
                       <div class="mb-4 h-48 w-full max-w-xs mx-auto">
                         <Chart 
                           type="doughnut" 
                           data={{
                             labels: activeTeam.reportData.appUsage.slice(0, 5).map(app => app.appName),
                             datasets: [{
                               data: activeTeam.reportData.appUsage.slice(0, 5).map(app => app.totalTime),
                               backgroundColor: [
                                 '#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1'
                               ],
                               borderWidth: 0,
                               hoverOffset: 4
                             }]
                           }}
                           options={{
                             responsive: true,
                             maintainAspectRatio: false,
                             plugins: {
                               legend: { display: false },
                               tooltip: {
                                 callbacks: {
                                   label: function(context: any) {
                                     let value = context.raw || 0;
                                     const m = Math.floor(value / 60);
                                     const s = value % 60;
                                     return context.label + ': ' + (m > 0 ? `${m}m ` : '') + `${s}s`;
                                   }
                                 }
                               }
                             }
                           }}
                         />
                       </div>
                       
                       <div class="space-y-1.5">
                         {#each activeTeam.reportData.appUsage.slice(0, 5) as app}
                           <div class="flex items-center justify-between border-b border-zinc-100 py-2 dark:border-zinc-800 xl:border-r-0/60">
                             <div class="flex items-center gap-2">
                               <div class="w-2 h-2 rounded-full" style="background-color: {['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1'][activeTeam.reportData.appUsage.indexOf(app) % 5]}"></div>
                               <span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">{app.appName}</span>
                             </div>
                             <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{formatDuration(app.totalTime)}</span>
                           </div>
                         {/each}
                       </div>
                     {:else}
                       <p class="text-xs text-zinc-400 dark:text-zinc-500 italic">No application usage summary available yet.</p>
                     {/if}
                   </div>

                   <div class="relative border-l-2 border-zinc-200 pl-6 py-2 dark:border-zinc-800 xl:border-r-0 ml-2">
                     <div class="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                     <p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">Recent activity events</p>
                     
                     <div class="space-y-4">
                       {#if (activeTeam.syncData.activityEvents || []).length}
                         {#each [...(activeTeam.syncData.activityEvents || [])].slice(-6).reverse() as event}
                           <div class="relative group">
                             <div class="absolute -left-[31px] mt-1.5 w-[7px] h-[7px] rounded-full {event.type === 'app_switch' || event.type === 'app_blur' ? 'bg-amber-400' : event.type.includes('paste') ? 'bg-red-400' : 'bg-indigo-400'} ring-4 ring-white dark:ring-zinc-900 transition-transform group-hover:scale-125"></div>
                             <div class="rounded-lg border border-zinc-100 bg-white p-3 shadow-xs dark:border-zinc-800 xl:border-r-0/60 dark:bg-zinc-900/50 transition-all hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm">
                               <div class="flex items-center justify-between gap-4 mb-1.5">
                                 <p class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                   {#if event.type === 'app_switch' || event.type === 'app_blur'}
                                     <ArrowRightLeft size={12} class="text-amber-500" />
                                   {:else if event.type.includes('paste')}
                                     <Clipboard size={12} class="text-red-500" />
                                   {:else}
                                     <Activity size={12} class="text-indigo-500" />
                                   {/if}
                                   {formatEventType(event.type)}
                                 </p>
                                 <p class="text-[10px] tracking-wide text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap">{formatDateTime(event.timestamp)}</p>
                               </div>
                               {#if event.details}
                                 <p class="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded p-2 mt-2 font-mono">
                                   {event.details}
                                 </p>
                               {/if}
                             </div>
                           </div>
                         {/each}
                       {:else}
                         <div class="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center dark:border-zinc-800 xl:border-r-0">
                           <p class="text-xs text-zinc-400 dark:text-zinc-500 italic">No event timeline available from the latest snapshot.</p>
                         </div>
                       {/if}
                     </div>
                   </div>
                 </div>
               {:else}
                 <div class="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                   Team data could not be found.
                 </div>
               {/if}
             </div>
             
             <div class="border-t border-zinc-200 dark:border-zinc-800 xl:border-r-0 p-5 bg-zinc-50 dark:bg-zinc-900/80 sticky bottom-0 z-10 flex gap-3 sm:hidden">
                <button
                  type="button"
                  onclick={closeDrawer}
                  class="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Close
                </button>
             </div>
          </div>
        </div>
      {/if}

    </div>
  </section>
{/if}
