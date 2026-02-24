<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export type Provider = { key: string; name: string }

  export let providers: Provider[] = []
  export let selected: Set<string> = new Set()

  const dispatch = createEventDispatcher()

  let localSelected: string[] = []

  $: {
    localSelected = Array.from(selected)
  }

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement
    const selectedValues = Array.from(target.selectedOptions).map(opt => opt.value)
    dispatch('change', { selected: new Set(selectedValues) })
  }
</script>

<div class="flex items-center gap-2">
  <label for="provider-filter" class="text-sm font-medium text-[var(--color-text-espresso)]">Provider</label>
  <select
    id="provider-filter"
    multiple
    value={localSelected}
    onchange={handleChange}
    class="px-3 py-2 bg-[var(--color-bg-sand)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm min-w-[180px] h-10"
  >
    {#each providers as { key, name }}
      <option value={key}>{name}</option>
    {/each}
  </select>
  {#if selected.size > 0}
    <button
      type="button"
      onclick={() => dispatch('change', { selected: new Set<string>() })}
      class="text-xs underline text-[var(--color-text-taupe)] hover:text-[var(--color-text-espresso)]"
    >
      Clear
    </button>
  {/if}
</div>
