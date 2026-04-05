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

<section class="relative px-4 pb-20 pt-28 sm:px-6">
  <div class="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
    <ThemeToggle />
  </div>
  
  <div class="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
    <div class="rounded-[2rem] border border-indigo-300/35 bg-white/80 p-8 shadow-[0_30px_90px_-42px_rgba(8,35,56,0.45)] backdrop-blur-xl dark:border-indigo-300/15 dark:bg-slate-900/88 sm:p-10">
      <p class="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-700 dark:text-indigo-300">
        {eyebrow}
      </p>
      <h1 class="mt-4 text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
        {title}
      </h1>
      <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
        {description}
      </p>

      <div class="mt-10 grid gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-white/70 bg-white/90 p-4 dark:border-white/8 dark:bg-white/4">
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Self-serve host accounts</p>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Email/password plus Google and GitHub sign-in for organizers.
          </p>
        </div>
        <div class="rounded-2xl border border-white/70 bg-white/90 p-4 dark:border-white/8 dark:bg-white/4">
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Hackathon-first dashboard</p>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            One account can manage many events, settings, and analytics.
          </p>
        </div>
        <div class="rounded-2xl border border-white/70 bg-white/90 p-4 dark:border-white/8 dark:bg-white/4">
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Editor parity path</p>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Current admin controls are surfaced on web without touching the Electron app.
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-[2rem] border border-indigo-300/35 bg-white/85 p-6 shadow-[0_30px_90px_-42px_rgba(8,35,56,0.45)] backdrop-blur-xl dark:border-indigo-300/15 dark:bg-slate-900/92 sm:p-8">
      {@render children()}

      <p class="mt-6 text-sm text-slate-600 dark:text-slate-400">
        {alternateLabel}
        <a
          href={alternateHref}
          class="ml-1 font-semibold text-indigo-700 transition-colors hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200"
        >
          {alternateCta}
        </a>
      </p>
    </div>
  </div>
</section>
