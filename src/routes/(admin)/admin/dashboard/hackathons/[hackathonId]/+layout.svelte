<script lang="ts">
  import { page } from "$app/state";
  import {
    ArrowLeft,
    BarChart3,
    LayoutDashboard,
    Settings,
  } from "lucide-svelte";
  import { buildHackathonRoute } from "$lib/admin/hostDashboard";

  let { children } = $props();

  const navItems = [
    {
      name: "Overview",
      icon: LayoutDashboard,
      href: (hackathonId: string) => buildHackathonRoute(hackathonId),
    },
    {
      name: "Analytics",
      icon: BarChart3,
      href: (hackathonId: string) => buildHackathonRoute(hackathonId, "analytics"),
    },
    {
      name: "Settings",
      icon: Settings,
      href: (hackathonId: string) => buildHackathonRoute(hackathonId, "settings"),
    },
  ];

  function isActiveItem(href: string) {
    return page.url.pathname === href;
  }

  function currentHackathonId() {
    return page.params.hackathonId || "";
  }
</script>

<section class="p-4 pb-20 sm:p-6 lg:p-8">
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
    <div class="border-b border-zinc-200 pb-6 dark:border-zinc-800">
      <a
        href="/admin/dashboard/hackathons"
        class="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft size={16} />
        Back to all hackathons
      </a>

      <div class="mt-4 flex flex-wrap gap-2">
        {#each navItems as item}
          <a
            href={item.href(currentHackathonId())}
            class={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              isActiveItem(item.href(currentHackathonId()))
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
            }`}
          >
            <item.icon size={16} />
            {item.name}
          </a>
        {/each}
      </div>
    </div>

    {@render children()}
  </div>
</section>
