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
  import { onMount } from "svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import ErrorBoundary from "$lib/components/admin/ErrorBoundary.svelte";
  import { adminStore } from "$lib/admin/adminStore.svelte";

  let { children } = $props();

  onMount(() => {
    adminStore.startPolling();
    return () => {
      adminStore.stopPolling();
    };
  });

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

<div class="flex h-screen w-full overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 bg-[#fbfbfb] dark:bg-[#09090b]" style="--sidebar-width: {isSidebarCollapsed ? '88px' : '260px'};">

  <!-- Mobile Header -->
  <div class="flex h-[60px] items-center justify-between border-b border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden shrink-0 w-full fixed top-0 z-40 shadow-sm">
    <a href="/" title="Back to Main Site" class="flex items-center space-x-[8px] text-[16px] font-bold">
      <img src="/favicon.png" alt="Sonar Logo" class="h-[24px] w-[24px] object-contain" />
      <span class="text-zinc-900 dark:text-white font-semibold tracking-wide">Sonar Host</span>
    </a>
    <div class="flex flex-row items-center gap-3">
      <ThemeToggle />
      <button onclick={toggleMobileSidebar} class="rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 shrink-0 transition-colors">
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
    class={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#fbfbfb] dark:bg-[#09090b] transition-all duration-300 ease-in-out text-zinc-600 dark:text-zinc-400 lg:static lg:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0 w-64 border-r border-zinc-200 dark:border-zinc-800/60 shadow-2xl" : "-translate-x-full lg:translate-x-0"} ${isSidebarCollapsed ? "lg:w-[88px]" : "lg:w-[260px]"}`}
  >
    <!-- Logo area -->
    <div class={`flex shrink-0 items-center hidden lg:flex ${isSidebarCollapsed ? "flex-col pt-8 pb-4 space-y-6 px-0" : "h-[88px] px-6 justify-between mt-2"}`}>
      <a href="/" class="flex items-center space-x-[10px] text-[16px]" title="Back to Main Site">
        <img src="/favicon.png" alt="Sonar Logo" class="h-[26px] w-[26px] object-contain shrink-0" />
        {#if !isSidebarCollapsed}
          <span class="text-zinc-900 dark:text-zinc-100 font-bold tracking-tight whitespace-nowrap transition-opacity duration-300">Sonar Host</span>
        {/if}
      </a>
      
      <!-- Actions: Theme Switch and Minimize -->
      <div class={`flex items-center ${isSidebarCollapsed ? "flex-col space-y-4" : "gap-1.5"}`}>
        <ThemeToggle />
        <button 
          onclick={toggleSidebar} 
          class="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
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
    <div class="flex items-center p-5 lg:hidden border-b border-zinc-200 dark:border-zinc-800">
      <ThemeToggle />
    </div>

    <!-- Navigation -->
    <nav class={`flex-1 overflow-y-auto w-full custom-scrollbar flex flex-col gap-1.5 ${isSidebarCollapsed ? "px-4 pt-4" : "px-4 pt-2"}`}>
      {#each navItems as item}
        <a
          href={item.href}
          onclick={() => {
            isMobileSidebarOpen = false;
          }}
          title={isSidebarCollapsed ? item.name : ""}
          class={`flex items-center group rounded-xl px-3 py-3 text-[15px] font-medium transition-all duration-200 ${
            isActiveItem(item.href)
              ? "bg-white text-zinc-900 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-zinc-200/60 dark:bg-zinc-800/80 dark:text-white dark:border-zinc-700/50"
              : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200 border border-transparent"
          } ${isSidebarCollapsed ? "justify-center" : "space-x-3.5"}`}
        >
          <item.icon size={20} strokeWidth={isActiveItem(item.href) ? 2.5 : 2} class={`transition-transform duration-200 ${isActiveItem(item.href) ? "text-indigo-500 dark:text-indigo-400" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} />
          {#if !isSidebarCollapsed}
            <span class="whitespace-nowrap tracking-tight">{item.name}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Bottom Actions -->
    <div class="p-4 mb-2">
      <button
        onclick={handleSignOut}
        title={isSidebarCollapsed ? "Sign out" : ""}
        class={`flex w-full items-center rounded-xl p-3 text-[15px] font-medium text-zinc-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 cursor-pointer border border-transparent ${isSidebarCollapsed ? "justify-center" : "space-x-3.5"}`}
      >
        <LogOut size={20} class="transition-colors duration-200 group-hover:text-rose-500" />
        {#if !isSidebarCollapsed}
          <span class="whitespace-nowrap tracking-tight">Sign out</span>
        {/if}
      </button>
    </div>
  </aside>

  <!-- Overlay for mobile sidebar -->
  {#if isMobileSidebarOpen}
    <div
      class="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-sm lg:hidden transition-opacity"
      onclick={toggleMobileSidebar}
      onkeydown={(e) => {if(e.key === 'Escape') toggleMobileSidebar()}}
      role="button"
      tabindex="0"
      aria-label="Close sidebar"
    ></div>
  {/if}

  <!-- Main Content Area -->
  <main class="flex flex-1 flex-col overflow-y-auto z-10 pt-[60px] lg:pt-0 custom-scrollbar bg-white dark:bg-zinc-900 lg:my-3 lg:rounded-l-[32px] shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] border border-zinc-200 lg:border-r-0 dark:border-zinc-800">
    <ErrorBoundary>
      {@render children()}
    </ErrorBoundary>
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