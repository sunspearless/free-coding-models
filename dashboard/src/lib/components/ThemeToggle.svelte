<script lang="ts">
  import { onMount } from 'svelte';
  import { Sun, Moon } from '@lucide/svelte';
  let isDark = false;

  // Initialise from localStorage or system preference
  onMount(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      isDark = stored === 'dark';
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    updateTheme();
  });

  function toggle() {
    isDark = !isDark;
    updateTheme();
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  function updateTheme() {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
</script>

<button
  onclick={toggle}
  class="flex items-center justify-center p-2 rounded-sm border border-[var(--color-border-warm)] hover:bg-[var(--color-bg-sand)] transition-colors duration-300"
  aria-label="Toggle light/dark theme"
>
  {#if isDark}
    <Moon class="w-5 h-5" />
  {:else}
    <Sun class="w-5 h-5" />
  {/if}
</button>
