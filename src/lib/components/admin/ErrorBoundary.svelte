<script lang="ts">
  import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-svelte";
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
    fallback?: Snippet<[{ error: Error; reset: () => void }]>;
  }

  let { children, fallback }: Props = $props();

  let caughtError = $state<Error | null>(null);
  let showDetails = $state(false);
  let key = $state(0);

  function handleError(error: unknown) {
    if (error instanceof Error) {
      caughtError = error;
    } else {
      caughtError = new Error(String(error));
    }
  }

  function reset() {
    caughtError = null;
    showDetails = false;
    key += 1;
  }
</script>

{#if caughtError}
  {#if fallback}
    {@render fallback({ error: caughtError, reset })}
  {:else}
    <div class="mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 shadow-sm ring-1 ring-rose-200/60 dark:bg-rose-950/30 dark:ring-rose-800/40">
        <AlertTriangle size={28} class="text-rose-500 dark:text-rose-400" />
      </div>

      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
        Something went wrong
      </h3>
      <p class="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        This section encountered an unexpected error. Your other dashboard tools are still available in the sidebar.
      </p>

      <div class="mt-6 flex items-center gap-3">
        <button
          type="button"
          onclick={reset}
          class="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>

      <div class="mt-6 w-full max-w-md">
        <button
          type="button"
          onclick={() => showDetails = !showDetails}
          class="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
        >
          {showDetails ? "Hide" : "Show"} error details
          {#if showDetails}
            <ChevronUp size={12} />
          {:else}
            <ChevronDown size={12} />
          {/if}
        </button>

        {#if showDetails}
          <div class="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div class="p-4 text-left">
              <p class="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {caughtError.name}: {caughtError.message}
              </p>
              {#if caughtError.stack}
                <pre class="mt-3 max-h-48 overflow-auto text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap break-words">{caughtError.stack}</pre>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{:else}
  <svelte:boundary onerror={handleError}>
    {#key key}
      {@render children()}
    {/key}
  </svelte:boundary>
{/if}
