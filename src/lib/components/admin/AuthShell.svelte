<script lang="ts">
  import Toast from "$lib/components/admin/Toast.svelte";

  let {
    alternateLabel,
    alternateHref,
    alternateCta,
    children,
  }: {
    alternateLabel: string;
    alternateHref: string;
    alternateCta: string;
    children: () => any;
  } = $props();
</script>

<Toast />

<div class="auth-page flex-1 flex flex-col overflow-y-auto min-h-[100dvh]">
  <!-- Main content -->
  <div class="auth-content w-full max-w-7xl mx-auto flex-1 flex flex-col items-center px-4 py-12 sm:py-20">
    <!-- Form panel (centered) -->
    <div class="auth-form-panel w-full max-w-[440px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-10 my-auto shrink-0">
      {@render children()}

      <p class="mt-6 text-sm text-slate-500 dark:text-slate-400">
        {alternateLabel}
        <a
          href={alternateHref}
          class="ml-1 font-semibold text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
        >
          {alternateCta}
        </a>
      </p>
    </div>
  </div>
</div>

