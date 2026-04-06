<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { toast, type Toast } from "$lib/admin/toast";
  import { X, AlertCircle, CheckCircle2, Info } from "lucide-svelte";

  const icons = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
  };

  const styles = {
    error: {
      container:
        "border-rose-400/40 bg-rose-950/90 dark:bg-rose-950/95",
      icon: "text-rose-400",
      text: "text-rose-100",
      close: "text-rose-400/70 hover:text-rose-300",
      progress: "bg-rose-500",
    },
    success: {
      container:
        "border-emerald-400/40 bg-emerald-950/90 dark:bg-emerald-950/95",
      icon: "text-emerald-400",
      text: "text-emerald-100",
      close: "text-emerald-400/70 hover:text-emerald-300",
      progress: "bg-emerald-500",
    },
    info: {
      container:
        "border-cyan-400/40 bg-slate-900/95 dark:bg-slate-950/95",
      icon: "text-cyan-400",
      text: "text-slate-100",
      close: "text-slate-400/70 hover:text-slate-300",
      progress: "bg-cyan-500",
    },
  };
</script>

<!-- Toast container — fixed top-right -->
<div
  class="fixed right-4 top-4 z-[9999] flex flex-col gap-2.5 sm:right-6 sm:top-6"
  aria-live="assertive"
  aria-atomic="false"
>
  {#each $toast as t (t.id)}
    {@const s = styles[t.type]}
    {@const Icon = icons[t.type]}
    <div
      in:fly={{ x: 60, duration: 280, opacity: 0 }}
      out:fade={{ duration: 200 }}
      class="toast-item group relative flex w-full max-w-[360px] items-start gap-3 overflow-hidden rounded-xl border px-4 py-3.5 shadow-2xl backdrop-blur-lg {s.container}"
    >
      <!-- Icon -->
      <span class="mt-0.5 shrink-0 {s.icon}">
        <Icon size={17} />
      </span>

      <!-- Message -->
      <p class="flex-1 text-sm font-medium leading-snug {s.text}">{t.message}</p>

      <!-- Dismiss button -->
      <button
        type="button"
        onclick={() => toast.dismiss(t.id)}
        class="ml-1 shrink-0 rounded-md p-0.5 transition-colors {s.close}"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  {/each}
</div>
