<script lang="ts">
  import { X } from '@lucide/svelte'
  import { fade, scale } from 'svelte/transition'
  
  let {
    isOpen,
    onClose,
    onAdd
  }: {
    isOpen: boolean
    onClose: () => void
    onAdd: (provider: { key: string; name: string; url: string }) => Promise<void>
  } = $props()

  let key = $state('')
  let name = $state('')
  let url = $state('')
  let loading = $state(false)
  let error = $state<string | null>(null)

  function reset() {
    key = ''
    name = ''
    url = ''
    error = null
  }

  $effect(() => {
    if (!isOpen) {
      reset()
    }
  })

  async function handleSubmit() {
    error = null
    
    if (!key.trim() || !name.trim() || !url.trim()) {
      error = 'All fields are required'
      return
    }

    if (!url.startsWith('https://')) {
      error = 'URL must start with https://'
      return
    }

    // Generate ID from name if key is empty
    const providerKey = key.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-')

    loading = true
    try {
      await onAdd({ key: providerKey, name: name.trim(), url: url.trim() })
      onClose()
    } catch (err: any) {
      error = err?.message || 'Failed to add provider'
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
          <h2 id="modal-title" class="text-xl text-display font-semibold text-[var(--color-text-espresso)] tracking-tight">Add Custom Provider</h2>
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
              <label for="provider-name" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Display Name
              </label>
              <input
                id="provider-name"
                type="text"
                bind:value={name}
                placeholder="My Custom API"
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                A friendly name displayed in the UI
              </p>
            </div>

            <div>
              <label for="provider-key" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Provider Key
              </label>
              <input
                id="provider-key"
                type="text"
                bind:value={key}
                placeholder="my-api (auto-generated from name if empty)"
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm font-mono-tech"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                Unique identifier (used internally, e.g., "my-api")
              </p>
            </div>

            <div>
              <label for="provider-url" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                API Endpoint URL
              </label>
              <input
                id="provider-url"
                type="url"
                bind:value={url}
                placeholder="https://api.example.com/v1/chat/completions"
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm font-mono-tech"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                OpenAI-compatible API endpoint (must use HTTPS)
              </p>
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
                {loading ? 'Adding...' : 'Add Provider'}
              </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
