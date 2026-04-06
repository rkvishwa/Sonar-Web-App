<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { LoaderCircle } from "lucide-svelte";
  import { onMount } from "svelte";
  import {
    buildRegistrationCompletionPath,
    createOAuthSessionFromToken,
    refreshSession,
    resolveAuthenticatedRoute,
    SIGNIN_PATH,
    type OAuthFlowIntent,
    type OAuthFlowProvider,
    recordLinkedOAuthProvider,
  } from "$lib/admin/auth";

  let error = $state("");

  function getProviderFromUrl(): OAuthFlowProvider | null {
    const value = page.url.searchParams.get("provider");
    return value === "google" || value === "github" ? value : null;
  }

  function getIntentFromUrl(): OAuthFlowIntent {
    return page.url.searchParams.get("intent") === "signup" ? "signup" : "signin";
  }

  function getAccountTypeFromUrl() {
    const value = page.url.searchParams.get("accountType");
    return value === "individual" || value === "organization" ? value : null;
  }

  function getTokenUserId() {
    return String(page.url.searchParams.get("userId") || "").trim();
  }

  function getTokenSecret() {
    return String(page.url.searchParams.get("secret") || "").trim();
  }

  onMount(async () => {
    const provider = getProviderFromUrl();
    const intent = getIntentFromUrl();
    const accountType = getAccountTypeFromUrl();
    const tokenUserId = getTokenUserId();
    const tokenSecret = getTokenSecret();

    try {
      if (tokenUserId && tokenSecret) {
        await createOAuthSessionFromToken({
          userId: tokenUserId,
          secret: tokenSecret,
        });
      }

      const session = await refreshSession();

      if (!session.user) {
        await goto(`${SIGNIN_PATH}?auth=failed`, { replaceState: true });
        return;
      }

      if (provider) {
        try {
          await recordLinkedOAuthProvider(provider);
        } catch {
          // Keep the session flow moving even if provider metadata could not be stored.
        }
      }

      if (session.user.registrationCompleted) {
        await goto(resolveAuthenticatedRoute(session.user), { replaceState: true });
        return;
      }

      await goto(
        buildRegistrationCompletionPath({
          provider,
          intent,
          accountType,
        }),
        { replaceState: true },
      );
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : "We could not finish the OAuth sign-in flow right now.";
    }
  });
</script>

<svelte:head>
  <title>Completing Sign In | Sonar IDE</title>
  <meta
    name="description"
    content="Finishing your Sonar host authentication and routing you to the next step."
  />
</svelte:head>

<section class="flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
  <div class="w-full max-w-lg rounded-xl border border-slate-200 bg-white px-8 py-10 shadow-sm dark:border-white/10 dark:bg-slate-950">
    {#if error}
      <div class="rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
      <div class="mt-5">
        <a
          href="/admin/signin"
          class="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Back to sign in
        </a>
      </div>
    {:else}
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
        <LoaderCircle size={24} class="animate-spin" />
      </div>
      <p class="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
        Authentication
      </p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        Finishing your sign in
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        We’re checking your session and deciding whether to open the dashboard or continue with account setup.
      </p>
    {/if}
  </div>
</section>
