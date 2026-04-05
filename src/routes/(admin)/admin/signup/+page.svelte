<script lang="ts">
  import { goto } from "$app/navigation";
  import { ArrowRight, Github, LoaderCircle, Lock, Mail, User2 } from "lucide-svelte";
  import { onMount } from "svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import { refreshSession, signUpWithEmail, startOAuthSignIn } from "$lib/admin/auth";

  let form = $state({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  let loading = $state(false);
  let providerLoading = $state<"google" | "github" | null>(null);
  let error = $state("");

  onMount(async () => {
    const session = await refreshSession();
    if (session.user) {
      await goto("/admin/dashboard", { replaceState: true });
    }
  });

  async function handleEmailSignup(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = "";

    try {
      if (form.password.length < 8) {
        throw new Error("Use at least 8 characters for the password.");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await signUpWithEmail({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      await goto("/admin/dashboard");
    } catch (err) {
      error = err instanceof Error ? err.message : "Unable to create the account.";
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
        err instanceof Error ? err.message : `Unable to start ${provider} sign up.`;
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
  eyebrow="Admin Portal"
  title="Create your Sonar host account"
  description="Any organizer can create a web account, then manage multiple hackathons from one place. The dashboard is already shaped for the future web-first admin flow."
  alternateLabel="Already have an account?"
  alternateHref="/admin/signin"
  alternateCta="Sign in"
>
  <div class="space-y-6">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-700 dark:text-indigo-300">
        Start hosting
      </p>
      <h2 class="mt-3 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
        Create your workspace
      </h2>
      <p class="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Sign up with email or use Google and GitHub. New accounts default to a host profile on the web app.
      </p>
    </div>

    {#if error}
      <div class="rounded-2xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
    {/if}

    <div class="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onclick={() => handleOAuth("google")}
        class="inline-flex items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-white/10 dark:bg-white/4 dark:text-zinc-100 dark:hover:border-indigo-300/35 dark:hover:text-indigo-200"
        disabled={providerLoading !== null}
      >
        {#if providerLoading === "google"}
          <LoaderCircle size={18} class="animate-spin" />
        {:else}
          <span class="text-base font-bold">G</span>
        {/if}
        Continue with Google
      </button>

      <button
        type="button"
        onclick={() => handleOAuth("github")}
        class="inline-flex items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-white/10 dark:bg-white/4 dark:text-zinc-100 dark:hover:border-indigo-300/35 dark:hover:text-indigo-200"
        disabled={providerLoading !== null}
      >
        {#if providerLoading === "github"}
          <LoaderCircle size={18} class="animate-spin" />
        {:else}
          <Github size={18} />
        {/if}
        Continue with GitHub
      </button>
    </div>

    <div class="relative py-2">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-zinc-200 dark:border-white/10"></div>
      </div>
      <div class="relative flex justify-center">
        <span class="bg-white px-4 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400 dark:bg-slate-900 dark:text-zinc-500">
          Or create an account with email
        </span>
      </div>
    </div>

    <form class="space-y-4" onsubmit={handleEmailSignup}>
      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Full name
        </span>
        <div class="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/4">
          <User2 size={18} class="text-zinc-400" />
          <input
            bind:value={form.name}
            type="text"
            required
            autocomplete="name"
            placeholder="Ava Chen"
            class="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
      </label>

      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Email
        </span>
        <div class="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/4">
          <Mail size={18} class="text-zinc-400" />
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
        <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Password
        </span>
        <div class="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/4">
          <Lock size={18} class="text-zinc-400" />
          <input
            bind:value={form.password}
            type="password"
            required
            autocomplete="new-password"
            placeholder="Choose a strong password"
            class="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
      </label>

      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Confirm password
        </span>
        <div class="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/4">
          <Lock size={18} class="text-zinc-400" />
          <input
            bind:value={form.confirmPassword}
            type="password"
            required
            autocomplete="new-password"
            placeholder="Repeat your password"
            class="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
      </label>

      <button
        type="submit"
        class="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading || providerLoading !== null}
      >
        {#if loading}
          <LoaderCircle size={18} class="animate-spin" />
          Creating account
        {:else}
          <ArrowRight size={18} />
          Create host account
        {/if}
      </button>
    </form>
  </div>
</AuthShell>
