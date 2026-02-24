<script lang="ts">
  import { X } from '@lucide/svelte'
  import { fade, scale } from 'svelte/transition'
  
  let {
    isOpen,
    providers = [],
    onClose,
    onAdd
  }: {
    isOpen: boolean
    providers: Array<{ key: string; name: string; isBuiltIn: boolean }>
    onClose: () => void
    onAdd: (model: { id: string; name: string; context: string; price: string; tier: string; provider: string }) => Promise<void>
  } = $props()

  const TIERS = ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C']

  let name = $state('')
  let context = $state('')
  let price = $state('')
  let tier = $state('A')
  let provider = $state('')
  let loading = $state(false)
  let error = $state<string | null>(null)

  function reset() {
    name = ''
    context = ''
    price = ''
    tier = 'A'
    provider = providers[0]?.key || ''
    error = null
  }

  $effect(() => {
    if (!isOpen) {
      reset()
    } else if (providers.length > 0 && !provider) {
      provider = providers[0].key
    }
  })

  function generateId(): string {
    const providerKey = provider || providers[0]?.key || 'custom'
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    return `${providerKey}/${nameSlug}`
  }

  async function handleSubmit() {
    error = null
    
    if (!name.trim() || !context.trim() || !provider) {
      error = 'Name, context, and provider are required'
      return
    }

    loading = true
    try {
      await onAdd({
        id: generateId(),
        name: name.trim(),
        context: context.trim(),
        price: price.trim() || 'Unknown',
        tier,
        provider
      })
      onClose()
    } catch (err: any) {
      error = err?.message || 'Failed to add model'
    } finally {
      loading = false
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
       role="presentation"
       onkeydown={(e) => {
    if (e.key === 'Escape') onClose()
  }}
       onclick={(e) => {
    if (e.target === e.currentTarget) onClose()
  }}
       transition:fade={{ duration: 150 }}>
    <div class="bg-[var(--color-bg-sand)] border border-[var(--color-border-warm)] rounded-sm shadow-2xl max-w-md w-full mx-4"
         role="dialog"
         aria-modal="true"
         aria-labelledby="modal-title"
         tabindex="-1"
         transition:scale={{ duration: 150, start: 0.95 }}>
      <div class="p-7">
        <div class="flex justify-between items-center mb-5">
          <h2 id="modal-title" class="text-xl text-display font-semibold text-[var(--color-text-espresso)] tracking-tight">Add Custom Model</h2>
          <button onclick={onClose} class="text-[var(--color-text-taupe)] hover:text-[var(--color-text-espresso)] transition-colors duration-300" aria-label="Close modal">
            <X class="w-6 h-6" />
          </button>
        </div>

        {#if error}
          <div class="mb-4 p-3 bg-[var(--color-accent-terracotta)] bg-opacity-10 border border-[var(--color-accent-terracotta)] text-[var(--color-accent-terracotta)] rounded-sm text-sm">
            {error}
          </div>
        {/if}

        <form onsubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}>
          <div class="space-y-5">
            <div>
              <label for="model-name" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Model Name *
              </label>
              <input
                id="model-name"
                type="text"
                bind:value={name}
                placeholder="My Custom Model"
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm"
              />
            </div>

            <div>
              <label for="model-context" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Context Window *
              </label>
              <input
                id="model-context"
                type="text"
                bind:value={context}
                placeholder="128k"
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                e.g., 128k, 32k, 1M
              </p>
            </div>

            <div>
              <label for="model-price" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Price / SWE Score
              </label>
              <input
                id="model-price"
                type="text"
                bind:value={price}
                placeholder="Free or $X/million tokens"
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="model-tier" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                  Tier *
                </label>
                <select
                  id="model-tier"
                  bind:value={tier}
                  class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm"
                >
                  {#each TIERS as t}
                    <option value={t}>{t}</option>
                  {/each}
                </select>
              </div>

              <div>
                <label for="model-provider" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                  Provider *
                </label>
                <select
                  id="model-provider"
                  bind:value={provider}
                  class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm"
                >
                  {#each providers as p}
                    <option value={p.key}>{p.name} {p.isBuiltIn ? '' : '(Custom)'}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-7">
              <button
                type="button"
                onclick={onClose}
                class="px-5 py-2.5 text-[var(--color-text-espresso)] hover:bg-[var(--color-bg-cream)] rounded-sm transition-all duration-300 text-sm font-medium tracking-wide"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                class="px-5 py-2.5 bg-[var(--color-accent-periwinkle)] text-[var(--color-bg-cream)] border border-[var(--color-accent-periwinkle)] rounded-sm hover:bg-[var(--color-text-espresso)] hover:border-[var(--color-text-espresso)] disabled:bg-[var(--color-text-taupe)] disabled:border-[var(--color-text-taupe)] disabled:cursor-not-allowed transition-all duration-300 text-sm font-medium tracking-wide"
              >
                {loading ? 'Adding...' : 'Add Model'}
              </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
