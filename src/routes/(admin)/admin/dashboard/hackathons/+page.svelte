<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import {
    AlertTriangle,
    ArrowRight,
    Check,
    Copy,
    LoaderCircle,
    Plus,
    RefreshCw,
    X,
  } from "lucide-svelte";
  import {
    createHackathon,
    defaultHackathonDraft,
    hackathonSettingsFromGlobal,
  } from "$lib/admin/api";
  import type {
    AdminSnapshot,
    GlobalSettings,
    HackathonDraft,
    HackathonRecord,
    HostAccount,
  } from "$lib/admin/types";
  import {
    buildHackathonRoute,
    emptySnapshot,
    isAuthRedirectRequiredError,
    loadHostWorkspace,
  } from "$lib/admin/hostDashboard";
  import { formatDateTime } from "$lib/admin/analytics";

  let currentUser = $state<HostAccount | null>(null);
  let snapshot = $state<AdminSnapshot>(emptySnapshot);
  let hackathons = $state<HackathonRecord[]>([]);
  let hackathonSource = $state<"appwrite" | "local">("local");
  let hackathonWarning = $state<string | null>(null);
  let newHackathon = $state<HackathonDraft>(defaultHackathonDraft());
  let globalSettings = $state<GlobalSettings>(emptySnapshot.globalSettings);

  let loading = $state(true);
  let refreshing = $state(false);
  let creatingHackathon = $state(false);

  let dashboardError = $state("");
  let actionError = $state("");
  let hasHydratedGlobalDefaults = false;

  let isDrawerOpen = $state(false);
  let copiedId = $state("");

  function toggleDrawer() {
    isDrawerOpen = !isDrawerOpen;
  }

  function sameHackathonSettings(
    left: HackathonDraft["settings"],
    right: HackathonDraft["settings"],
  ) {
    return (
      left.blockInternetAccess === right.blockInternetAccess &&
      left.blockNonEmptyWorkspace === right.blockNonEmptyWorkspace
    );
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
      hackathons = data.hackathons;
      hackathonSource = data.hackathonSource;
      hackathonWarning = data.hackathonWarning;

      const previousGlobalDefaults = hackathonSettingsFromGlobal(globalSettings);
      snapshot = data.snapshot;
      globalSettings = data.snapshot.globalSettings;

      const nextGlobalDefaults = hackathonSettingsFromGlobal(globalSettings);
      if (
        !hasHydratedGlobalDefaults ||
        sameHackathonSettings(newHackathon.settings, previousGlobalDefaults)
      ) {
        newHackathon = {
          ...newHackathon,
          settings: nextGlobalDefaults,
        };
      }
      hasHydratedGlobalDefaults = true;
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
        return;
      }

      dashboardError =
        err instanceof Error
          ? err.message
          : "Unable to load the host hackathons workspace right now.";
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

  onMount(() => {
    void loadPage();

    const intervalId = window.setInterval(() => {
      void loadPage({ silent: true });
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

    try {
      const created = await createHackathon(currentUser, newHackathon);
      if (created.warning) {
        hackathonWarning = created.warning;
      }
      newHackathon = defaultHackathonDraft(globalSettings);
      isDrawerOpen = false;
      await goto(buildHackathonRoute(created.record.hackathonId));
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to create the hackathon.";
    } finally {
      creatingHackathon = false;
    }
  }
</script>

<svelte:head>
  <title>Hackathons | Sonar</title>
  <meta
    name="description"
    content="Create hackathons and open each event in its own dedicated workspace."
  />
</svelte:head>

{#if loading}
  <section class="flex min-h-[72vh] items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="p-8 text-center bg-transparent">
      <LoaderCircle size={32} class="mx-auto animate-spin text-indigo-600 dark:text-indigo-400" />
      <h1 class="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Loading hackathons</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        We're pulling together your hosted events and their dedicated workspaces.
      </p>
    </div>
  </section>
{:else}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">

      <div class="border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
              Hackathons
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
            <button
              type="button"
              onclick={toggleDrawer}
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              <Plus size={16} />
              Create New
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

      {#if actionError}
        <div class="border-l-2 border-rose-500 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
          {actionError}
        </div>
      {/if}

      {#if hackathons.length === 0}
        <div class="rounded-lg border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500 flex flex-col items-center justify-center gap-4 mt-6">
          <p>No hackathons yet. Create the first one to assign a dedicated workspace.</p>
          <button
            type="button"
            onclick={toggleDrawer}
            class="inline-flex flex-none items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Create your first event
          </button>
        </div>
      {:else}
        <div class="overflow-x-auto rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm mt-4">
          <table class="w-full text-left text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap lg:whitespace-normal">
            <thead class="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
              <tr>
                <th scope="col" class="px-6 py-4">Hackathon</th>
                <th scope="col" class="px-6 py-4">Status</th>
                <th scope="col" class="px-6 py-4">Dates</th>
                <th scope="col" class="px-6 py-4">Settings</th>
                <th scope="col" class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
              {#each hackathons as entry}
                <tr class="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <td class="px-6 py-4">
                    <div class="font-bold text-zinc-900 dark:text-white mb-1">{entry.name}</div>
                    <div class="flex items-center gap-2 group/id">
                      <div class="text-[11px] font-mono tracking-wider text-indigo-600 dark:text-indigo-400">{entry.hackathonId}</div>
                      <button 
                        type="button"
                        onclick={() => copyToClipboard(entry.hackathonId)}
                        class="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                        title="Copy ID"
                      >
                        {#if copiedId === entry.hackathonId}
                          <Check size={12} class="text-emerald-500" />
                        {:else}
                          <Copy size={12} />
                        {/if}
                      </button>
                    </div>
                    {#if entry.description}
                      <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500 line-clamp-1 max-w-[200px] sm:max-w-xs">{entry.description}</p>
                    {/if}
                  </td>
                  <td class="px-6 py-4 align-top">
                    <span class={`inline-block mt-0.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      entry.status === "live"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                        : entry.status === "archived"
                          ? "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-[13px] align-top space-y-1.5">
                    <div><span class="font-medium text-zinc-400 dark:text-zinc-600">Start:</span> {entry.startDate ? formatDateTime(entry.startDate) : "TBD"}</div>
                    <div><span class="font-medium text-zinc-400 dark:text-zinc-600">End:</span> {entry.endDate ? formatDateTime(entry.endDate) : "TBD"}</div>
                  </td>
                  <td class="px-6 py-4 text-[13px] text-zinc-500 dark:text-zinc-400 align-top space-y-1.5">
                    <div>{entry.settings.blockInternetAccess ? "Internet blocked" : "Internet allowed"}</div>
                    <div>{entry.settings.blockNonEmptyWorkspace ? "Empty workspace required" : "Existing files allowed"}</div>
                  </td>
                  <td class="px-6 py-4 text-right align-top">
                    <div class="flex items-center justify-end gap-3 text-[13px] font-medium text-indigo-600 dark:text-indigo-400 pt-1">
                      <a href={buildHackathonRoute(entry.hackathonId)} class="hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                        Overview
                      </a>
                      <a href={buildHackathonRoute(entry.hackathonId, "analytics")} class="hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                        Analytics
                      </a>
                      <a href={buildHackathonRoute(entry.hackathonId, "settings")} class="hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                        Settings
                      </a>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      {#if isDrawerOpen}
        <div class="fixed inset-0 z-50 flex justify-end">
          <!-- Backdrop -->
          <button 
            type="button" 
            aria-label="Close drawer" 
            onclick={toggleDrawer}
            onkeydown={(e) => e.key === 'Escape' && toggleDrawer()}
            transition:fade={{ duration: 200 }}
            class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity w-full border-none cursor-default"
          ></button>
          
          <!-- Drawer panel -->
          <div 
            transition:fly={{ x: 448, duration: 300 }}
            class="relative z-50 w-full max-w-md bg-white shadow-2xl dark:bg-zinc-900 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full right-0"
          >
             <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-5 bg-zinc-50 dark:bg-zinc-900/80 sticky top-0 z-10">
                <div>
                  <h2 class="text-lg font-bold text-zinc-900 dark:text-white">Create an event workspace</h2>
                  <p class="text-xs text-zinc-500 mt-1 dark:text-zinc-400">Start configuring a new hackathon.</p>
                </div>
                <button type="button" onclick={toggleDrawer} class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer">
                    <X size={20} />
                </button>
             </div>

             <div class="p-6 flex-1">
                <form id="createHackathonForm" class="space-y-6" onsubmit={handleCreateHackathon}>
                  <div>
                    <label class="block">
                      <span class="mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hackathon ID</span>
                      <div class="relative group/copy">
                        <input
                          value={newHackathon.hackathonId}
                          type="text"
                          readonly
                          class="w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 font-mono text-sm tracking-[0.2em] text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 pr-10"
                        />
                        <button
                          type="button"
                          onclick={() => copyToClipboard(newHackathon.hackathonId)}
                          class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                          title="Copy ID"
                        >
                          {#if copiedId === newHackathon.hackathonId}
                            <Check size={14} class="text-emerald-500" />
                          {:else}
                            <Copy size={14} />
                          {/if}
                        </button>
                      </div>
                      <span class="mt-1.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        Generated automatically as a 12-digit event ID with checksum validation.
                      </span>
                    </label>
                  </div>

                  <div>
                    <label class="block">
                      <span class="mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Name</span>
                      <input
                        bind:value={newHackathon.name}
                        type="text"
                        required
                        placeholder="National Finals 2026"
                        class="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:bg-zinc-800"
                      />
                    </label>
                  </div>

                  <div>
                    <label class="block">
                      <span class="mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Status</span>
                      <select
                        bind:value={newHackathon.status}
                        class="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 cursor-pointer"
                      >
                        <option value="draft">Draft</option>
                        <option value="live">Live</option>
                        <option value="archived">Archived</option>
                      </select>
                      <p class="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Draft is for setup and review before the event starts. Live marks an active event for dashboard reporting. Archived closes the event and blocks new team sign-ins and registrations.
                      </p>
                    </label>
                  </div>

                  <div>
                    <label class="block">
                      <span class="mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Description</span>
                      <textarea
                        bind:value={newHackathon.description}
                        rows="3"
                        placeholder="Brief notes for organizers, judges, or proctors"
                        class="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 resize-none"
                      ></textarea>
                    </label>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <label class="block">
                      <span class="mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Start</span>
                      <input
                        bind:value={newHackathon.startDate}
                        type="datetime-local"
                        class="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </label>

                    <label class="block">
                      <span class="mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">End</span>
                      <input
                        bind:value={newHackathon.endDate}
                        type="datetime-local"
                        class="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </label>
                  </div>

                  <div class="flex flex-col space-y-3 pt-2">
                    <label class="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer">
                      <span>
                        <span class="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Block internet</span>
                        <span class="text-xs text-zinc-500 dark:text-zinc-400">Copied from global defaults</span>
                      </span>
                      <input bind:checked={newHackathon.settings.blockInternetAccess} type="checkbox" class="h-4 w-4 accent-indigo-600 cursor-pointer" />
                    </label>

                    <label class="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer">
                      <span>
                        <span class="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Require empty workspace</span>
                        <span class="text-xs text-zinc-500 dark:text-zinc-400">Copied from global defaults</span>
                      </span>
                      <input bind:checked={newHackathon.settings.blockNonEmptyWorkspace} type="checkbox" class="h-4 w-4 accent-indigo-600 cursor-pointer" />
                    </label>
                  </div>

                  <div class="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-[11px] leading-5 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    After creation, open the hackathon workspace to manage event-specific settings and analytics.
                  </div>
                </form>
             </div>
             
             <div class="border-t border-zinc-200 dark:border-zinc-800 p-5 bg-zinc-50 dark:bg-zinc-900/80 sticky bottom-0 z-10 flex gap-3">
                <button
                  type="button"
                  onclick={toggleDrawer}
                  class="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="createHackathonForm"
                  class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500 cursor-pointer"
                  disabled={creatingHackathon}
                >
                  {#if creatingHackathon}
                    <LoaderCircle size={16} class="animate-spin" /> Creating
                  {:else}
                    <Plus size={16} /> Create Workspace
                  {/if}
                </button>
             </div>
          </div>
        </div>
      {/if}
    </div>
  </section>
{/if}
