<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Github, LoaderCircle } from "lucide-svelte";
  import { onMount } from "svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import {
    completeOAuthRegistration,
    refreshSession,
    resolveAuthenticatedRoute,
    SIGNIN_PATH,
    type OAuthFlowProvider,
  } from "$lib/admin/auth";
  import type { HostAccount } from "$lib/admin/types";

  let accountType = $state<"individual" | "organization">("individual");
  let currentUser = $state<HostAccount | null>(null);
  let provider = $state<OAuthFlowProvider | null>(null);
  let intent = $state<"signin" | "signup">("signup");
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");

  let form = $state({
    organizationName: "",
    registrantRole: "",
  });

  function getProviderFromUrl(): OAuthFlowProvider | null {
    const value = page.url.searchParams.get("provider");
    return value === "google" || value === "github" ? value : null;
  }

  function getAccountTypeFromUrl() {
    const value = page.url.searchParams.get("accountType");
    return value === "individual" || value === "organization" ? value : null;
  }

  $effect(() => {
    if (accountType !== "organization") {
      form.organizationName = "";
      form.registrantRole = "";
    }
  });

  onMount(async () => {
    provider = getProviderFromUrl();
    intent = page.url.searchParams.get("intent") === "signin" ? "signin" : "signup";

    try {
      const session = await refreshSession();
      if (!session.user) {
        await goto(SIGNIN_PATH, { replaceState: true });
        return;
      }

      if (session.user.registrationCompleted) {
        await goto(resolveAuthenticatedRoute(session.user), { replaceState: true });
        return;
      }

      currentUser = session.user;
      form.organizationName = session.user.organizationName || "";
      form.registrantRole = session.user.registrantRole || "";
      accountType =
        session.user.accountType ||
        getAccountTypeFromUrl() ||
        "individual";

      if (!provider) {
        provider =
          session.user.authProviders.find(
            (entry): entry is OAuthFlowProvider =>
              entry === "google" || entry === "github",
          ) || null;
      }

      if (!provider) {
        error = "We could not determine which OAuth provider to finish linking. Start again from Google or GitHub sign in.";
      }
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Unable to load the registration completion form.";
    } finally {
      loading = false;
    }
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!provider) {
      error = "Restart the OAuth flow from Google or GitHub to finish this registration.";
      return;
    }

    saving = true;
    error = "";

    try {
      const user = await completeOAuthRegistration({
        accountType,
        organizationName: form.organizationName,
        registrantRole: form.registrantRole,
        provider,
      });

      await goto(resolveAuthenticatedRoute(user));
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Unable to finish setting up your account right now.";
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Complete Registration | Sonar IDE</title>
  <meta
    name="description"
    content="Finish your Sonar host registration after Google or GitHub authentication."
  />
</svelte:head>

<AuthShell
  alternateLabel="Need to restart the flow?"
  alternateHref="/admin/signin"
  alternateCta="Back to sign in"
>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
        {intent === "signin" ? "Choose account type" : "Set up your account"}
      </p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        Choose how this account should work
      </h2>
    </div>

    {#if provider}
      <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
        {#if provider === "github"}
          <Github size={14} />
          GitHub authenticated
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google authenticated
        {/if}
      </div>
    {/if}

    {#if error}
      <div class="rounded-lg border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
    {/if}

    {#if loading}
      <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/60 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/4 dark:text-slate-400">
        <LoaderCircle size={18} class="animate-spin text-slate-600 dark:text-slate-300" />
        Loading your registration details...
      </div>
    {:else}
      <form class="space-y-4" onsubmit={handleSubmit} id="complete-registration-form">
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-slate-900/50">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Account structure
          </p>
          <div class="mt-3 flex rounded-lg bg-slate-100/80 p-1 dark:bg-slate-800/40">
            <button
              type="button"
              onclick={() => accountType = "individual"}
              class={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all ${accountType === "individual" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              Individual
            </button>
            <button
              type="button"
              onclick={() => accountType = "organization"}
              class={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all ${accountType === "organization" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              Organization
            </button>
          </div>
        </div>

        <p class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-300">
          Signed in as <span class="font-semibold">{currentUser?.email || "your account"}</span>
        </p>

        {#if accountType === "organization"}
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Organization Name</span>
            <input
              bind:value={form.organizationName}
              type="text"
              required
              autocomplete="organization"
              placeholder="Acme University"
              class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Registrant Role</span>
            <input
              bind:value={form.registrantRole}
              type="text"
              required
              placeholder="e.g. Lecturer, Organizer, Admin"
              class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
            />
          </label>
        {/if}

        <p class="text-xs leading-5 text-slate-500 dark:text-slate-400">
          This onboarding step only stores the account structure for the authenticated {provider || "OAuth"} account.
        </p>

        <button
          type="submit"
          class="mt-2 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={saving || loading || !provider}
        >
          {#if saving}
            <LoaderCircle size={18} class="animate-spin" />
            Saving details
          {:else}
            Complete registration
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          {/if}
        </button>
      </form>
    {/if}
  </div>
</AuthShell>
