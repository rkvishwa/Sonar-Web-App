<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Github, LoaderCircle, Eye, EyeOff } from "lucide-svelte";
  import { onMount } from "svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import {
    FORGOT_PASSWORD_PATH,
    refreshSession,
    resolveAuthenticatedRoute,
    signInWithEmail,
    startOAuthSignIn,
  } from "$lib/admin/auth";
  import { toast } from "$lib/admin/toast";

  let form = $state({
    email: "",
    password: "",
  });
  let loading = $state(false);
  let providerLoading = $state<"google" | "github" | null>(null);
  let showPassword = $state(false);

  onMount(async () => {
    document.body.classList.remove("overflow-hidden");
    document.documentElement.classList.remove("overflow-hidden");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");

    const session = await refreshSession();
    if (session.user) {
      await goto(resolveAuthenticatedRoute(session.user), { replaceState: true });
      return;
    }

    if (page.url.searchParams.get("auth") === "failed") {
      toast.error("OAuth sign in was cancelled or failed. Please try again.");
      return;
    }

    if (page.url.searchParams.get("verified") === "success") {
      toast.success("Your email has been verified. You can sign in now.");
      return;
    }

    if (page.url.searchParams.get("reset") === "success") {
      toast.success("Your password has been reset. Sign in with the new password.");
    }
  });

  async function handleEmailSignIn(event: SubmitEvent) {
    event.preventDefault();
    loading = true;

    try {
      const user = await signInWithEmail(form);
      await goto(resolveAuthenticatedRoute(user));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in right now.");
    } finally {
      loading = false;
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    providerLoading = provider;

    try {
      await startOAuthSignIn(provider, {
        intent: "signin",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Unable to start ${provider} sign in.`);
      providerLoading = null;
    }
  }
</script>

<svelte:head>
  <title>Host Sign In | Sonar IDE</title>
  <meta
    name="description"
    content="Sign in to the Sonar web admin portal to manage hackathons, host settings, and monitoring."
  />
</svelte:head>

<AuthShell
  alternateLabel="Need a host account?"
  alternateHref="/admin/signup"
  alternateCta="Create one"
>
  <div class="space-y-5">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
        Welcome back
      </p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        Host Sign In
      </h2>
      <p class="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
        This route is web-only and does not modify the Electron codebase.
      </p>
    </div>


    <!-- OAuth buttons -->
    <div class="grid gap-3 sm:grid-cols-2">
      <button
        id="signin-google-btn"
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
        id="signin-github-btn"
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

    <!-- Divider -->
    <div class="flex items-center gap-4 py-1">
      <div class="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
      <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">
        Or sign in with email
      </span>
      <div class="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
    </div>

    <!-- Form -->
    <form class="space-y-4" onsubmit={handleEmailSignIn} id="signin-form">
      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Email</span>
        <input
          id="signin-email"
          bind:value={form.email}
          type="email"
          required
          autocomplete="email"
          placeholder="host@hackathon.com"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
        />
      </label>

      <label class="block">
        <div class="mb-2 flex items-center justify-between gap-3">
          <span class="block text-sm font-semibold text-slate-800 dark:text-slate-100">Password</span>
          <a
            href={FORGOT_PASSWORD_PATH}
            class="text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Forgot password?
          </a>
        </div>
        <div class="relative">
          <input
            id="signin-password"
            bind:value={form.password}
            type={showPassword ? "text" : "password"}
            required
            autocomplete="current-password"
            placeholder="Enter your password"
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

      <button
        id="signin-submit-btn"
        type="submit"
        class="mt-2 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading || providerLoading !== null}
      >
        {#if loading}
          <LoaderCircle size={18} class="animate-spin" />
          Signing in
        {:else}
          Login
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        {/if}
      </button>
    </form>
  </div>
</AuthShell>
