<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { ArrowRight, Github, LoaderCircle, Lock, Mail } from "lucide-svelte";
  import { onMount } from "svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import { refreshSession, signInWithEmail, startOAuthSignIn } from "$lib/admin/auth";

  let form = $state({
    email: "",
    password: "",
  });
  let loading = $state(false);
  let providerLoading = $state<"google" | "github" | null>(null);
  let error = $state("");

  onMount(async () => {
    const session = await refreshSession();
    if (session.user) {
      await goto("/admin/dashboard", { replaceState: true });
      return;
    }

    if (page.url.searchParams.get("auth") === "failed") {
      error = "OAuth sign in was cancelled or failed. Please try again.";
    }
  });

  async function handleEmailSignIn(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = "";

    try {
      await signInWithEmail(form);
      await goto("/admin/dashboard");
    } catch (err) {
      error = err instanceof Error ? err.message : "Unable to sign in right now.";
    } finally {
      loading = false;
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    providerLoading = provider;
    error = "";

    try {
      await startOAuthSignIn(provider);
    } catch (err) {
      error =
        err instanceof Error ? err.message : `Unable to start ${provider} sign in.`;
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
  eyebrow="Admin Portal"
  title="Sign in to your Sonar host workspace"
  description="Use your email and password or continue with Google or GitHub. Once signed in, you’ll land in the web dashboard for hackathons, analytics, and the migrated admin tools."
  alternateLabel="Need a host account?"
  alternateHref="/admin/signup"
  alternateCta="Create one"
>
  <div class="space-y-5">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        Welcome back
      </p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        Host Sign In
      </h2>
      <p class="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        This route is web-only and does not modify the Electron codebase.
      </p>
    </div>

    {#if error}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
        {error}
      </div>
    {/if}

    <div class="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onclick={() => handleOAuth("google")}
        class="inline-flex items-center justify-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        disabled={providerLoading !== null}
      >
        {#if providerLoading === "google"}
          <LoaderCircle size={16} class="animate-spin" />
        {:else}
          <span class="text-sm font-bold">G</span>
        {/if}
        Continue with Google
      </button>

      <button
        type="button"
        onclick={() => handleOAuth("github")}
        class="inline-flex items-center justify-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        disabled={providerLoading !== null}
      >
        {#if providerLoading === "github"}
          <LoaderCircle size={16} class="animate-spin" />
        {:else}
          <Github size={16} />
        {/if}
        Continue with GitHub
      </button>
    </div>

    <div class="relative py-1">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
      </div>
      <div class="relative flex justify-center">
        <span class="bg-white px-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
          Or sign in with email
        </span>
      </div>
    </div>

    <form class="space-y-4" onsubmit={handleEmailSignIn}>
      <label class="block">
        <span class="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email</span>
        <div class="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
          <Mail size={16} class="text-zinc-400" />
          <input
            bind:value={form.email}
            type="email"
            required
            autocomplete="email"
            placeholder="host@hackathon.com"
            class="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
      </label>

      <label class="block">
        <span class="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Password</span>
        <div class="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
          <Lock size={16} class="text-zinc-400" />
          <input
            bind:value={form.password}
            type="password"
            required
            autocomplete="current-password"
            placeholder="Enter your password"
            class="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
      </label>

      <button
        type="submit"
        class="inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading || providerLoading !== null}
      >
        {#if loading}
          <LoaderCircle size={16} class="animate-spin" />
          Signing in
        {:else}
          <ArrowRight size={16} />
          Open dashboard
        {/if}
      </button>
    </form>
  </div>
</AuthShell>

