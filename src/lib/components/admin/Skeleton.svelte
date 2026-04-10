<script lang="ts">
  type SkeletonVariant = "text" | "card" | "table" | "chart" | "circle";

  interface Props {
    variant?: SkeletonVariant;
    width?: string;
    height?: string;
    rows?: number;
    columns?: number;
    class?: string;
  }

  let {
    variant = "text",
    width = "100%",
    height,
    rows = 5,
    columns = 4,
    class: extraClass = "",
  }: Props = $props();
</script>

{#if variant === "text"}
  <div
    class="skeleton-shimmer rounded-md {extraClass}"
    style="width: {width}; height: {height || '14px'};"
  ></div>

{:else if variant === "card"}
  <div class="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 {extraClass}">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-2 flex-1">
        <div class="skeleton-shimmer h-3 w-24 rounded-md"></div>
        <div class="skeleton-shimmer h-8 w-16 rounded-md mt-1"></div>
      </div>
      <div class="skeleton-shimmer h-10 w-10 rounded-lg"></div>
    </div>
  </div>

{:else if variant === "table"}
  <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 {extraClass}">
    <!-- Table header -->
    <div class="flex gap-4 border-b border-zinc-200 bg-zinc-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      {#each Array(columns) as _, i}
        <div class="skeleton-shimmer h-3 rounded-md" style="width: {i === 0 ? '30%' : `${Math.floor(70 / (columns - 1))}%`};"></div>
      {/each}
    </div>
    <!-- Table rows -->
    {#each Array(rows) as _}
      <div class="flex gap-4 border-b border-zinc-100 px-6 py-5 dark:border-zinc-800/60">
        {#each Array(columns) as _, i}
          <div class="skeleton-shimmer h-4 rounded-md" style="width: {i === 0 ? '30%' : `${Math.floor(70 / (columns - 1))}%`};"></div>
        {/each}
      </div>
    {/each}
  </div>

{:else if variant === "chart"}
  <div class="flex flex-col gap-4 {extraClass}">
    <div class="flex items-center justify-between">
      <div class="skeleton-shimmer h-4 w-36 rounded-md"></div>
      <div class="skeleton-shimmer h-4 w-4 rounded-md"></div>
    </div>
    <div
      class="skeleton-shimmer rounded-xl"
      style="width: {width}; height: {height || '280px'};"
    ></div>
  </div>

{:else if variant === "circle"}
  <div
    class="skeleton-shimmer rounded-full {extraClass}"
    style="width: {width || '40px'}; height: {height || '40px'};"
  ></div>
{/if}

<style>
  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      #e4e4e7 0%,
      #f4f4f5 40%,
      #e4e4e7 80%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  :global(.dark) .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      #27272a 0%,
      #3f3f46 40%,
      #27272a 80%
    );
    background-size: 200% 100%;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
