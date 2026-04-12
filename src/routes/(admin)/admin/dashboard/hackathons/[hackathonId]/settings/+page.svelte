<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import {
    AlertTriangle,
    Globe,
    LoaderCircle,
    RefreshCw,
    Save,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
  } from "lucide-svelte";
  import {
    deleteHackathon,
    updateHackathon,
  } from "$lib/admin/api";
  import type {
    AdminSnapshot,
    HackathonRecord,
    HostAccount,
  } from "$lib/admin/types";
  import {
    buildHackathonRoute,
    cloneHackathon,
    emptySnapshot,
    isAuthRedirectRequiredError,
    loadHackathonWorkspace,
  } from "$lib/admin/hostDashboard";
  import { formatDateTime } from "$lib/admin/analytics";

  let currentUser = $state<HostAccount | null>(null);
  let snapshot = $state<AdminSnapshot>(emptySnapshot);
  let hackathon = $state<HackathonRecord | null>(null);
  let hackathonEditor = $state<HackathonRecord | null>(null);
  let hackathonWarning = $state<string | null>(null);

  let loading = $state(true);
  let refreshing = $state(false);
  let savingHackathon = $state(false);
  let deletingHackathon = $state(false);

  let dashboardError = $state("");
  let actionError = $state("");
  let actionMessage = $state("");
  let activeHackathonKey = "";

  let activeTab = $state<"details" | "restrictions" | "danger">("details");
  let searchQuery = $state("");
  let searchLower = $derived(searchQuery.toLowerCase());
  let matchesDetails = $derived(searchLower === "" || (hackathonEditor?.name?.toLowerCase().includes(searchLower) || hackathonEditor?.description?.toLowerCase().includes(searchLower) || hackathonEditor?.status?.toLowerCase().includes(searchLower) || hackathonEditor?.hackathonId?.toLowerCase().includes(searchLower)));
  let matchesRestrictions = $derived(searchLower === "" || "block internet empty workspace network".includes(searchLower));
  let matchesDanger = $derived(searchLower === "" || "danger delete remove destroy erase".includes(searchLower));


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
      hackathonEditor = cloneHackathon(data.hackathon);
      hackathonWarning = data.hackathonWarning;
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
        return;
      }

      dashboardError =
        err instanceof Error
          ? err.message
          : "Unable to load this hackathon's settings right now.";
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  onMount(() => {
    const currentId = decodeURIComponent(page.params.hackathonId || "");
    activeHackathonKey = currentId;
    void loadPage(currentId);
  });

  $effect(() => {
    const nextHackathonId = decodeURIComponent(page.params.hackathonId || "");
    if (!nextHackathonId || nextHackathonId === activeHackathonKey) {
      return;
    }

    activeHackathonKey = nextHackathonId;
    void loadPage(nextHackathonId);
  });

  async function handleSaveHackathon() {
    if (!currentUser || !hackathonEditor) {
      return;
    }

    savingHackathon = true;
    actionError = "";
    actionMessage = "";

    try {
      const previousHackathonId = hackathon?.hackathonId || hackathonEditor.hackathonId;
      const updated = await updateHackathon(currentUser, hackathonEditor);

      hackathon = updated.record;
      hackathonEditor = cloneHackathon(updated.record);
      hackathonWarning = updated.warning;
      actionMessage = `Saved "${updated.record.name}".`;

      if (updated.record.hackathonId !== previousHackathonId) {
        activeHackathonKey = updated.record.hackathonId;
        await goto(buildHackathonRoute(updated.record.hackathonId, "settings"));
      }
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

    if (!window.confirm(`Delete "${hackathonEditor.name}" from this workspace?`)) {
      return;
    }

    deletingHackathon = true;
    actionError = "";
    actionMessage = "";

    try {
      await deleteHackathon(hackathonEditor);
      await goto("/admin/dashboard/hackathons");
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to delete the hackathon.";
    } finally {
      deletingHackathon = false;
    }
  }
</script>

<svelte:head>
  <title>{hackathon ? `${hackathon.name} Settings | Sonar` : "Settings | Sonar"}</title>
  <meta
    name="description"
    content="Settings for a single hackathon, including event metadata and event-specific restriction overrides."
  />
</svelte:head>

{#if loading}
  <div class="flex min-h-[56vh] items-center justify-center">
    <div class="p-8 text-center bg-transparent">
      <LoaderCircle size={32} class="mx-auto animate-spin text-indigo-600 dark:text-indigo-400" />
      <h1 class="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Loading hackathon settings</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        We're pulling the event metadata and its event-only restriction overrides.
      </p>
    </div>
  </div>
{:else}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">

      <!-- Page Header -->
      <div class="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="max-w-3xl">
            <h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {hackathon?.name || "Hackathon Settings"}
            </h1>
          </div>
          <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div class="relative w-full sm:w-64">
              <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="Search settings..." 
                class="w-full rounded-md border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onclick={() => {
                const currentId = decodeURIComponent(page.params.hackathonId || "");
                void loadPage(currentId, { silent: true });
              }}
              class="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {#if refreshing}
                <LoaderCircle size={14} class="animate-spin" />
              {:else}
                <RefreshCw size={14} />
              {/if}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {#if dashboardError}
        <div class="rounded-md border-l-2 border-rose-500 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
          {dashboardError}
        </div>
      {/if}

      {#if hackathonWarning}
        <div class="rounded-md border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
          {hackathonWarning}
        </div>
      {/if}

      {#if snapshot.warnings.length}
        <div class="rounded-md border-l-2 border-amber-500 bg-amber-50 px-3 py-2 dark:bg-amber-950/50">
          <div class="flex items-start gap-2">
            <AlertTriangle size={14} class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div class="space-y-1 text-xs font-medium text-amber-800 dark:text-amber-400">
              {#each snapshot.warnings as warning}
                <p>{warning}</p>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      {#if actionMessage}
        <div class="rounded-md border-l-2 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          {actionMessage}
        </div>
      {/if}

      {#if actionError}
        <div class="rounded-md border-l-2 border-rose-500 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
          {actionError}
        </div>
      {/if}

      <div class="mt-6 flex flex-col gap-8 md:flex-row xl:mt-8 xl:gap-10">
        <!-- Sidebar Navigation -->
        {#if !searchQuery}
        <aside class="w-full shrink-0 space-y-0.5 border-r border-zinc-100 pr-0 md:w-56 md:pr-6 dark:border-zinc-800/50">
          <button
            type="button"
            onclick={() => activeTab = 'details'}
            class={`flex w-full items-center justify-between rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            }`}
          >
            Event Details
          </button>
          
          <button
            type="button"
            onclick={() => activeTab = 'restrictions'}
            class={`flex w-full items-center justify-between rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'restrictions'
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            }`}
          >
            Access & Restrictions
          </button>

          <button
            type="button"
            onclick={() => activeTab = 'danger'}
            class={`flex w-full items-center justify-between rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'danger'
                ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                : "text-rose-600/70 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400/70 dark:hover:bg-rose-900/10 dark:hover:text-rose-400"
            }`}
          >
            Danger Zone
          </button>
        </aside>
        {/if}

        <!-- Tab Content -->
        <div class="min-w-0 flex-1">
          {#if hackathonEditor}
            {#if (searchQuery ? matchesDetails : activeTab === 'details')}
              <!-- Event Details -->
              <div class="max-w-2xl pb-8">
                <div class="mb-6 flex items-center gap-3">
                  <div class="rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <Globe size={16} class="text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Metadata for this hackathon</h2>
                  </div>
                </div>

                <div class="mt-5 space-y-6">
                  <div class="grid grid-cols-1 gap-6">
                    <label class="block">
                      <span class="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">Hackathon ID</span>
                      <div class="relative">
                        <input
                          value={hackathonEditor.hackathonId}
                          type="text"
                          readonly
                          class="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm tracking-wider text-zinc-600 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                        />
                      </div>
                      <span class="mt-1.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        This unique identifier is used for API access and workspace isolation.
                      </span>
                    </label>

                    <label class="block">
                      <span class="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">Name</span>
                      <input
                        bind:value={hackathonEditor.name}
                        type="text"
                        placeholder="e.g. Sonic 2024"
                        class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                    </label>

                    <label class="block">
                      <span class="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">Status</span>
                      <select
                        bind:value={hackathonEditor.status}
                        class="block w-full sm:w-64 rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="live">Live</option>
                        <option value="archived">Archived</option>
                      </select>
                      <p class="mt-2 max-w-2xl text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Draft is for setup and review before the event starts. Live marks an active event for dashboard reporting. Archived closes the event and blocks new team sign-ins and registrations.
                      </p>
                    </label>

                    <label class="block">
                      <span class="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">Description</span>
                      <textarea
                        bind:value={hackathonEditor.description}
                        rows="3"
                        placeholder="Describe the purpose of this hackathon..."
                        class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-600 dark:focus:bg-zinc-950 resize-none"
                      ></textarea>
                    </label>

                    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <label class="block">
                        <span class="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">Start Date</span>
                        <input
                          bind:value={hackathonEditor.startDate}
                          type="datetime-local"
                          class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                      </label>

                      <label class="block">
                        <span class="mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">End Date</span>
                        <input
                          bind:value={hackathonEditor.endDate}
                          type="datetime-local"
                          class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                      </label>
                    </div>
                  </div>

                  <div class="pt-4">
                    <button
                      type="button"
                      onclick={handleSaveHackathon}
                      class="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingHackathon}
                    >
                      {#if savingHackathon}
                        <LoaderCircle size={14} class="animate-spin" /> Saving Changes...
                      {:else}
                        <Save size={14} /> Save Metadata
                      {/if}
                    </button>
                  </div>
                </div>
              </div>
            {/if}

            {#if (searchQuery ? matchesRestrictions : activeTab === 'restrictions')}
              <!-- Access & Restrictions -->
              <div class="max-w-2xl pb-8">
                <div class="mb-6 flex items-center gap-3">
                  <div class="rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <ShieldAlert size={16} class="text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Overrides for this event</h2>
                  </div>
                </div>

                <div class="mb-6 rounded-md border-l-2 border-indigo-500 bg-indigo-50/50 p-3 dark:bg-indigo-950/20">
                  <p class="text-xs text-indigo-800 dark:text-indigo-300">
                    These values affect only this event and override host-level defaults.
                  </p>
                </div>

                <div class="mb-8 overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
                  <div class="flex flex-col space-y-px">
                    <div class="flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80">
                      <div class="flex-1 pr-4">
                        <span class="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Block internet access</span>
                        <span class="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Prevent network access inside isolated workspaces for this event</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label="Toggle internet access restriction"
                        aria-checked={hackathonEditor!.settings.blockInternetAccess}
                        onclick={() => hackathonEditor!.settings.blockInternetAccess = !hackathonEditor!.settings.blockInternetAccess}
                        class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${hackathonEditor!.settings.blockInternetAccess ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          aria-hidden="true"
                          class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hackathonEditor!.settings.blockInternetAccess ? 'translate-x-5' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>

                    <div class="flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80">
                      <div class="flex-1 pr-4">
                        <span class="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Require empty workspaces</span>
                        <span class="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Ensure new environments for this event start completely empty</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label="Toggle empty workspace restriction"
                        aria-checked={hackathonEditor!.settings.blockNonEmptyWorkspace}
                        onclick={() => hackathonEditor!.settings.blockNonEmptyWorkspace = !hackathonEditor!.settings.blockNonEmptyWorkspace}
                        class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${hackathonEditor!.settings.blockNonEmptyWorkspace ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          aria-hidden="true"
                          class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hackathonEditor!.settings.blockNonEmptyWorkspace ? 'translate-x-5' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-4">
                  <div class="pt-4">
                    <button
                      type="button"
                      onclick={handleSaveHackathon}
                      class="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingHackathon}
                    >
                      {#if savingHackathon}
                        <LoaderCircle size={14} class="animate-spin" /> Saving...
                      {:else}
                        <Save size={14} /> Save Settings
                      {/if}
                    </button>
                  </div>
                </div>
              </div>
            {/if}


            {#if (searchQuery ? matchesDanger : activeTab === 'danger')}
              <!-- Danger Zone -->
              <div class="max-w-2xl pb-8">
                <div class="mb-6 flex items-center gap-3">
                  <div class="rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <Trash2 size={16} class="text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h2 class="text-base font-semibold text-rose-600 dark:text-rose-400">Delete this hackathon</h2>
                  </div>
                </div>

                <div class="rounded-lg border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <p class="text-sm text-rose-800 dark:text-rose-300">
                    This action will permanently remove <span class="font-bold">{hackathon?.name}</span> from this workspace. All associated event metadata will be lost. This action cannot be undone.
                  </p>
                  
                  <div class="mt-6">
                    <button
                      type="button"
                      onclick={handleDeleteHackathon}
                      class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deletingHackathon}
                    >
                      {#if deletingHackathon}
                        <LoaderCircle size={16} class="animate-spin" /> Deleting hackathon...
                      {:else}
                        <Trash2 size={16} /> Permanently Delete Hackathon
                      {/if}
                    </button>
                  </div>
                </div>
              </div>
            {/if}

            {#if searchQuery && !matchesDetails && !matchesRestrictions && !matchesDanger}
              <div class="py-16 text-center">
                <Search size={32} class="mx-auto text-zinc-300 dark:text-zinc-700" />
                <h3 class="mt-4 text-sm font-medium text-zinc-900 dark:text-white">No settings found</h3>
                <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">We couldn't find anything matching "{searchQuery}".</p>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </section>
{/if}
