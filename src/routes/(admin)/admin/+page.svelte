<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { refreshSession, resolveAuthenticatedRoute } from "$lib/admin/auth";

  onMount(async () => {
    const session = await refreshSession();
    await goto(resolveAuthenticatedRoute(session.user), {
      replaceState: true,
    });
  });
</script>

<section class="flex min-h-[70vh] items-center justify-center px-4 pt-28 sm:px-6">
  <div class="rounded-3xl border border-cyan-300/30 bg-white/80 px-8 py-10 text-center shadow-[0_24px_60px_-30px_rgba(8,35,56,0.45)] backdrop-blur-xl dark:border-cyan-300/15 dark:bg-[#07101a]/88">
    <p class="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
      Host Portal
    </p>
    <h1 class="mt-4 text-3xl font-bold text-zinc-950 dark:text-white">Preparing your dashboard</h1>
    <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
      We’re checking your session and routing you into the web admin experience.
    </p>
  </div>
</section>
