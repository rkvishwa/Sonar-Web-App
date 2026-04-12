<script lang="ts">
  import { Sun, Moon } from "lucide-svelte";
  import { onMount } from "svelte";

  type ThemeMode = "light" | "dark";

  let { isDropdown = false }: { isDropdown?: boolean } = $props();

  let currentTheme = $state<ThemeMode>("dark");

  function applyTheme(theme: ThemeMode) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.theme = theme;
  }

  function toggleTheme() {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(currentTheme);
  }

  onMount(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // If no preference stored, read system theme. Otherwise use stored.
    if (localStorage.theme === "light" || localStorage.theme === "dark") {
      currentTheme = localStorage.theme;
    } else {
      currentTheme = mediaQuery.matches ? "dark" : "light";
    }

    applyTheme(currentTheme);
  });
</script>

<button
  type="button"
  onclick={toggleTheme}
  class={isDropdown 
    ? "rounded-lg border border-cyan-400/38 dark:border-cyan-300/35 bg-white/74 dark:bg-white/10 py-2 px-3 text-zinc-700 dark:text-zinc-100/85 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors flex justify-center items-center gap-1.5 cursor-pointer w-full" 
    : "p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"}
  title="Toggle theme"
  aria-label="Toggle theme"
>
  {#if currentTheme === "light"}
    <Moon size={isDropdown ? 14 : 18} />
    {#if isDropdown}
      <span class="text-[13px] font-semibold">Theme</span>
    {/if}
  {:else}
    <Sun size={isDropdown ? 14 : 18} />
    {#if isDropdown}
      <span class="text-[13px] font-semibold">Theme</span>
    {/if}
  {/if}
</button>
