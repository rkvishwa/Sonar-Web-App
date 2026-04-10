<script lang="ts">
  import { page } from "$app/state";
  import {
    LayoutDashboard,
    Layers3,
    Activity,
    Settings,
    LogOut,
    Menu,
    X,
    PanelLeftClose,
    PanelLeftOpen
  } from "lucide-svelte";
  import { signOut } from "$lib/admin/auth";
  import { goto } from "$app/navigation";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { children } = $props();

  let isMobileSidebarOpen = $state(false);
  let isSidebarCollapsed = $state(false);

  function toggleMobileSidebar() {
    isMobileSidebarOpen = !isMobileSidebarOpen;
  }

  function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed;
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

<div class="flex h-screen w-full overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950">

  <!-- Mobile Header -->
  <div class="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden shrink-0 w-full fixed top-0 z-40 shadow-sm">
    <a href="/" title="Back to Main Site" class="flex items-center space-x-[6px] text-[15px] font-bold">
      <img src="/favicon.png" alt="Sonar Logo" class="h-[22px] w-[22px] object-contain" />
      <span class="text-zinc-900 dark:text-white font-semibold tracking-wide">Sonar Host</span>
    </a>
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
    class={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-200 bg-white dark:border-zinc-800/60 dark:bg-zinc-900/80 backdrop-blur-xl transition-all duration-300 ease-in-out text-zinc-700 dark:text-zinc-300 lg:static lg:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0 w-60" : "-translate-x-full lg:translate-x-0"} ${isSidebarCollapsed ? "lg:w-20" : "lg:w-60"}`}
  >
    <!-- Logo area -->
    <div class={`flex shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800 hidden lg:flex ${isSidebarCollapsed ? "flex-col py-4 space-y-4 px-0" : "h-14 px-4 justify-between"}`}>
      <a href="/" class="flex items-center space-x-[6px] text-[15px] font-bold overflow-hidden" title="Back to Main Site">
        <img src="/favicon.png" alt="Sonar Logo" class="h-[22px] w-[22px] object-contain shrink-0" />
        {#if !isSidebarCollapsed}
          <span class="text-zinc-900 dark:text-white font-semibold tracking-wide whitespace-nowrap transition-opacity duration-300">Sonar Host</span>
        {/if}
      </a>
      
      <!-- Actions: Theme Switch and Minimize -->
      <div class={`flex items-center ${isSidebarCollapsed ? "flex-col space-y-3" : "gap-1"}`}>
        <ThemeToggle />
        <button 
          onclick={toggleSidebar} 
          class="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {#if isSidebarCollapsed}
            <PanelLeftOpen size={18} />
          {:else}
            <PanelLeftClose size={18} />
          {/if}
        </button>
      </div>
    </div>

    <!-- Mobile-only controls matching desktop theme -->
    <div class="flex items-center p-4 lg:hidden border-b border-zinc-200 dark:border-zinc-800">
      <ThemeToggle />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto w-full custom-scrollbar">
      {#each navItems as item}
        <a
          href={item.href}
          onclick={() => {
            isMobileSidebarOpen = false;
          }}
          title={isSidebarCollapsed ? item.name : ""}
          class={`flex items-center group rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 relative ${
            isActiveItem(item.href)
              ? "bg-indigo-50/80 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
          } ${isSidebarCollapsed ? "justify-center" : "space-x-3"}`}
        >
          <item.icon size={18} class={`transition-transform duration-200 ${isActiveItem(item.href) ? "scale-110" : "group-hover:scale-110"}`} />
          {#if !isSidebarCollapsed}
            <span class="whitespace-nowrap">{item.name}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Bottom Actions -->
    <div class="border-t border-zinc-200 dark:border-zinc-800 p-4">
      <button
        onclick={handleSignOut}
        title={isSidebarCollapsed ? "Sign out" : ""}
        class={`flex w-full items-center rounded-xl p-3 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 cursor-pointer ${isSidebarCollapsed ? "justify-center" : "space-x-3"}`}
      >
        <LogOut size={18} />
        {#if !isSidebarCollapsed}
          <span class="whitespace-nowrap">Sign out</span>
        {/if}
      </button>
    </div>
  </aside>

  <!-- Overlay for mobile sidebar -->
  {#if isMobileSidebarOpen}
    <div
      class="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm lg:hidden transition-opacity"
      onclick={toggleMobileSidebar}
      onkeydown={(e) => {if(e.key === 'Escape') toggleMobileSidebar()}}
      role="button"
      tabindex="0"
      aria-label="Close sidebar"
    ></div>
  {/if}

  <!-- Main Content Area -->
  <main class="flex flex-1 flex-col overflow-y-auto z-10 pt-14 lg:pt-0 custom-scrollbar bg-white dark:bg-zinc-950 shadow-sm rounded-tl-xl lg:mt-2 lg:mr-2 lg:mb-2 border border-zinc-200 dark:border-zinc-800/50">
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
    background: #e4e4e7;
    border-radius: 9999px;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #3f3f46;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #d4d4d8;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #52525b;
  }
</style>