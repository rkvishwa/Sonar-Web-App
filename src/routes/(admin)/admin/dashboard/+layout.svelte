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
    // If the user expands into multiple sub-pages later, these links would point to them.
    // For now, they can just be hash links or just highlight the dashboard if they point to the same page.
    { name: "Hackathons", icon: Layers3, href: "/admin/dashboard#hackathons" },
    { name: "Monitoring", icon: Activity, href: "/admin/dashboard#monitoring" },
    { name: "Platform Settings", icon: Settings, href: "/admin/dashboard#settings" },
  ];
</script>

<div class="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0b0f19] font-sans text-slate-900 dark:text-slate-100">
  
  <!-- Mobile Header -->
  <div class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden shrink-0 w-full fixed top-0 z-40">
    <div class="flex items-center space-x-3 text-lg font-bold">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/40 bg-indigo-50 dark:border-indigo-300/35 dark:bg-indigo-500/20">
        <ShieldAlert size={16} class="text-indigo-700 dark:text-indigo-300" />
      </div>
      <span class="text-slate-900 dark:text-white font-medium">Sonar Admin</span>
    </div>
    <div class="flex flex-row items-center gap-2">
      <ThemeToggle />
      <button onclick={toggleMobileSidebar} class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 shrink-0">
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
    class={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900 transition-transform duration-300 text-slate-600 dark:text-slate-300 lg:static lg:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
  >
    <div class="flex h-16 shrink-0 items-center justify-between px-6 mb-6 mt-2 lg:mt-0 border-b border-slate-200 dark:border-slate-800 hidden lg:flex">
      <div class="flex items-center space-x-3 text-xl font-bold">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20 shadow-sm text-indigo-600 dark:text-indigo-400">
          <ShieldAlert size={18} class="shadow-sm" />
        </div>
        <span class="text-slate-900 dark:text-white font-medium tracking-wide">Sonar Admin</span>
      </div>
      <div>
        <ThemeToggle />
      </div>
    </div>
    
    <div class="flex items-center p-6 lg:hidden border-b border-slate-200 dark:border-slate-800">
        <ThemeToggle />
    </div>

    <nav class="flex-1 space-y-1.5 px-4 overflow-y-auto">
      {#each navItems as item}
        <a
          href={item.href}
          onclick={(e) => { 
            if(item.href.includes('#')) {
              isMobileSidebarOpen = false;
            } 
          }}
          class={`flex items-center space-x-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
            page.url.pathname === item.href || (item.href.includes('#') && page.url.hash === item.href.split('#')[1])
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <item.icon size={18} />
          <span>{item.name}</span>
        </a>
      {/each}
    </nav>

    <div class="mt-auto border-t border-slate-200 dark:border-slate-800 p-4">
      <div class="mb-2 flex items-center space-x-3 px-3 py-2">
        <UserCircle size={32} class="text-slate-400 dark:text-slate-500" />
        <div class="flex-1 overflow-hidden">
          <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">Web Host</p>
          <p class="truncate text-xs text-slate-500">Admin Account</p>
        </div>
      </div>
      <button
        onclick={handleSignOut}
        class="flex w-full items-center space-x-3 rounded-md px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 cursor-pointer"
      >
        <LogOut size={18} />
        <span>Sign out</span>
      </button>
      <div class="mt-3 px-3 text-xs text-slate-500">
        <a href="/" class="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          <ChevronLeft size={14} /> Back to Main Site
        </a>
      </div>
    </div>
  </aside>

  <!-- Overlay for mobile sidebar -->
  {#if isMobileSidebarOpen}
    <div 
      class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity" 
      onclick={toggleMobileSidebar}
      onkeydown={(e) => {if(e.key === 'Escape') toggleMobileSidebar()}}
      role="button"
      tabindex="0"
      aria-label="Close sidebar"
    ></div>
  {/if}

  <!-- Main Content Area -->
  <main class="flex flex-1 flex-col overflow-y-auto bg-slate-50 dark:bg-[#0b0f19] pt-16 lg:pt-0 relative custom-scrollbar">
    <div class="absolute inset-0 pointer-events-none -z-10">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent_35%)]"></div>
    </div>
    {@render children()}
  </main>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-zinc-300, #d4d4d8);
    border-radius: 4px;
  }
  @media (prefers-color-scheme: dark) {
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
    }
  }
</style>