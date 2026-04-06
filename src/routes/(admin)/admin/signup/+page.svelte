<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Github, LoaderCircle, Eye, EyeOff } from "lucide-svelte";
  import { onMount } from "svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import {
    refreshSession,
    resolveAuthenticatedRoute,
    signUpWithEmail,
    startOAuthSignIn,
  } from "$lib/admin/auth";
  import { toast } from "$lib/admin/toast";

  let accountType = $state<"individual" | "organization">("individual");

  let form = $state({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    registrantRole: "",
  });
  let loading = $state(false);
  let providerLoading = $state<"google" | "github" | null>(null);
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);

  $effect(() => {
    if (accountType !== "organization") {
      form.organizationName = "";
      form.registrantRole = "";
    }
  });

  onMount(async () => {
    const session = await refreshSession();
    if (session.user) {
      await goto(resolveAuthenticatedRoute(session.user), { replaceState: true });
      return;
    }

    if (page.url.searchParams.get("auth") === "failed") {
      toast.error("OAuth sign up was cancelled or failed. Please try again.");
    }
  });

  async function handleEmailSignup(event: SubmitEvent) {
    event.preventDefault();
    loading = true;

    try {
      if (form.password.length < 8) {
        throw new Error("Use at least 8 characters for the password.");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const user = await signUpWithEmail({
        name: form.name,
        email: form.email,
        password: form.password,
        accountType,
        organizationName: form.organizationName,
        registrantRole: form.registrantRole,
      });
      await goto(resolveAuthenticatedRoute(user));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create the account.");
    } finally {
      loading = false;
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    providerLoading = provider;

    try {
      await startOAuthSignIn(provider, {
        intent: "signup",
        accountType,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Unable to start ${provider} sign up.`);
      providerLoading = null;
    }
  }
</script>

<svelte:head>
  <title>Create Host Account | Sonar IDE</title>
  <meta
    name="description"
    content="Create a Sonar host account to manage hackathons, web-side settings, and migrated admin functionality."
  />
</svelte:head>

<AuthShell
  alternateLabel="Already have an account?"
  alternateHref="/admin/signin"
  alternateCta="Sign in"
>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
        Start hosting
      </p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        Create your workspace
      </h2>

    </div>


    <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-slate-900/50">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Registration structure
        </p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose the workspace type first. OAuth sign up will continue with this selection after the provider redirects back.
        </p>
      </div>

      <div class="flex rounded-lg bg-slate-100/80 p-1 dark:bg-slate-800/40">
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

    <!-- OAuth buttons -->
    <div class="grid gap-3 sm:grid-cols-2">
      <button
        id="signup-google-btn"
        type="button"
        onclick={() => handleOAuth("google")}
        class="inline-flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:hover:bg-white/10"
        disabled={providerLoading !== null}
      >
        {#if providerLoading === "google"}
          <LoaderCircle size={16} class="animate-spin" />
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        {/if}
        Google
      </button>

      <button
        id="signup-github-btn"
        type="button"
        onclick={() => handleOAuth("github")}
        class="inline-flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:hover:bg-white/10"
        disabled={providerLoading !== null}
      >
        {#if providerLoading === "github"}
          <LoaderCircle size={16} class="animate-spin" />
        {:else}
          <Github size={16} />
        {/if}
        GitHub
      </button>
    </div>

    <p class="text-xs leading-5 text-slate-500 dark:text-slate-400">
      OAuth registration will bring you back to a short completion step to capture the remaining profile details and set an email-login password.
    </p>

    <!-- Divider -->
    <div class="flex items-center gap-4 py-1">
      <div class="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
      <span class="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500 whitespace-nowrap">
        Or create account with email
      </span>
      <div class="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
    </div>

    <!-- Form -->
    <form class="space-y-4" onsubmit={handleEmailSignup} id="signup-form">
      {#if accountType === "organization"}
        <label class="block">
          <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Organization Name</span>
          <input
            id="signup-org-name"
            bind:value={form.organizationName}
            type="text"
            required
            autocomplete="organization"
            placeholder="Acme Corp"
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
          />
        </label>
      {/if}

      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Full name</span>
        <input
          id="signup-name"
          bind:value={form.name}
          type="text"
          required
          autocomplete="name"
          placeholder="Jacky Chan"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
        />
      </label>

      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Email</span>
        <input
          id="signup-email"
          bind:value={form.email}
          type="email"
          required
          autocomplete="email"
          placeholder="host@hackathon.com"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
        />
      </label>

      {#if accountType === "organization"}
        <label class="block">
          <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Registrant Role</span>
          <input
            id="signup-role"
            bind:value={form.registrantRole}
            type="text"
            required
            placeholder="e.g. Lecturer, Organizer, Admin"
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
          />
        </label>
      {/if}

      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Password</span>
        <div class="relative">
          <input
            id="signup-password"
            bind:value={form.password}
            type={showPassword ? "text" : "password"}
            required
            autocomplete="new-password"
            placeholder="Choose a strong password"
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
          />
          <button
            type="button"
            onclick={() => showPassword = !showPassword}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {#if showPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>
      </label>

      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Confirm password</span>
        <div class="relative">
          <input
            id="signup-confirm-password"
            bind:value={form.confirmPassword}
            type={showConfirmPassword ? "text" : "password"}
            required
            autocomplete="new-password"
            placeholder="Repeat your password"
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
          />
          <button
            type="button"
            onclick={() => showConfirmPassword = !showConfirmPassword}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {#if showConfirmPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>
      </label>

      <p class="text-[11px] leading-5 text-slate-400 dark:text-slate-500 text-center">
        By registering you agree to our
        <a href="/terms" class="text-slate-600 dark:text-slate-400 hover:underline font-medium hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Terms and Conditions</a>,
        our
        <a href="/privacy" class="text-slate-600 dark:text-slate-400 hover:underline font-medium hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Privacy Policy</a>
      </p>

      <button
        id="signup-submit-btn"
        type="submit"
        class="mt-2 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading || providerLoading !== null}
      >
        {#if loading}
          <LoaderCircle size={18} class="animate-spin" />
          Creating account
        {:else}
          Create host account
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        {/if}
      </button>
    </form>
  </div>
</AuthShell>
