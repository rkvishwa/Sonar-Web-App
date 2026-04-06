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
  } from "lucide-svelte";
  import type {
    AdminSnapshot,
    HackathonRecord,
    HostAccount,
    TeamMonitor,
  } from "$lib/admin/types";
  import {
    emptySnapshot,
    isAuthRedirectRequiredError,
    loadHostWorkspace,
    riskTone,
    statusTone,
  } from "$lib/admin/hostDashboard";
  import {
    formatDateTime,
    formatDuration,
    formatEventType,
  } from "$lib/admin/analytics";

  let currentUser = $state<HostAccount | null>(null);
  let snapshot = $state<AdminSnapshot>(emptySnapshot);
  let hackathons = $state<HackathonRecord[]>([]);
  let selectedHackathonId = $state("");
  let selectedTeamId = $state<string | null>(null);
  let search = $state("");
  let isDrawerOpen = $state(false);

  let loading = $state(true);
  let refreshing = $state(false);
  let dashboardError = $state("");

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

  async function loadPage(options: { silent?: boolean } = {}) {
    if (options.silent) {
      refreshing = true;
    } else {
      loading = true;
    }

    dashboardError = "";

    try {
      const data = await loadHostWorkspace();
      if (!data) {
        await goto("/admin/signin", { replaceState: true });
        return;
      }

      currentUser = data.currentUser;
      snapshot = data.snapshot;
      hackathons = data.hackathons;
      syncSelectedTeam();
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
        return;
      }

      dashboardError =
        err instanceof Error
          ? err.message
          : "Unable to load monitoring right now.";
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  onMount(() => {
    void loadPage();

    const intervalId = window.setInterval(() => {
      void loadPage({ silent: true });
    }, 20_000);

    return () => {
      window.clearInterval(intervalId);
    };
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
  <section class="flex min-h-[72vh] items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="p-8 text-center bg-transparent">
      <LoaderCircle size={32} class="mx-auto animate-spin text-indigo-600 dark:text-indigo-400" />
      <h1 class="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Loading monitoring</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        We're syncing your latest live sessions, analytics, and saved report artifacts.
      </p>
    </div>
  </section>
{:else}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">

      <!-- Page Header -->
      <div class="border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
              Monitoring
            </h1>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onclick={() => loadPage({ silent: true })}
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
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
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

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
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

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
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

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
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
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
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

          <div class="overflow-x-auto rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
            <table class="min-w-full text-left">
              <thead class="bg-zinc-50/80 border-b border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/80 tracking-wider font-semibold text-xs text-zinc-500 uppercase">
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
      <div class="border-t border-zinc-200 pt-8 mt-2 dark:border-zinc-800">
        <div class="flex items-center justify-between mb-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Saved Reports</p>
            <h2 class="mt-1.5 text-lg font-bold text-zinc-900 dark:text-white">Existing report artifacts</h2>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/40 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
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
        <div class="fixed inset-0 z-50 flex justify-end">
          <button 
            type="button"
            aria-label="Close drawer"
            onclick={closeDrawer}
            onkeydown={(e) => e.key === 'Escape' && closeDrawer()}
            transition:fade={{ duration: 200 }}
            class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity w-full border-none cursor-default"
          ></button>
          
          <div 
            transition:fly={{ x: 448, duration: 300 }}
            class="relative z-50 w-full max-w-md bg-white shadow-2xl dark:bg-zinc-900 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full right-0"
          >
             <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-5 bg-zinc-50 dark:bg-zinc-900/80 sticky top-0 z-10 hidden sm:flex">
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

                   <div class="grid grid-cols-2 gap-4">
                     <div class="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/20">
                       <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">IDE focus</p>
                       <p class="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{activeTeam.reportData.summary.percentInIDE}%</p>
                     </div>
                     <div class="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/20">
                       <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Online</p>
                       <p class="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{activeTeam.reportData.summary.percentOnline}%</p>
                     </div>
                     <div class="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/20">
                       <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">App switches</p>
                       <p class="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{activeTeam.risk.appBlurCount}</p>
                     </div>
                     <div class="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/20">
                       <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Ext pastes</p>
                       <p class="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{activeTeam.risk.extPasteCount}</p>
                     </div>
                   </div>

                   <div class="border-l-2 border-zinc-200 pl-4 py-1 dark:border-zinc-800">
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

                   <div class="border-l-2 border-zinc-200 pl-4 py-1 dark:border-zinc-800">
                     <p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Top applications</p>
                     <div class="space-y-1.5">
                       {#if activeTeam.reportData.appUsage.length}
                         {#each activeTeam.reportData.appUsage.slice(0, 5) as app}
                           <div class="flex items-center justify-between border-b border-zinc-100 py-2 dark:border-zinc-800/60">
                             <span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">{app.appName}</span>
                             <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{formatDuration(app.totalTime)}</span>
                           </div>
                         {/each}
                       {:else}
                         <p class="text-xs text-zinc-400 dark:text-zinc-500 italic">No application usage summary available yet.</p>
                       {/if}
                     </div>
                   </div>

                   <div class="border-l-2 border-zinc-200 pl-4 py-1 dark:border-zinc-800">
                     <p class="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Recent activity events</p>
                     <div class="space-y-3">
                       {#if (activeTeam.syncData.activityEvents || []).length}
                         {#each [...(activeTeam.syncData.activityEvents || [])].slice(-6).reverse() as event}
                           <div class="border-b border-zinc-100 pb-3 dark:border-zinc-800/60 transition-colors group">
                             <div class="flex items-center justify-between gap-4">
                               <p class="text-xs font-bold text-zinc-800 dark:text-zinc-200">{formatEventType(event.type)}</p>
                               <p class="text-[10px] tracking-wide text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 transition-colors">{formatDateTime(event.timestamp)}</p>
                             </div>
                             {#if event.details}
                               <p class="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-200 dark:border-zinc-700 pl-2 mt-1.5">{event.details}</p>
                             {/if}
                           </div>
                         {/each}
                       {:else}
                         <p class="text-xs text-zinc-400 dark:text-zinc-500 italic">No event timeline available from the latest snapshot.</p>
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
             
             <div class="border-t border-zinc-200 dark:border-zinc-800 p-5 bg-zinc-50 dark:bg-zinc-900/80 sticky bottom-0 z-10 flex gap-3 sm:hidden">
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
