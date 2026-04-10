<script lang="ts">
  import { goto } from "$app/navigation";
  import { LoaderCircle, MailCheck, RefreshCw } from "lucide-svelte";
  import { onMount } from "svelte";
  import AuthShell from "$lib/components/admin/AuthShell.svelte";
  import {
    refreshSession,
    resolveAuthenticatedRoute,
    sendEmailVerification,
    signOut,
    SIGNIN_PATH,
  } from "$lib/admin/auth";
  import type { HostAccount } from "$lib/admin/types";

  let currentUser = $state<HostAccount | null>(null);
  let loading = $state(true);
  let sending = $state(false);
  let refreshing = $state(false);
  let error = $state("");
  let message = $state("");

  async function loadUser() {
    const session = await refreshSession();

    if (!session.user) {
      await goto(SIGNIN_PATH, { replaceState: true });
      return null;
    }

    const target = resolveAuthenticatedRoute(session.user);
    if (target !== "/admin/verify-email") {
      await goto(target, { replaceState: true });
      return null;
    }

    currentUser = session.user;
    return session.user;
  }

  onMount(async () => {
    try {
      const user = await loadUser();
      if (user) {
        message = `A verification email was sent to ${user.email}. If you do not see it, you can resend it below.`;
      }
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Unable to load the verification page right now.";
    } finally {
      loading = false;
    }
  });

  async function handleResend() {
    sending = true;
    error = "";
    message = "";

    try {
      await sendEmailVerification();
      message = currentUser
        ? `We sent a new verification link to ${currentUser.email}.`
        : "We sent a new verification link to your email address.";
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Unable to send another verification email right now.";
    } finally {
      sending = false;
    }
  }

  async function handleRefresh() {
    refreshing = true;
    error = "";

    try {
      await loadUser();
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "Unable to refresh your verification status right now.";
    } finally {
      refreshing = false;
    }
  }

  async function handleSignOut() {
    await signOut();
    await goto(SIGNIN_PATH, { replaceState: true });
  }
</script>

<svelte:head>
  <title>Verify Email | Sonar IDE</title>
  <meta
    name="description"
    content="Verify your Sonar host account email address before continuing to the dashboard."
  />
</svelte:head>

<AuthShell
  alternateLabel="Want to use a different account?"
  alternateHref={SIGNIN_PATH}
  alternateCta="Back to sign in"
>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
        Email verification
      </p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        Confirm your inbox
      </h2>
      <p class="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Before we open the host dashboard, confirm that you own the email address on this account.
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

    {#if loading}
      <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/60 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/4 dark:text-slate-400">
        <LoaderCircle size={18} class="animate-spin text-slate-600 dark:text-slate-300" />
        Loading your account status...
      </div>
    {:else}
      <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-slate-900/50">
        <div class="flex items-start gap-3">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200">
            <MailCheck size={20} />
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {currentUser?.email || "Your email address"}
            </p>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Open the verification email, click the link, then come back here and refresh your status.
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <button
          type="button"
          onclick={handleResend}
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/4 dark:text-slate-100 dark:hover:bg-white/10"
          disabled={sending || refreshing}
        >
          {#if sending}
            <LoaderCircle size={16} class="animate-spin" />
            Sending email
          {:else}
            Resend verification email
          {/if}
        </button>

        <button
          type="button"
          onclick={handleRefresh}
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={refreshing || sending}
        >
          {#if refreshing}
            <LoaderCircle size={16} class="animate-spin" />
            Checking status
          {:else}
            <RefreshCw size={16} />
            I verified my email
          {/if}
        </button>
      </div>

      <button
        type="button"
        onclick={handleSignOut}
        class="inline-flex w-full items-center justify-center rounded-lg border border-rose-200 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-500/20 hover:text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
      >
        Sign out
      </button>
    {/if}
  </div>
</AuthShell>
