<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { CheckCircle2, LoaderCircle } from "lucide-svelte";
  import { onMount } from "svelte";
  import {
    completeEmailVerification,
    refreshSession,
    resolveAuthenticatedRoute,
    SIGNIN_PATH,
  } from "$lib/admin/auth";

  let status = $state<"loading" | "success" | "error">("loading");
  let error = $state("");

  onMount(async () => {
    const userId = page.url.searchParams.get("userId") || "";
    const secret = page.url.searchParams.get("secret") || "";

    if (!userId || !secret) {
      status = "error";
      error = "That verification link is incomplete or invalid.";
      return;
    }

    try {
      await completeEmailVerification({ userId, secret });
      status = "success";

      const session = await refreshSession();
      if (session.user) {
        await goto(resolveAuthenticatedRoute(session.user), { replaceState: true });
        return;
      }

      await goto(`${SIGNIN_PATH}?verified=success`, { replaceState: true });
    } catch (err) {
      status = "error";
      error =
        err instanceof Error
          ? err.message
          : "We could not verify your email with that link.";
    }
  });
</script>

<svelte:head>
  <title>Confirming Email | Sonar IDE</title>
  <meta
    name="description"
    content="Confirming your Sonar host account email address."
  />
</svelte:head>

<section class="flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
  <div class="w-full max-w-lg rounded-[2rem] border border-cyan-300/30 bg-white/85 px-8 py-10 shadow-[0_24px_60px_-30px_rgba(8,35,56,0.45)] backdrop-blur-xl dark:border-cyan-300/15 dark:bg-[#07101a]/88">
    {#if status === "loading"}
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-50 text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-500/10 dark:text-cyan-200">
        <LoaderCircle size={24} class="animate-spin" />
      </div>
      <p class="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
        Email verification
      </p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        Confirming your email
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        We’re validating the verification link and updating your account now.
      </p>
    {:else if status === "success"}
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/35 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-500/10 dark:text-emerald-200">
        <CheckCircle2 size={24} />
      </div>
      <p class="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-300">
        Verified
      </p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        Your email is confirmed
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Redirecting you to the next step...
      </p>
    {:else}
      <div class="rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
      <div class="mt-5">
        <a
          href="/admin/verify-email"
          class="inline-flex items-center justify-center rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-400"
        >
          Back to verification
        </a>
      </div>
    {/if}
  </div>
</section>
