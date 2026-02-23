<script lang="ts">
  import { onMount } from 'svelte';
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
  on:click={toggle}
  class="flex items-center justify-center p-2 rounded-sm border border-[var(--color-border-warm)] hover:bg-[var(--color-bg-sand)] transition-colors duration-300"
  aria-label="Toggle light/dark theme"
>
  {#if isDark}
    <!-- Moon icon -->
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a8 8 0 000 16 8 8 0 010-16zM8 4a6 6 0 100 12A6 6 0 018 4z" />
    </svg>
  {:else}
    <!-- Sun icon -->
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 5a1 1 0 011 1v1a1 1 0 01-2 0V6a1 1 0 011-1zm0 8a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zm5-3a1 1 0 011 1h1a1 1 0 010 2h-1a1 1 0 01-1-1v-1zm-8 0a1 1 0 01-1 1H5a1 1 0 010-2h1a1 1 0 011 1v1zM14.95 5.05a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zm-9.9 9.9a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM15.95 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414zm-9.9-9.9a1 1 0 01-1.414 0L4.05 4.343a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414z" />
    </svg>
  {/if}
</button>
