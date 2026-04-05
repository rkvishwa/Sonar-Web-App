<script lang="ts">
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let {
    eyebrow,
    title,
    description,
    alternateLabel,
    alternateHref,
    alternateCta,
    children,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    alternateLabel: string;
    alternateHref: string;
    alternateCta: string;
    children: () => any;
  } = $props();
</script>

<div class="min-h-screen bg-zinc-100 dark:bg-zinc-950">
  <div class="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
    <ThemeToggle />
  </div>

  <section class="px-4 pb-20 pt-20 sm:px-6">
    <div class="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">

      <!-- Left info panel -->
      <div class="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
        <p class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          {eyebrow}
        </p>
        <h1 class="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
          {title}
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>

        <div class="mt-8 grid gap-4 sm:grid-cols-3">
          <div class="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Self-serve host accounts</p>
            <p class="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Email/password plus Google and GitHub sign-in for organizers.
            </p>
          </div>
          <div class="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Hackathon-first dashboard</p>
            <p class="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              One account can manage many events, settings, and analytics.
            </p>
          </div>
          <div class="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Editor parity path</p>
            <p class="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Current admin controls are surfaced on web without touching the Electron app.
            </p>
          </div>
        </div>
      </div>

      <!-- Right form panel -->
      <div class="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        {@render children()}

        <p class="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          {alternateLabel}
          <a
            href={alternateHref}
            class="ml-1 font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {alternateCta}
          </a>
        </p>
      </div>
    </div>
  </section>
</div>
