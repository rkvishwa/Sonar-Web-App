<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount, untrack } from "svelte";
  import { fade, fly } from "svelte/transition";
  import {
    AlertTriangle,
    ArrowRight,
    Check,
    Copy,
    Plus,
    RefreshCw,
    X,
    Search,
    Calendar,
    Settings,
    BarChart3,
    Eye,
    LoaderCircle,
  } from "lucide-svelte";
  import {
    createHackathon,
    defaultHackathonDraft,
    hackathonSettingsFromGlobal,
  } from "$lib/admin/api";
  import type {
    GlobalSettings,
    HackathonDraft,
    HackathonRecord,
    HostAccount,
  } from "$lib/admin/types";
  import {
    buildHackathonRoute,
    isAuthRedirectRequiredError,
  } from "$lib/admin/hostDashboard";
  import { formatDateTime } from "$lib/admin/analytics";
  import { adminStore } from "$lib/admin/adminStore.svelte";
  import Skeleton from "$lib/components/admin/Skeleton.svelte";

  let newHackathon = $state<HackathonDraft>(defaultHackathonDraft());
  let creatingHackathon = $state(false);
  let actionError = $state("");
  let hasHydratedGlobalDefaults = false;
  let isDrawerOpen = $state(false);
  let copiedId = $state("");

  let searchQuery = $state("");
  let startDateFilter = $state("");
  let endDateFilter = $state("");
  let statusFilter = $state("");

  let currentUser = $derived(adminStore.currentUser);
  let snapshot = $derived(adminStore.snapshot);
  let hackathons = $derived(adminStore.hackathons);
  let hackathonSource = $derived(adminStore.hackathonSource);
  let hackathonWarning = $derived(adminStore.hackathonWarning);
  let globalSettings = $derived(adminStore.globalSettings);
  let loading = $derived(adminStore.loading);
  let refreshing = $derived(adminStore.refreshing);
  let dashboardError = $derived(adminStore.error);

  let filteredHackathons = $derived(
    hackathons.filter((h) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || h.name.toLowerCase().includes(q) || h.hackathonId.toLowerCase().includes(q);
      const matchStart = !startDateFilter || (h.startDate && h.startDate >= startDateFilter);
      const matchEnd = !endDateFilter || (h.endDate && h.endDate <= endDateFilter);
      const matchStatus = !statusFilter || h.status === statusFilter;
      return matchSearch && matchStart && matchEnd && matchStatus;
    })
  );

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

  // Hydrate defaults when global settings change
  $effect(() => {
    const currentGlobalDefaults = hackathonSettingsFromGlobal(globalSettings);
    // Use untrack to read draft settings without subscribing — prevents infinite loop
    const shouldHydrate = untrack(() => {
      return !hasHydratedGlobalDefaults || sameHackathonSettings(newHackathon.settings, currentGlobalDefaults);
    });
    if (shouldHydrate) {
      newHackathon.settings = { ...currentGlobalDefaults };
    }
    hasHydratedGlobalDefaults = true;
  });

  async function handleRefresh() {
    try {
      await adminStore.forceRefresh();
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
      }
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

  onMount(async () => {
    try {
      await adminStore.ensure();
      if (!adminStore.currentUser) {
        await goto("/admin/signin", { replaceState: true });
      }
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
      }
    }
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
      newHackathon = defaultHackathonDraft(globalSettings);
      isDrawerOpen = false;
      adminStore.invalidate();
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
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <!-- Header skeleton -->
      <div class="border-b border-zinc-200 pb-8 dark:border-zinc-800 lg:border-r-0">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <Skeleton variant="text" width="200px" height="28px" />
          <div class="flex gap-3">
            <Skeleton variant="text" width="100px" height="40px" />
            <Skeleton variant="text" width="120px" height="40px" />
          </div>
        </div>
      </div>

      <!-- Search/filter skeleton -->
      <div class="flex flex-col sm:flex-row gap-4 mb-2">
        <Skeleton variant="text" width="100%" height="40px" />
      </div>

      <!-- Table skeleton -->
      <Skeleton variant="table" rows={4} columns={5} />
    </div>
  </section>
{:else}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">

      <div class="border-b border-zinc-200 pb-8 dark:border-zinc-800 lg:border-r-0">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
              Hackathons
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

      <div class="flex flex-col sm:flex-row gap-4 mb-2">
        <div class="relative flex-[2]">
          <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            bind:value={searchQuery}
            type="text"
            placeholder="Search by name or ID..."
            class="w-full pl-9 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-zinc-900 dark:text-zinc-100 transition-shadow"
          />
        </div>
        <div class="flex gap-2 flex-[1.5]">
          <div class="relative w-full min-w-[100px]">
            <select
              bind:value={statusFilter}
              class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-zinc-900 dark:text-zinc-100 transition-shadow appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="archived">Archived</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          <div class="relative w-full">
            <Calendar size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              bind:value={startDateFilter}
              type="date"
              class="w-full pl-8 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-zinc-600 dark:text-zinc-300 placeholder-zinc-400 transition-shadow"
            />
          </div>
          <div class="relative w-full">
            <Calendar size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              bind:value={endDateFilter}
              type="date"
              class="w-full pl-8 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-zinc-600 dark:text-zinc-300 placeholder-zinc-400 transition-shadow"
            />
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
      {:else if filteredHackathons.length === 0}
        <div class="rounded-lg border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500 mt-6">
          <p>No hackathons match your search and filter criteria.</p>
          <button
            type="button"
            onclick={() => { searchQuery = ''; startDateFilter = ''; endDateFilter = ''; statusFilter = ''; }}
            class="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Clear filters
          </button>
        </div>
      {:else}
        <div class="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 lg:border-r-0 dark:bg-zinc-900/40 shadow-sm mt-4">
          <table class="w-full text-left text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap lg:whitespace-normal">
            <thead class="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 lg:border-r-0 dark:bg-zinc-900/60 dark:text-zinc-400">
              <tr>
                <th scope="col" class="px-6 py-4">Hackathon</th>
                <th scope="col" class="px-6 py-4">Status</th>
                <th scope="col" class="px-6 py-4">Start</th>
                <th scope="col" class="px-6 py-4">End</th>
                <th scope="col" class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
              {#each filteredHackathons as entry}
                <tr class="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 group/row">
                  <td class="px-6 py-5 align-middle">
                    <div class="font-bold text-zinc-900 dark:text-white text-[15px] mb-1">{entry.name}</div>
                    <div class="flex items-center gap-2 group/id">
                      <div class="text-[11px] font-mono tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">{entry.hackathonId}</div>
                      <button 
                        type="button"
                        onclick={() => copyToClipboard(entry.hackathonId)}
                        class="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                        title="Copy ID"
                      >
                        {#if copiedId === entry.hackathonId}
                          <Check size={12} class="text-emerald-500" />
                        {:else}
                          <Copy size={12} />
                        {/if}
                      </button>
                    </div>
                  </td>
                  <td class="px-6 py-5 align-middle">
                    <span class={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      entry.status === "live"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : entry.status === "archived"
                          ? "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}>
                      {#if entry.status === "live"}
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {:else if entry.status === "archived"}
                        <span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                      {:else}
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {/if}
                      {entry.status}
                    </span>
                  </td>
                  <td class="px-6 py-5 align-middle">
                    <span class="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{entry.startDate ? formatDateTime(entry.startDate) : "—"}</span>
                  </td>
                  <td class="px-6 py-5 align-middle">
                    <span class="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{entry.endDate ? formatDateTime(entry.endDate) : "—"}</span>
                  </td>
                  <td class="px-6 py-5 text-right align-middle">
                    <div class="flex items-center justify-end gap-2">
                      <a href={buildHackathonRoute(entry.hackathonId)} class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm" title="Overview">
                        <Eye size={14} class="text-zinc-400" />
                        Overview
                      </a>
                      <a href={buildHackathonRoute(entry.hackathonId, "analytics")} class="inline-flex items-center justify-center p-1.5 rounded-lg border border-transparent text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors" title="Analytics">
                        <BarChart3 size={16} />
                      </a>
                      <a href={buildHackathonRoute(entry.hackathonId, "settings")} class="inline-flex items-center justify-center p-1.5 rounded-lg border border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors" title="Settings">
                        <Settings size={16} />
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
        <div class="fixed inset-0 z-50 flex items-end lg:left-[var(--sidebar-width,260px)]">
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
            transition:fly={{ y: 800, duration: 300 }}
            class="relative z-50 w-full bg-white dark:bg-zinc-900 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.3)] overflow-y-auto border border-zinc-200 dark:border-zinc-800 lg:border-r-0 border-b-0 flex flex-col h-[85vh] sm:h-[calc(100vh-4rem)] lg:h-[calc(100vh-0.75rem)] rounded-t-2xl lg:rounded-tl-[24px] lg:rounded-tr-none"
          >
             <div class="sticky top-0 z-20 flex w-full items-center justify-center bg-white pt-2 pb-1 dark:bg-zinc-900">
               <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
             </div>
             <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 lg:border-r-0 px-6 py-4 bg-white dark:bg-zinc-900 sticky top-7 z-10">
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
             
             <div class="border-t border-zinc-200 dark:border-zinc-800 lg:border-r-0 p-5 bg-zinc-50 dark:bg-zinc-900/80 sticky bottom-0 z-10 flex gap-3">
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
