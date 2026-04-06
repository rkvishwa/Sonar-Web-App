<script lang="ts">
  import { page } from "$app/state";
  import {
    LayoutDashboard,
    Layers3,
    Activity,
    Settings,
    LogOut,
    ShieldAlert,
    UserCircle,
    ChevronLeft,
    Menu,
    X,
  } from "lucide-svelte";
  import { signOut } from "$lib/admin/auth";
  import { goto } from "$app/navigation";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { children } = $props();

  let isMobileSidebarOpen = $state(false);

  function toggleMobileSidebar() {
    isMobileSidebarOpen = !isMobileSidebarOpen;
  }

  // Close sidebar on navigation (for mobile)
  $effect(() => {
    page.url.pathname;
    isMobileSidebarOpen = false;
  });

  async function handleSignOut() {
    await signOut();
    await goto("/admin/signin");
  }

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, href: "/admin/dashboard" },
    { name: "Hackathons", icon: Layers3, href: "/admin/dashboard/hackathons" },
    { name: "Monitoring", icon: Activity, href: "/admin/dashboard/monitoring" },
    { name: "Settings", icon: Settings, href: "/admin/dashboard/settings" },
  ];

  function isActiveItem(href: string) {
    return href === "/admin/dashboard"
      ? page.url.pathname === href
      : page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
  }
</script>

<div class="flex h-screen w-full overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-950">

  <!-- Mobile Header -->
  <div class="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden shrink-0 w-full fixed top-0 z-40">
    <div class="flex items-center space-x-3 text-base font-bold">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
        <ShieldAlert size={16} />
      </div>
      <span class="text-zinc-900 dark:text-white font-semibold tracking-wide">Sonar Host</span>
    </div>
    <div class="flex flex-row items-center gap-2">
      <ThemeToggle />
      <button onclick={toggleMobileSidebar} class="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 shrink-0">
        {#if isMobileSidebarOpen}
          <X size={20} />
        {:else}
          <Menu size={20} />
        {/if}
      </button>
    </div>
  </div>

  <!-- Sidebar Container -->
  <aside
    class={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 transition-transform duration-300 text-zinc-700 dark:text-zinc-300 lg:static lg:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
  >
    <div class="flex h-14 shrink-0 items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800 hidden lg:flex">
      <div class="flex items-center space-x-3 text-base font-bold">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <ShieldAlert size={16} />
        </div>
        <span class="text-zinc-900 dark:text-white font-semibold tracking-wide">Sonar Host</span>
      </div>
      <ThemeToggle />
    </div>

    <div class="flex items-center p-4 lg:hidden border-b border-zinc-200 dark:border-zinc-800">
      <ThemeToggle />
    </div>

    <nav class="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto w-full">
      {#each navItems as item}
        <a
          href={item.href}
          onclick={() => {
            isMobileSidebarOpen = false;
          }}
          class={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActiveItem(item.href)
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          }`}
        >
          <item.icon size={17} />
          <span>{item.name}</span>
        </a>
      {/each}
    </nav>

    <div class="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
      <div class="mb-2 flex items-center space-x-3 px-2 py-2">
        <UserCircle size={30} class="text-zinc-400 dark:text-zinc-500" />
        <div class="flex-1 overflow-hidden">
          <p class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">Web Host</p>
          <p class="truncate text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Host Account</p>
        </div>
      </div>
      <button
        onclick={handleSignOut}
        class="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
      >
        <LogOut size={16} />
        <span>Sign out</span>
      </button>
      <div class="mt-2 px-3 text-xs text-zinc-400 dark:text-zinc-500">
        <a href="/" class="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
          <ChevronLeft size={13} /> Back to Main Site
        </a>
      </div>
    </div>
  </aside>

  <!-- Overlay for mobile sidebar -->
  {#if isMobileSidebarOpen}
    <div
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      onclick={toggleMobileSidebar}
      onkeydown={(e) => {if(e.key === 'Escape') toggleMobileSidebar()}}
      role="button"
      tabindex="0"
      aria-label="Close sidebar"
    ></div>
  {/if}

  <!-- Main Content Area -->
  <main class="flex flex-1 flex-col overflow-y-auto z-10 pt-14 lg:pt-0 custom-scrollbar">
    {@render children()}
  </main>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #d4d4d8;
    border-radius: 4px;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #3f3f46;
  }
</style>