<script lang="ts">
  import { LoaderCircle } from "lucide-svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import { sendPasswordRecovery, SIGNIN_PATH } from "$lib/admin/auth";

  let email = $state("");
  let loading = $state(false);
  let error = $state("");
  let message = $state("");

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = "";
    message = "";

    try {
      await sendPasswordRecovery(email);
      message =
        "If that email belongs to a host account, we sent a reset link that lets you verify the request and choose a new password.";
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Unable to start password recovery right now.";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Forgot Password | Sonar IDE</title>
  <meta
    name="description"
    content="Send a password recovery email for your Sonar host account."
  />
</svelte:head>

<AuthShell
  alternateLabel="Remembered it?"
  alternateHref={SIGNIN_PATH}
  alternateCta="Back to sign in"
>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
        Account recovery
      </p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        Forgot your password?
      </h2>
      <p class="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Enter your host email and we’ll send a recovery link so you can reset the password securely.
      </p>
    </div>

    {#if error}
      <div class="rounded-lg border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
    {/if}

    {#if message}
      <div class="rounded-lg border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
        {message}
      </div>
    {/if}

    <form class="space-y-4" onsubmit={handleSubmit}>
      <label class="block">
        <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Email</span>
        <input
          bind:value={email}
          type="email"
          required
          autocomplete="email"
          placeholder="host@hackathon.com"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
        />
      </label>

      <button
        type="submit"
        class="mt-2 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
      >
        {#if loading}
          <LoaderCircle size={18} class="animate-spin" />
          Sending reset email
        {:else}
          Send reset link
        {/if}
      </button>
    </form>
  </div>
</AuthShell>
