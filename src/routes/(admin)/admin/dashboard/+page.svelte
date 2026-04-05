<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    Activity,
    AlertTriangle,
    FileText,
    Flag,
    Layers3,
    LoaderCircle,
    RefreshCw,
  } from "lucide-svelte";
  import type {
    AdminSnapshot,
    HackathonRecord,
    HostAccount,
  } from "$lib/admin/types";
  import {
    emptySnapshot,
    loadHostWorkspace,
    riskTone,
    statusTone,
  } from "$lib/admin/hostDashboard";
  import { formatDateTime } from "$lib/admin/analytics";

  let currentUser = $state<HostAccount | null>(null);
  let snapshot = $state<AdminSnapshot>(emptySnapshot);
  let hackathons = $state<HackathonRecord[]>([]);
  let hackathonSource = $state<"appwrite" | "local">("local");
  let hackathonWarning = $state<string | null>(null);

  let loading = $state(true);
  let refreshing = $state(false);
  let dashboardError = $state("");

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
      hackathonSource = data.hackathonSource;
      hackathonWarning = data.hackathonWarning;
    } catch (err) {
      dashboardError =
        err instanceof Error
          ? err.message
          : "Unable to load the host overview right now.";
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

  function liveTeams() {
    return snapshot.monitors.filter((entry) => entry.status === "online");
  }

  function flaggedTeams() {
    return snapshot.monitors.filter((entry) => entry.risk.level !== "LOW");
  }

  function liveHackathons() {
    return hackathons.filter((entry) => entry.status === "live");
  }
</script>

<svelte:head>
  <title>Overview | Sonar</title>
  <meta
    name="description"
    content="Overview of hosted hackathons, live monitoring, and host workspace status in Sonar."
  />
</svelte:head>

{#if loading}
  <section class="flex min-h-[72vh] items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="p-8 text-center bg-transparent">
      <LoaderCircle size={32} class="mx-auto animate-spin text-indigo-600 dark:text-indigo-400" />
      <h1 class="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Loading host overview</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        We're assembling your hosted events, live monitoring snapshot, and current workspace status.
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
              Overview
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

      <!-- Stats Grid -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Hosted Hackathons</p>
              <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{hackathons.length}</p>
            </div>
            <div class="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <Layers3 size={20} class="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Live Teams</p>
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
              <FileText size={20} class="text-zinc-600 dark:text-zinc-400" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Panels -->
      <div class="grid gap-8 xl:grid-cols-2 pt-2">
        <!-- Recent Hackathons -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Recent Events</p>
              <h2 class="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Active and upcoming hackathons</h2>
            </div>
          </div>

          <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/40 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th class="px-5 py-3">Event Details</th>
                  <th class="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                {#if hackathons.length}
                  {#each hackathons.slice(0, 5) as hackathon}
                    <tr class="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-800/40">
                      <td class="px-5 py-4">
                        <div>
                          <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{hackathon.name}</p>
                          <p class="mt-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{hackathon.hackathonId}</p>
                        </div>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <span class={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          hackathon.status === "live"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : hackathon.status === "archived"
                              ? "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
                              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400"
                        }`}>
                          {hackathon.status}
                        </span>
                      </td>
                    </tr>
                  {/each}
                {:else}
                  <tr>
                    <td colspan="2" class="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500 italic">
                      No hackathons yet. Use the Hackathons page to create your first event.
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Attention Needed -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">Attention Needed</p>
              <h2 class="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Flagged live teams</h2>
            </div>
          </div>

          <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/40 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th class="px-5 py-3">Team & Event Info</th>
                  <th class="px-5 py-3 text-right">Risk Assessment</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                {#if flaggedTeams().length}
                  {#each flaggedTeams().slice(0, 5) as team}
                    <tr class="transition-colors hover:bg-zinc-50/40 dark:hover:bg-zinc-800/40">
                      <td class="px-5 py-4">
                        <div>
                          <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{team.teamName}</p>
                          {#if team.hackathonId}
                            <p class="mt-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{team.hackathonId}</p>
                          {/if}
                        </div>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <div class="flex flex-col items-end gap-1.5">
                          <span class={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${riskTone(team.risk.level)}`}>
                            {team.risk.level} <span class="opacity-75">({team.risk.score})</span>
                          </span>
                          <span class={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusTone(team.status)}`}>
                            {team.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  {/each}
                {:else}
                  <tr>
                    <td colspan="2" class="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500 italic">
                      No elevated team risk is visible from the latest telemetry snapshot.
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
{/if}
