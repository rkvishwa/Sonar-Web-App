<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Check,
    Copy,
    FileText,
    Flag,
    Link2,
    LoaderCircle,
    RefreshCw,
    Settings,
    ShieldCheck,
  } from "lucide-svelte";
  import type {
    AdminSnapshot,
    HackathonRecord,
    HostAccount,
  } from "$lib/admin/types";
  import {
    buildHackathonRoute,
    emptySnapshot,
    isAuthRedirectRequiredError,
    loadHackathonWorkspace,
    riskTone,
    statusTone,
  } from "$lib/admin/hostDashboard";
  import { formatDateTime } from "$lib/admin/analytics";
  import { buildHackathonEditorInviteUrl } from "$lib/admin/inviteLinks";

  let currentUser = $state<HostAccount | null>(null);
  let snapshot = $state<AdminSnapshot>(emptySnapshot);
  let hackathon = $state<HackathonRecord | null>(null);
  let hackathonWarning = $state<string | null>(null);

  let loading = $state(true);
  let refreshing = $state(false);
  let dashboardError = $state("");
  let activeHackathonKey = "";
  let copiedId = $state("");
  let copiedInviteId = $state("");

  function liveTeams() {
    return snapshot.monitors.filter((entry) => entry.status === "online");
  }

  function flaggedTeams() {
    return snapshot.monitors.filter((entry) => entry.risk.level !== "LOW");
  }

  function restrictionsMatchLive() {
    if (!hackathon) {
      return false;
    }

    return (
      hackathon.settings.blockInternetAccess ===
        snapshot.settings.blockInternetAccess &&
      hackathon.settings.blockNonEmptyWorkspace ===
        snapshot.settings.blockNonEmptyWorkspace
    );
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
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
        return;
      }

      dashboardError =
        err instanceof Error
          ? err.message
          : "Unable to load this hackathon workspace right now.";
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      copiedId = text;
      setTimeout(() => {
        if (copiedId === text) {
          copiedId = "";
        }
      }, 2000);
    });
  }

  function copyEditorInvite(hackathonId: string) {
    const inviteUrl = buildHackathonEditorInviteUrl(hackathonId);
    navigator.clipboard.writeText(inviteUrl).then(() => {
      copiedInviteId = hackathonId;
      setTimeout(() => {
        if (copiedInviteId === hackathonId) {
          copiedInviteId = "";
        }
      }, 2000);
    });
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
  <title>{hackathon ? `${hackathon.name} | Sonar` : "Hackathon | Sonar"}</title>
  <meta
    name="description"
    content="Overview for a single hackathon workspace, including event status, analytics summaries, and settings links."
  />
</svelte:head>

{#if loading}
  <div class="flex min-h-[56vh] items-center justify-center">
    <div class="p-8 text-center bg-transparent">
      <LoaderCircle size={32} class="mx-auto animate-spin text-indigo-600 dark:text-indigo-400" />
      <h1 class="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Loading hackathon workspace</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        We're pulling the event overview, its filtered analytics, and its settings state.
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
          {#if hackathon?.description}
            <p class="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{hackathon.description}</p>
          {/if}
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
          </div>
        </div>
      </div>
    {/if}

    <!-- Stats Row -->
    <div class="grid gap-4 md:grid-cols-3 mb-6 border-b border-zinc-200 pb-8 dark:border-zinc-800">
      <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Online Teams</p>
            <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{liveTeams().length}</p>
          </div>
          <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <Activity size={20} class="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Flagged Teams</p>
            <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{flaggedTeams().length}</p>
          </div>
          <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <Flag size={20} class="text-rose-600 dark:text-rose-400" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Saved Reports</p>
            <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{snapshot.reports.length}</p>
          </div>
          <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <FileText size={20} class="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="space-y-8">
      <!-- Unified Event Info (Title Removed as Requested) -->
      {#if hackathon}
        <div class="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-zinc-200 bg-white/40 px-6 py-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
          <div class="flex flex-col gap-1.5">
             <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Hackathon ID</p>
             <div class="flex items-center gap-2 group/id">
                <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">{hackathon.hackathonId}</p>
                <button 
                  type="button"
                  onclick={() => copyToClipboard(hackathon!.hackathonId)}
                  class="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {#if copiedId === hackathon.hackathonId}
                    <Check size={14} class="text-emerald-500" />
                  {:else}
                    <Copy size={14} />
                  {/if}
                </button>
             </div>
             <button
               type="button"
               onclick={() => copyEditorInvite(hackathon!.hackathonId)}
               class="mt-2 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
             >
               {#if copiedInviteId === hackathon.hackathonId}
                 <Check size={12} class="text-emerald-500" />
               {:else}
                 <Link2 size={12} />
               {/if}
               {copiedInviteId === hackathon.hackathonId
                 ? "Link copied"
                 : "Copy Invitation Link"}
             </button>
          </div>
          <div class="hidden h-10 w-px bg-zinc-200 dark:bg-zinc-800 sm:block"></div>
          <div class="flex flex-col gap-1.5">
             <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Status</p>
             <div class="flex items-center gap-2">
                <span class={`h-1.5 w-1.5 rounded-full ${hackathon.status === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
                <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">{hackathon.status}</p>
             </div>
          </div>
          <div class="hidden h-10 w-px bg-zinc-200 dark:bg-zinc-800 sm:block"></div>
          <div class="flex flex-col gap-1.5">
             <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Timeline</p>
             <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
               {hackathon.startDate ? formatDateTime(hackathon.startDate) : "TBD"} — {hackathon.endDate ? formatDateTime(hackathon.endDate) : "TBD"}
             </p>
          </div>
          <div class="hidden h-10 w-px bg-zinc-200 dark:bg-zinc-800 lg:block"></div>
          <div class="flex flex-col gap-1.5">
             <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Source</p>
             <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
               {hackathon.source === "appwrite" ? "Sonar Cloud" : "Local App"}
             </p>
          </div>
        </div>
      {/if}

      <!-- Balanced Grid: Telemetry & Overrides -->
      <div class="grid gap-6 xl:grid-cols-[1fr_0.4fr]">
        <!-- Latest Teams Summary -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">Live Telemetry</p>
              <h2 class="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Recent activity summary</h2>
            </div>
            <a 
              href={hackathon ? buildHackathonRoute(hackathon.hackathonId, "analytics") : "#"}
              class="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all teams
            </a>
          </div>

          <div class="overflow-x-auto rounded-xl border border-zinc-200 bg-white/30 dark:border-zinc-800 dark:bg-zinc-900/20 shadow-sm">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-zinc-50/50 border-b border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th class="px-5 py-3">Team Name</th>
                  <th class="px-5 py-3">Status</th>
                  <th class="px-5 py-3 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                {#if snapshot.monitors.length}
                {#each snapshot.monitors.slice(0, 5) as team}
                  <tr class="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-800/40">
                    <td class="px-5 py-4">
                      <div>
                        <p class="font-bold text-zinc-900 dark:text-zinc-100">{team.teamName}</p>
                        <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono italic mt-0.5">Seen {formatDateTime(team.lastSeen)}</p>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <span class={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusTone(team.status)}`}>
                        {team.status}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-right">
                      <span class={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${riskTone(team.risk.level)}`}>
                        {team.risk.level}
                      </span>
                    </td>
                  </tr>
                {/each}
                {:else}
                <tr>
                  <td colspan="3" class="px-5 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500 italic">No telemetry data visible yet.</td>
                </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Overrides Preview -->
        <div>
           <div class="mb-4">
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">Security</p>
              <h2 class="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Active Restrictions</h2>
           </div>
           <div class="rounded-xl border border-zinc-200 bg-white/40 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
              <div class="space-y-4">
                <div class="flex flex-col gap-2 border-b border-zinc-200/60 pb-4 dark:border-zinc-800/60">
                  <span class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Internet Access</span>
                  <div class="flex items-center gap-2">
                     <span class={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${hackathon?.settings.blockInternetAccess ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400' : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
                       {hackathon?.settings.blockInternetAccess ? "BLOCKED" : "ALLOWED"}
                     </span>
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <span class="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Empty Workspace</span>
                  <div class="flex items-center gap-2">
                     <span class={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${hackathon?.settings.blockNonEmptyWorkspace ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400' : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
                       {hackathon?.settings.blockNonEmptyWorkspace ? "REQUIRED" : "NOT REQUIRED"}
                     </span>
                  </div>
                </div>
              </div>
              <p class="mt-5 text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500 italic">
                These overrides apply specifically to <strong>{hackathon?.name || "this event"}</strong> and bypass global host settings.
              </p>
           </div>
        </div>
      </div>
    </div>

  </div>
{/if}
