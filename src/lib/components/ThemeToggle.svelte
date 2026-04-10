<script lang="ts">
  import { Sun, Moon } from "lucide-svelte";
  import { onMount } from "svelte";

  type ThemeMode = "light" | "dark";

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
  class="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
  title="Toggle theme"
  aria-label="Toggle theme"
>
  {#if currentTheme === "light"}
    <Moon size={18} />
  {:else}
    <Sun size={18} />
  {/if}
</button>
