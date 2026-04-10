<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import {
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
  import { fade, fly } from "svelte/transition";
  import type {
    AdminSnapshot,
    HackathonRecord,
    HostAccount,
    TeamMonitor,
  } from "$lib/admin/types";
  import {
    emptySnapshot,
    isAuthRedirectRequiredError,
    loadHackathonWorkspace,
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
  let hackathon = $state<HackathonRecord | null>(null);
  let hackathonWarning = $state<string | null>(null);
  let selectedTeamId = $state<string | null>(null);
  let search = $state("");

  let loading = $state(true);
  let refreshing = $state(false);
  let dashboardError = $state("");
  let isDrawerOpen = $state(false);
  let activeHackathonKey = "";

  function filteredTeams() {
    const query = search.trim().toLowerCase();

    return snapshot.monitors.filter((entry) => {
      if (!query) {
        return true;
      }

      return [entry.teamName, entry.currentFile, entry.currentWindow]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
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

  async function loadPage(
    hackathonId: string,
    options: { silent?: boolean } = {},
  ) {
    if (options.silent) {
      refreshing = true;
    } else {
      loading = true;
    }

    dashboardError = "";

    try {
      const data = await loadHackathonWorkspace(hackathonId);
      if (!data) {
        await goto("/admin/signin", { replaceState: true });
        return;
      }

      currentUser = data.currentUser;
      snapshot = data.snapshot;
      hackathon = data.hackathon;
      hackathonWarning = data.hackathonWarning;
      syncSelectedTeam();
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
        return;
      }

      dashboardError =
        err instanceof Error
          ? err.message
          : "Unable to load this hackathon's analytics right now.";
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  onMount(() => {
    const currentId = decodeURIComponent(page.params.hackathonId || "");
    activeHackathonKey = currentId;
    void loadPage(currentId);

    const intervalId = window.setInterval(() => {
      const latestId = decodeURIComponent(page.params.hackathonId || "");
      void loadPage(latestId, { silent: true });
    }, 20_000);

    return () => {
      window.clearInterval(intervalId);
    };
  });

  $effect(() => {
    const nextHackathonId = decodeURIComponent(page.params.hackathonId || "");
    if (!nextHackathonId || nextHackathonId === activeHackathonKey) {
      return;
    }

    activeHackathonKey = nextHackathonId;
    void loadPage(nextHackathonId);
  });
</script>

<svelte:head>
  <title>{hackathon ? `${hackathon.name} Analytics | Sonar` : "Analytics | Sonar"}</title>
  <meta
    name="description"
    content="Analytics for a single hackathon, including teams, reports, and risk indicators."
  />
</svelte:head>

{#if loading}
  <div class="flex min-h-[56vh] items-center justify-center">
    <div class="p-8 text-center bg-transparent">
      <LoaderCircle size={32} class="mx-auto animate-spin text-indigo-600 dark:text-indigo-400" />
      <h1 class="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Loading hackathon analytics</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        We're syncing the live teams and saved reports tied to this event.
      </p>
    </div>
  </div>
{:else}
  <div class="flex flex-col gap-6">
    <div class="border-b border-zinc-200 pb-8 dark:border-zinc-800">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
              {hackathon?.name || "Unknown hackathon"}
            </h1>
          </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onclick={() => {
              const currentId = decodeURIComponent(page.params.hackathonId || "");
              void loadPage(currentId, { silent: true });
            }}
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

    {#if hackathonWarning}
      <div class="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
        {hackathonWarning}
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
            <p>Older editor sessions that never reported a hackathon ID will not appear here until those teams reconnect.</p>
          </div>
        </div>
      </div>
    {/if}

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 border-b border-zinc-200 pb-8 dark:border-zinc-800">
      <div class="border-l-2 border-zinc-200 pl-4 py-2 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Visible teams</p>
            <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{filteredTeams().length}</p>
          </div>
          <div class="rounded-lg bg-indigo-50 p-2.5 dark:bg-indigo-950">
            <Layers3 size={20} class="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      <div class="border-l-2 border-zinc-200 pl-4 py-2 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Online now</p>
            <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{filteredCount("online")}</p>
          </div>
          <div class="rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950">
            <BarChart3 size={20} class="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      <div class="border-l-2 border-zinc-200 pl-4 py-2 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Flagged teams</p>
            <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
              {filteredTeams().filter((entry) => entry.risk.level !== "LOW").length}
            </p>
          </div>
          <div class="rounded-lg bg-rose-50 p-2.5 dark:bg-rose-950">
            <Flag size={20} class="text-rose-600 dark:text-rose-400" />
          </div>
        </div>
      </div>

      <div class="border-l-2 border-zinc-200 pl-4 py-2 dark:border-zinc-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Reports</p>
            <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{snapshot.reports.length}</p>
          </div>
          <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <FileText size={20} class="text-zinc-600 dark:text-zinc-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6">
      <div class="py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Team Monitoring</p>
            <h2 class="mt-1.5 text-lg font-bold text-zinc-900 dark:text-white">Current editor sessions for this hackathon</h2>
          </div>

          <div class="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10">
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

        <div class="overflow-x-auto rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
          <table class="min-w-full text-left">
            <thead>
              <tr class="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                <th class="px-6 py-4">Team</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Last seen</th>
                <th class="px-6 py-4">Current file</th>
                <th class="px-3 py-4 text-right">Risk</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
              {#if filteredTeams().length}
                {#each filteredTeams() as entry}
                  <tr
                    class={`cursor-pointer transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 ${
                      selectedTeamId === entry.teamId && isDrawerOpen ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                    }`}
                    onclick={() => {
                      selectedTeamId = entry.teamId;
                      isDrawerOpen = true;
                    }}
                  >
                    <td class="px-6 py-4">
                      <div>
                        <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{entry.teamName}</p>
                        <p class="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{entry.teamId}</p>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-[13px] text-zinc-500 dark:text-zinc-400">{formatDateTime(entry.lastSeen)}</td>
                    <td class="px-6 py-4 text-[13px] text-zinc-500 dark:text-zinc-400 font-mono italic max-w-[200px] truncate">{entry.currentFile || "not reporting"}</td>
                    <td class="px-3 py-4 text-right">
                      <span class={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${riskTone(entry.risk.level)}`}>
                        {entry.risk.level} {entry.risk.score}
                      </span>
                    </td>
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan="5" class="px-6 py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    No session data is visible for this hackathon yet.
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Saved Reports -->
    <div class="border-t border-zinc-200 pt-8 mt-2 dark:border-zinc-800">
      <div class="flex items-center justify-between mb-5">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Saved Reports</p>
          <h2 class="mt-1.5 text-lg font-bold text-zinc-900 dark:text-white">Report artifacts for this hackathon</h2>
        </div>
        <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
          <FileText size={18} class="text-zinc-600 dark:text-zinc-400" />
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#if snapshot.reports.length}
          {#each snapshot.reports.slice(0, 12) as report}
            <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{report.teamName}</p>
                  <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">REPORT</span>
                </div>
                <div class="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <p>Generated {formatDateTime(report.generatedAt)}</p>
                  <p class="text-[11px] opacity-70">Session: {report.sessionStart ? formatDateTime(report.sessionStart) : "N/A"} - {report.sessionEnd ? formatDateTime(report.sessionEnd) : "N/A"}</p>
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="col-span-full rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            No saved reports are visible for this hackathon yet.
          </div>
        {/if}
      </div>
    </div>

    <!-- Team Detail Drawer -->
    {#if isDrawerOpen && selectedTeam()}
      {@const activeTeam = selectedTeam()!}
      <div class="fixed inset-0 lg:left-60 z-50 flex items-end">
        <!-- Backdrop -->
        <button 
          type="button" 
          aria-label="Close details" 
          onclick={() => isDrawerOpen = false}
          onkeydown={(e) => e.key === 'Escape' && (isDrawerOpen = false)}
          transition:fade={{ duration: 200 }}
          class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity w-full border-none cursor-default"
        ></button>
        
        <!-- Drawer panel -->
        <div 
          transition:fly={{ y: 800, duration: 300 }}
          class="relative z-50 w-full bg-white dark:bg-zinc-900 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.3)] overflow-y-auto border-t border-zinc-200 dark:border-zinc-800 flex flex-col h-[90vh] sm:h-[calc(100vh-4rem)] rounded-t-2xl"
        >
          <div class="sticky top-0 z-20 flex w-full items-center justify-center bg-white pt-3 pb-1 dark:bg-zinc-900">
            <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
          </div>
          <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-white dark:bg-zinc-900 sticky top-7 z-10">
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-lg font-bold text-zinc-900 dark:text-white">{activeTeam.teamName}</h2>
                <span class={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(activeTeam.status)}`}>
                  {activeTeam.status}
                </span>
              </div>
              <p class="text-[11px] text-zinc-500 mt-1.5 dark:text-zinc-400 font-mono tracking-tighter uppercase">ID: {activeTeam.teamId}</p>
            </div>
            <button type="button" onclick={() => isDrawerOpen = false} class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <div class="p-6 space-y-8 flex-1">
            <div>
              <div class="flex items-center justify-between mb-4">
                <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Team Stats</p>
                <div class="text-[11px] text-zinc-400 dark:text-zinc-500">Last heartbeat {formatDateTime(activeTeam.lastSeen)}</div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">IDE focus</p>
                  <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{activeTeam.reportData.summary.percentInIDE}%</p>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Online coverage</p>
                  <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{activeTeam.reportData.summary.percentOnline}%</p>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">App switches</p>
                  <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{activeTeam.risk.appSwitchCount}</p>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">External pastes</p>
                  <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{activeTeam.risk.extPasteCount}</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <p class="text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-3">Risk Assessment</p>
              <div class={`inline-block rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide mb-4 ${riskTone(activeTeam.risk.level)}`}>
                {activeTeam.risk.level} risk
              </div>
              <div class="flex flex-wrap gap-2">
                {#if activeTeam.risk.flags.length}
                  {#each activeTeam.risk.flags as flag}
                    <span class={`rounded-md border px-2.5 py-1 text-xs font-semibold ${riskTone(activeTeam.risk.level)}`}>{flag}</span>
                  {/each}
                {:else}
                  <span class="text-xs text-zinc-400 dark:text-zinc-500">No elevated risk flags detected.</span>
                {/if}
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4">Top Applications</p>
              <div class="space-y-2">
                {#if activeTeam.reportData.appUsage.length}
                  {#each activeTeam.reportData.appUsage.slice(0, 8) as app}
                    <div class="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800/40 dark:bg-zinc-800/20">
                      <span class="text-sm text-zinc-700 dark:text-zinc-300">{app.appName}</span>
                      <span class="text-xs font-bold text-zinc-500 dark:text-zinc-500">{formatDuration(app.totalTime)}</span>
                    </div>
                  {/each}
                {:else}
                  <p class="text-sm text-zinc-400 dark:text-zinc-500 italic">No application usage summary available yet.</p>
                {/if}
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4">Project History</p>
              <div class="space-y-3">
                {#if (activeTeam.syncData.activityEvents || []).length}
                  {#each [...(activeTeam.syncData.activityEvents || [])].slice(-10).reverse() as event}
                    <div class="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800/40 bg-white/20 dark:bg-zinc-900/20">
                      <div class="flex items-center justify-between gap-4">
                        <p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{formatEventType(event.type)}</p>
                        <p class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{formatDateTime(event.timestamp)}</p>
                      </div>
                      {#if event.details}
                        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{event.details}</p>
                      {/if}
                    </div>
                  {/each}
                {:else}
                  <p class="text-sm text-zinc-400 dark:text-zinc-500 italic">No event timeline available from the latest snapshot.</p>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <div class="border-t border-zinc-200 pt-8 mt-2 dark:border-zinc-800">
      <div class="flex items-center justify-between mb-5">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Saved Reports</p>
          <h2 class="mt-1.5 text-lg font-bold text-zinc-900 dark:text-white">Report artifacts for this hackathon</h2>
        </div>
        <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
          <FileText size={18} class="text-zinc-600 dark:text-zinc-400" />
        </div>
      </div>

      <div class="space-y-2">
        {#if snapshot.reports.length}
          {#each snapshot.reports.slice(0, 8) as report}
            <div class="rounded-lg border-l-4 border-y border-r border-zinc-200 border-l-zinc-300 bg-transparent px-4 py-3.5 transition-colors hover:bg-zinc-50 dark:border-y-zinc-800 dark:border-r-zinc-800 dark:border-l-zinc-700 dark:hover:bg-zinc-900">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{report.teamName}</p>
                  <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Generated {formatDateTime(report.generatedAt)}</p>
                </div>
                <div class="text-right text-[11px] text-zinc-400 dark:text-zinc-500">
                  <p>Start: {report.sessionStart ? formatDateTime(report.sessionStart) : "N/A"}</p>
                  <p>End: {report.sessionEnd ? formatDateTime(report.sessionEnd) : "N/A"}</p>
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            No saved reports are visible for this hackathon yet.
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
