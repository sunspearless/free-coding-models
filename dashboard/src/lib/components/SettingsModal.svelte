<script lang="ts">
  import { X } from '@lucide/svelte'
  let {
    isOpen,
    config,
    onSave,
    onClose
  }: {
    isOpen: boolean
    config: any
    onSave: (apiKeys: Record<string, string>) => Promise<void>
    onClose: () => void
  } = $props()

  let apiKeys = $state({
    nvidia: '',
    groq: '',
    cerebras: '',
    openrouter: '',
    zai: '',
    ollama: ''
  })

  let loading = $state(false)
  let error = $state<string | null>(null)

  $effect(() => {
    if (config?.apiKeys) {
      apiKeys.nvidia = config.apiKeys.nvidia || ''
      apiKeys.groq = config.apiKeys.groq || ''
      apiKeys.cerebras = config.apiKeys.cerebras || ''
      apiKeys.openrouter = config.apiKeys.openrouter || ''
      apiKeys.zai = config.apiKeys.zai || ''
      apiKeys.ollama = config.apiKeys.ollama || ''
    }
  })

  async function handleSave() {
    loading = true
    error = null
    try {
      await onSave(apiKeys)
      onClose()
    } catch (err) {
      error = 'Failed to save configuration'
    } finally {
      loading = false
    }
  }

  function maskKey(key: string): string {
    if (!key || key.length < 8) return key
    return key.substring(0, 4) + '...' + key.substring(key.length - 4)
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
   }}>
     <div class="bg-[var(--color-bg-sand)] border border-[var(--color-border-warm)] rounded-sm shadow-2xl max-w-md w-full mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabindex="-1">
       <div class="p-7">
         <div class="flex justify-between items-center mb-5">
           <h2 id="modal-title" class="text-xl text-display font-semibold text-[var(--color-text-espresso)] tracking-tight">API Key Settings</h2>
            <button onclick={onClose} class="text-[var(--color-text-taupe)] hover:text-[var(--color-text-espresso)] transition-colors duration-300" aria-label="Close settings modal">
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
          handleSave()
        }}>
          <div class="space-y-5">
            <div>
              <label for="nvidia-api-key" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                NVIDIA NIM API Key
              </label>
              <input
                id="nvidia-api-key"
                type="password"
                value={apiKeys.nvidia}
                oninput={(e: any) => apiKeys.nvidia = e.target.value}
                placeholder={apiKeys.nvidia ? maskKey(apiKeys.nvidia) : 'nvapi-...'}
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 font-mono-tech text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                Get your key at <a href="https://build.nvidia.com" target="_blank" class="text-[var(--color-accent-periwinkle)] hover:text-[var(--color-text-espresso)] transition-colors duration-300 underline decoration-1 underline-offset-2">build.nvidia.com</a>
              </p>
            </div>

            <div>
              <label for="groq-api-key" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Groq API Key
              </label>
              <input
                id="groq-api-key"
                type="password"
                value={apiKeys.groq}
                oninput={(e: any) => apiKeys.groq = e.target.value}
                placeholder={apiKeys.groq ? maskKey(apiKeys.groq) : 'gsk_...'}
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 font-mono-tech text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                Get your key at <a href="https://console.groq.com/keys" target="_blank" class="text-[var(--color-accent-periwinkle)] hover:text-[var(--color-text-espresso)] transition-colors duration-300 underline decoration-1 underline-offset-2">console.groq.com</a>
              </p>
            </div>

            <div>
              <label for="cerebras-api-key" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Cerebras API Key
              </label>
              <input
                id="cerebras-api-key"
                type="password"
                value={apiKeys.cerebras}
                oninput={(e: any) => apiKeys.cerebras = e.target.value}
                placeholder={apiKeys.cerebras ? maskKey(apiKeys.cerebras) : 'csk_...'}
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 font-mono-tech text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                Get your key at <a href="https://cloud.cerebras.ai" target="_blank" class="text-[var(--color-accent-periwinkle)] hover:text-[var(--color-text-espresso)] transition-colors duration-300 underline decoration-1 underline-offset-2">cloud.cerebras.ai</a>
              </p>
            </div>
            </div>

            <div>
              <label for="openrouter-api-key" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                OpenRouter API Key
              </label>
              <input
                id="openrouter-api-key"
                type="password"
                value={apiKeys.openrouter}
                oninput={(e: any) => apiKeys.openrouter = e.target.value}
                placeholder={apiKeys.openrouter ? maskKey(apiKeys.openrouter) : 'sk-or-...'}
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 font-mono-tech text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                Get your key at <a href="https://openrouter.ai/keys" target="_blank" class="text-[var(--color-accent-periwinkle)] hover:text-[var(--color-text-espresso)] transition-colors duration-300 underline decoration-1 underline-offset-2">openrouter.ai/keys</a>
              </p>
            </div>

            <div>
              <label for="zai-api-key" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Z.AI API Key
              </label>
              <input
                id="zai-api-key"
                type="password"
                value={apiKeys.zai}
                oninput={(e: any) => apiKeys.zai = e.target.value}
                placeholder={apiKeys.zai ? maskKey(apiKeys.zai) : '...'}
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 font-mono-tech text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                Get your key at <a href="https://api.z.ai" target="_blank" class="text-[var(--color-accent-periwinkle)] hover:text-[var(--color-text-espresso)] transition-colors duration-300 underline decoration-1 underline-offset-2">api.z.ai</a>
              </p>
            </div>

            <div>
              <label for="ollama-api-key" class="block text-sm font-medium text-[var(--color-text-espresso)] mb-2 tracking-wide">
                Ollama Cloud API Key
              </label>
              <input
                id="ollama-api-key"
                type="password"
                value={apiKeys.ollama}
                oninput={(e: any) => apiKeys.ollama = e.target.value}
                placeholder={apiKeys.ollama ? maskKey(apiKeys.ollama) : 'ollama-...'}
                class="w-full px-4 py-2.5 bg-[var(--color-bg-cream)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 font-mono-tech text-sm"
              />
              <p class="mt-1.5 text-xs text-[var(--color-text-taupe)]">
                Get your key at <a href="https://ollama.com" target="_blank" class="text-[var(--color-accent-periwinkle)] hover:text-[var(--color-text-espresso)] transition-colors duration-300 underline decoration-1 underline-offset-2">ollama.com</a>
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
                {loading ? 'Saving...' : 'Save'}
              </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
