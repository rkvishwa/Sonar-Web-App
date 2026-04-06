<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Eye, EyeOff, LoaderCircle } from "lucide-svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import { resetPassword, SIGNIN_PATH } from "$lib/admin/auth";

  let loading = $state(false);
  let success = $state(false);
  let error = $state("");
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);

  let form = $state({
    password: "",
    confirmPassword: "",
  });

  function getUserId() {
    return page.url.searchParams.get("userId") || "";
  }

  function getSecret() {
    return page.url.searchParams.get("secret") || "";
  }

  const hasResetToken = $derived(Boolean(getUserId() && getSecret()));

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = "";

    try {
      if (!getUserId() || !getSecret()) {
        throw new Error("That password reset link is incomplete or invalid.");
      }

      if (form.password.length < 8) {
        throw new Error("Use at least 8 characters for the password.");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await resetPassword({
        userId: getUserId(),
        secret: getSecret(),
        password: form.password,
      });

      success = true;
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Unable to reset your password right now.";
    } finally {
      loading = false;
    }
  }

  async function handleGoToSignIn() {
    await goto(`${SIGNIN_PATH}?reset=success`, { replaceState: true });
  }
</script>

<svelte:head>
  <title>Reset Password | Sonar IDE</title>
  <meta
    name="description"
    content="Reset the password for your Sonar host account."
  />
</svelte:head>

<AuthShell
  alternateLabel="Need the email again?"
  alternateHref="/admin/forgot-password"
  alternateCta="Resend reset link"
>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
        Password reset
      </p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        Choose a new password
      </h2>
      <p class="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Use the secure link from your email to set a new password for your host account.
      </p>
    </div>

    {#if error}
      <div class="rounded-lg border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
    {/if}

    {#if success}
      <div class="rounded-lg border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
        Your password has been updated successfully.
      </div>
      <button
        type="button"
        onclick={handleGoToSignIn}
        class="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Return to sign in
      </button>
    {:else if !hasResetToken}
      <div class="rounded-lg border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
        That password reset link is incomplete or invalid. Request a fresh recovery email to continue.
      </div>
    {:else}
      <form class="space-y-4" onsubmit={handleSubmit}>
        <label class="block">
          <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">New password</span>
          <div class="relative">
            <input
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
          <span class="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Confirm new password</span>
          <div class="relative">
            <input
              bind:value={form.confirmPassword}
              type={showConfirmPassword ? "text" : "password"}
              required
              autocomplete="new-password"
              placeholder="Repeat the new password"
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

        <button
          type="submit"
          class="mt-2 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {#if loading}
            <LoaderCircle size={18} class="animate-spin" />
            Resetting password
          {:else}
            Reset password
          {/if}
        </button>
      </form>
    {/if}
  </div>
</AuthShell>
