<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    AlertTriangle,
    Globe,
    KeyRound,
    LoaderCircle,
    RefreshCw,
    Save,
    Search,
    ShieldAlert,
    Palette
  } from "lucide-svelte";
  import { updateGlobalSettings } from "$lib/admin/api";
  import {
    changeCurrentPassword,
  } from "$lib/admin/auth";
  import type {
    GlobalSettings,
  } from "$lib/admin/types";
  import {
    isAuthRedirectRequiredError,
  } from "$lib/admin/hostDashboard";
  import { adminStore } from "$lib/admin/adminStore.svelte";
  import Skeleton from "$lib/components/admin/Skeleton.svelte";

  let localGlobalSettings = $state<GlobalSettings | null>(null);

  let currentUser = $derived(adminStore.currentUser);
  let snapshot = $derived(adminStore.snapshot);
  let loading = $derived(adminStore.loading);
  let refreshing = $derived(adminStore.refreshing);
  let dashboardError = $derived(adminStore.error);
  let hostedHackathonCount = $derived(adminStore.hackathons.length);

  // Initialize local settings copy when store data arrives
  $effect(() => {
    const storeSettings = adminStore.globalSettings;
    if (storeSettings && !localGlobalSettings) {
      localGlobalSettings = { ...storeSettings };
    }
  });

  let savingGlobalSettings = $state(false);
  let updatingPassword = $state(false);
  let activeTab = $state<"global" | "account" | "appearance">("global");
  let searchQuery = $state("");
  let searchLower = $derived(searchQuery.toLowerCase());
  let matchesGlobal = $derived(searchLower === "" || "global default hackathon internet empty workspace network".includes(searchLower));
  let matchesAccount = $derived(searchLower === "" || "account security password profile email".includes(searchLower));
  let matchesAppearance = $derived(searchLower === "" || "appearance theme color mode dark light system accent default".includes(searchLower));

  let currentTheme = $state<"light" | "dark" | "system">("system");
  let currentAccent = $state<string>("#4f46e5");

  const defaultAccents = [
    { label: "Indigo (Default)", value: "#4f46e5" },
    { label: "Blue", value: "#3b82f6" },
    { label: "Violet", value: "#8b5cf6" },
    { label: "Emerald", value: "#10b981" },
    { label: "Rose", value: "#f43f5e" },
    { label: "Amber", value: "#f59e0b" }
  ];

  function applyTheme(theme: "light" | "dark" | "system") {
    currentTheme = theme;
    if (theme === "system") {
      localStorage.removeItem("theme");
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      localStorage.theme = theme;
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }

  function applyAccent(color: string) {
    currentAccent = color;
    localStorage.setItem("accentColor", color);

    function mixColors(color1: string, color2: string, weight: number): string {
      const c1 = [parseInt(color1.slice(1,3),16), parseInt(color1.slice(3,5),16), parseInt(color1.slice(5,7),16)];
      const c2 = [parseInt(color2.slice(1,3),16), parseInt(color2.slice(3,5),16), parseInt(color2.slice(5,7),16)];
      const mixed = c1.map((v, i) => Math.round(v * (1 - weight) + c2[i] * weight));
      return '#' + mixed.map(v => v.toString(16).padStart(2, '0')).join('');
    }

    const colors = {
      50: mixColors(color, '#ffffff', 0.95),
      100: mixColors(color, '#ffffff', 0.9),
      200: mixColors(color, '#ffffff', 0.75),
      300: mixColors(color, '#ffffff', 0.6),
      400: mixColors(color, '#ffffff', 0.3),
      500: color,
      600: mixColors(color, '#000000', 0.1),
      700: mixColors(color, '#000000', 0.3),
      800: mixColors(color, '#000000', 0.5),
      900: mixColors(color, '#000000', 0.7),
      950: mixColors(color, '#000000', 0.85)
    };

    let style = document.getElementById("accent-theme-override");
    if (!style) {
      style = document.createElement("style");
      style.id = "accent-theme-override";
      document.head.appendChild(style);
    }
    
    let css = ':root { ';
    Object.entries(colors).forEach(([shade, val]) => {
      css += `--color-indigo-${shade}: ${val}; `;
    });
    css += '}';
    style.innerHTML = css;
  }


  let passwordForm = $state({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  let actionError = $state("");
  let actionMessage = $state("");

  async function handleRefresh() {
    try {
      await adminStore.forceRefresh();
      // Refresh local settings copy
      localGlobalSettings = { ...adminStore.globalSettings };
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
      }
    }
  }

  onMount(async () => {
    // Init theme
    if (localStorage.theme === "light" || localStorage.theme === "dark") {
      currentTheme = localStorage.theme;
    } else {
      currentTheme = "system";
    }

    // Init accent
    const savedAccent = localStorage.getItem("accentColor");
    if (savedAccent) {
      currentAccent = savedAccent;
    }

    try {
      await adminStore.ensure();
      if (!adminStore.currentUser) {
        await goto("/admin/signin", { replaceState: true });
        return;
      }
      localGlobalSettings = { ...adminStore.globalSettings };
    } catch (err) {
      if (isAuthRedirectRequiredError(err)) {
        await goto(err.target, { replaceState: true });
      }
    }
  });

  async function handleSaveGlobalSettings() {
    if (!localGlobalSettings) return;

    savingGlobalSettings = true;
    actionError = "";
    actionMessage = "";

    try {
      await updateGlobalSettings(localGlobalSettings);
      adminStore.invalidate();
      actionMessage = "Saved your global host settings.";
    } catch (err) {
      actionError =
        err instanceof Error ? err.message : "Unable to save global settings.";
    } finally {
      savingGlobalSettings = false;
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
</script>

<svelte:head>
  <title>Settings | Sonar</title>
  <meta
    name="description"
    content="Manage host-level default settings and account preferences."
  />
</svelte:head>

{#if loading}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <!-- Header skeleton -->
      <div class="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton variant="text" width="140px" height="24px" />
          <div class="flex gap-3">
            <Skeleton variant="text" width="200px" height="38px" />
            <Skeleton variant="text" width="100px" height="38px" />
          </div>
        </div>
      </div>

      <!-- Settings body skeleton -->
      <div class="mt-6 flex flex-col gap-8 md:flex-row lg:mt-8 lg:gap-10">
        <!-- Sidebar skeleton -->
        <aside class="w-full shrink-0 space-y-2 md:w-48">
          {#each Array(3) as _}
            <Skeleton variant="text" width="100%" height="36px" />
          {/each}
        </aside>

        <!-- Content skeleton -->
        <div class="min-w-0 flex-1 space-y-6">
          <div class="flex items-center gap-3 mb-6">
            <Skeleton variant="circle" width="32px" height="32px" />
            <Skeleton variant="text" width="180px" height="18px" />
          </div>
          <Skeleton variant="text" width="100%" height="14px" />
          <div class="space-y-px rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {#each Array(2) as _}
              <div class="flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-900">
                <div class="flex flex-col gap-1.5 flex-1">
                  <Skeleton variant="text" width="160px" height="14px" />
                  <Skeleton variant="text" width="280px" height="11px" />
                </div>
                <Skeleton variant="text" width="44px" height="24px" />
              </div>
            {/each}
          </div>
          <Skeleton variant="text" width="130px" height="38px" />
        </div>
      </div>
    </div>
  </section>
{:else}
  <section class="p-4 pb-20 sm:p-6 lg:p-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">

      <!-- Page Header -->
      <div class="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="max-w-3xl">
            <h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Settings
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
              onclick={handleRefresh}
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

      <div class="mt-6 flex flex-col gap-8 md:flex-row lg:mt-8 lg:gap-10">
        <!-- Sidebar Navigation -->
        {#if !searchQuery}
        <aside class="w-full shrink-0 space-y-0.5 border-r border-zinc-100 pr-0 md:w-48 md:pr-6 dark:border-zinc-800/50">
          <button
            type="button"
            onclick={() => activeTab = 'global'}
            class={`flex w-full items-center justify-between rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            }`}
          >
            Global Settings
          </button>
          
          <button
            type="button"
            onclick={() => activeTab = 'account'}
            class={`flex w-full items-center justify-between rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'account'
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            }`}
          >
            Account & Security
          </button>
          <button
            type="button"
            onclick={() => activeTab = 'appearance'}
            class={`flex w-full items-center justify-between rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'appearance'
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            }`}
          >
            Appearance
          </button>
        </aside>
        {/if}

        <!-- Tab Content -->
        <div class="min-w-0 flex-1">
          {#if (searchQuery ? matchesGlobal : activeTab === 'global')}
            <!-- Global Settings -->
            <div class="max-w-2xl pb-8">
              <div class="mb-6 flex items-center gap-3">
                <div class="rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <Globe size={16} class="text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Workspace Defaults</h2>
                </div>
              </div>

              <div class="mb-6 rounded-md border-l-2 border-indigo-500 bg-indigo-50/50 p-3 dark:bg-indigo-950/20">
                <p class="text-xs text-indigo-800 dark:text-indigo-300">
                  These values prefill every new hackathon you create. Individual events can still override these restrictions from their own hackathon settings pages.
                </p>
              </div>

              {#if localGlobalSettings}
                <div class="mb-6 overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
                  <div class="flex flex-col space-y-px">
                    <div class="flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80">
                      <div class="flex-1 pr-4">
                        <span class="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Block internet access</span>
                        <span class="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Prevent network access inside isolated workspaces by default</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label="Toggle default internet restriction"
                        aria-checked={localGlobalSettings.blockInternetAccess}
                        onclick={() => { if (localGlobalSettings) localGlobalSettings.blockInternetAccess = !localGlobalSettings.blockInternetAccess; }}
                        class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${localGlobalSettings.blockInternetAccess ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          aria-hidden="true"
                          class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localGlobalSettings.blockInternetAccess ? 'translate-x-5' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>

                    <div class="flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80">
                      <div class="flex-1 pr-4">
                        <span class="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Require empty workspaces</span>
                        <span class="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Ensure new environments start completely empty</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label="Toggle default empty workspace restriction"
                        aria-checked={localGlobalSettings.blockNonEmptyWorkspace}
                        onclick={() => { if (localGlobalSettings) localGlobalSettings.blockNonEmptyWorkspace = !localGlobalSettings.blockNonEmptyWorkspace; }}
                        class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${localGlobalSettings.blockNonEmptyWorkspace ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          aria-hidden="true"
                          class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localGlobalSettings.blockNonEmptyWorkspace ? 'translate-x-5' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onclick={handleSaveGlobalSettings}
                  class="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingGlobalSettings || !snapshot.capabilities.canManagePlatform}
                >
                  {#if savingGlobalSettings}
                    <LoaderCircle size={14} class="animate-spin" /> Saving Defaults...
                  {:else}
                    <Save size={14} /> Save Defaults
                  {/if}
                </button>
              {/if}
            </div>
          {/if}

          {#if (searchQuery ? matchesAppearance : activeTab === 'appearance')}
            <!-- Appearance Settings -->
            <div class="max-w-2xl pb-8">
              <div class="mb-6 flex items-center gap-3">
                <div class="rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <Palette size={16} class="text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Appearance</h2>
                </div>
              </div>

              <!-- Theme Selection -->
              <div class="mb-8">
                <h3 class="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">Theme Preference</h3>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <button
                    type="button"
                    onclick={() => applyTheme('light')}
                    class={`flex items-center justify-center gap-3 rounded-lg border bg-white p-4 transition-all hover:bg-zinc-50 ${currentTheme === 'light' ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-sm' : 'border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/50'}`}
                  >
                    <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Light</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => applyTheme('dark')}
                    class={`flex items-center justify-center gap-3 rounded-lg border bg-zinc-900 p-4 transition-all hover:bg-zinc-800 ${currentTheme === 'dark' ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-sm' : 'border-zinc-200 dark:border-zinc-800'}`}
                  >
                    <span class="text-sm font-medium text-zinc-100">Dark</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => applyTheme('system')}
                    class={`flex items-center justify-center gap-3 rounded-lg border bg-gradient-to-br from-white to-zinc-900 p-4 transition-all hover:opacity-90 ${currentTheme === 'system' ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-sm' : 'border-zinc-200 dark:border-zinc-800'}`}
                  >
                    <span class="text-sm font-medium text-zinc-900 drop-shadow-md">System</span>
                  </button>
                </div>
              </div>

              <!-- Accent Color Selection -->
              <div>
                <h3 class="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Accent Color</h3>
                <p class="mb-4 text-xs text-zinc-500 dark:text-zinc-400">Choose a primary color applied across the entire site.</p>
                <div class="flex flex-wrap items-center gap-4">
                  {#each defaultAccents as accent}
                    <button
                      type="button"
                      title={accent.label}
                      onclick={() => applyAccent(accent.value)}
                      class={`relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentAccent === accent.value ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-zinc-950 scale-110' : ''}`}
                      style="background-color: {accent.value};"
                    >
                    </button>
                  {/each}

                  <!-- Custom Color Picker -->
                  <div class="relative ml-2 flex items-center gap-3 border-l border-zinc-200 pl-6 dark:border-zinc-800">
                    <label for="custom-color" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Custom:</label>
                    <div class="relative h-10 w-10 overflow-hidden rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                      <input
                        id="custom-color"
                        type="color"
                        value={currentAccent}
                        onchange={(e) => applyAccent(e.currentTarget.value)}
                        class="absolute -left-2 -top-2 h-14 w-14 cursor-pointer appearance-none border-0 bg-transparent p-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
          
          {#if (searchQuery ? matchesAccount : activeTab === 'account')}
            <!-- Account -->
            <div class="max-w-2xl pb-8">
              <div class="mb-6 flex items-center gap-3">
                <div class="rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <KeyRound size={16} class="text-zinc-700 dark:text-zinc-300" />
                </div>
                <div>
                  <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Profile Information</h2>
                </div>
              </div>

              <div class="mb-8 max-w-md">
                <div class="rounded-md border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Signed In As</h3>
                  <div class="mt-2 text-base font-medium text-zinc-900 dark:text-white">{currentUser?.name}</div>
                  <div class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{currentUser?.email}</div>
                </div>
              </div>

              <div class="mt-10">
                <div class="mb-5 flex items-center gap-3">
                  <div class="rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <ShieldAlert size={16} class="text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Security Settings</h2>
                  </div>
                </div>

                <form class="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/20" onsubmit={handlePasswordUpdate}>
                  <div class="border-b border-zinc-200 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h3 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Change Password</h3>
                    <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ensure your account is using a long, random password to stay secure.</p>
                  </div>
                  
                  <div class="space-y-6 p-5 sm:p-6 dark:bg-zinc-900/30">
                    <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
                      <div class="md:col-span-1">
                        <label for="current_password" class="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Current Password</label>
                        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Required to verify your identity.</p>
                      </div>
                      <div class="max-w-md md:col-span-2">
                        <input
                          id="current_password"
                          bind:value={passwordForm.currentPassword}
                          type="password"
                          required
                          autocomplete="current-password"
                          class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <hr class="border-zinc-200 dark:border-zinc-800/50" />

                    <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
                      <div class="md:col-span-1">
                        <label for="new_password" class="block text-sm font-medium text-zinc-900 dark:text-zinc-100">New Password</label>
                        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Must be at least 8 characters.</p>
                      </div>
                      <div class="max-w-md space-y-4 md:col-span-2">
                        <input
                          id="new_password"
                          bind:value={passwordForm.nextPassword}
                          type="password"
                          required
                          autocomplete="new-password"
                          placeholder="New password"
                          class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                        <input
                          id="confirm_password"
                          bind:value={passwordForm.confirmPassword}
                          type="password"
                          required
                          autocomplete="new-password"
                          placeholder="Confirm new password"
                          class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex justify-end border-t border-zinc-200 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <button
                      type="submit"
                      class="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      disabled={updatingPassword}
                    >
                      {#if updatingPassword}
                        <LoaderCircle size={14} class="animate-spin" /> Updating...
                      {:else}
                        Update Password
                      {/if}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          {/if}
          
          {#if searchQuery && !matchesGlobal && !matchesAccount}
            <div class="py-16 text-center">
              <Search size={32} class="mx-auto text-zinc-300 dark:text-zinc-700" />
              <h3 class="mt-4 text-sm font-medium text-zinc-900 dark:text-white">No settings found</h3>
              <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">We couldn't find anything matching "{searchQuery}".</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
{/if}
