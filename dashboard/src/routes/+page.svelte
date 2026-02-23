<script lang="ts">
  import { onMount } from 'svelte'
import ModelTable from '$lib/components/ModelTable.svelte'
import StatsTable from '$lib/components/StatsTable.svelte'
import SettingsModal from '$lib/components/SettingsModal.svelte'
import Button from '$lib/components/Button.svelte'
import ThemeToggle from '$lib/components/ThemeToggle.svelte'

  interface Model {
    idx: number
    modelId: string
    label: string
    tier: string
    sweScore: string
    ctx: string
    providerKey: string
    providerName: string
    status: 'pending' | 'up' | 'down' | 'timeout' | 'noauth'
    pings: Array<{ ms: number, code: string }>
    httpCode: string | null
    lastPing: number | null
  }

  let models = $state<Model[]>([])
  let config = $state<any>(null)
  let loading = $state(true)
  let showSettings = $state(false)
  let selectedModels = $state<Set<string>>(new Set())
  let tierFilter = $state<string>('All')
  let pingingAll = $state(false)
  let pingingSelected = $state(false)
  let favorites = $state<Set<string>>(new Set())
  let pingHistory = $state<Record<string, Array<{ ms: number; code: string; timestamp: number; status: string }>>>({})
  let currentTab = $state<'all' | 'favorites' | 'stats'>('all')
  let statsSortBy = $state<'model' | 'avgPing' | 'uptime' | 'lastPing'>('avgPing')
  let statsSortAsc = $state<boolean>(true)

  $effect(() => {
    const load = async () => {
      await loadModels()
      await loadConfig()
      await loadFavorites()
      await loadPingHistory()
      loading = false
    }
    load()
  })

  async function loadModels() {
    try {
      const response = await fetch('/api/models')
      const data = await response.json()
      models = data.map((m: any) => ({
        ...m,
        status: m.status || 'pending',
        pings: m.pings || [],
        httpCode: m.httpCode || null,
        lastPing: m.lastPing || null
      }))
    } catch (err) {
      console.error('Failed to load models:', err)
    }
  }

  async function loadConfig() {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()
      config = data
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  async function loadFavorites() {
    try {
      const response = await fetch('/api/favorites')
      const data = await response.json()
      favorites = new Set(data.favorites || [])
    } catch (err) {
      console.error('Failed to load favorites:', err)
    }
  }

  async function loadPingHistory() {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()
      pingHistory = data.pingHistory || {}
    } catch (err) {
      console.error('Failed to load ping history:', err)
      pingHistory = {}
    }
  }

  async function toggleFavorite(modelId: string) {
    try {
      const isFav = favorites.has(modelId)
      const method = isFav ? 'DELETE' : 'PUT'
      await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
      })
      await loadFavorites()
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
      alert('Failed to update favorites')
    }
  }

  async function pingModel(model: Model) {
    try {
      const response = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.modelId,
          providerKey: model.providerKey
        })
      })

      if (!response.ok) {
        throw new Error('Ping failed')
      }

      const result = await response.json()

      // 📖 Update model with new ping data
      models = models.map((m) => {
        if (m.modelId === model.modelId) {
          return {
            ...m,
            status: result.status,
            pings: [...m.pings, { ms: result.ms, code: result.code }],
            httpCode: result.httpCode,
            lastPing: Date.now()
          }
        }
        return m
      })

      // 📖 Reload ping history to get the updated stats
      await loadPingHistory()
    } catch (err) {
      console.error('Failed to ping model:', err)
      alert('Failed to ping model. Please check your API keys.')
    }
  }

  async function pingSelectedModels() {
    if (selectedModels.size === 0) {
      alert('Please select at least one model to ping')
      return
    }

    pingingSelected = true
    try {
      const modelsToPing = models.filter((m) => selectedModels.has(m.modelId))
      for (const model of modelsToPing) {
        await pingModel(model)
      }
    } finally {
      pingingSelected = false
    }
  }

  async function pingAllModels() {
    pingingAll = true
    try {
      for (const model of models) {
        await pingModel(model)
      }
    } finally {
      pingingAll = false
    }
  }

  function handleModelSelect(modelId: string, selected: boolean) {
    selectedModels = new Set(selectedModels)
    if (selected) {
      selectedModels.add(modelId)
    } else {
      selectedModels.delete(modelId)
    }
  }

  async function handleSaveConfig(apiKeys: Record<string, string>) {
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys })
      })

      if (!response.ok) {
        throw new Error('Failed to save config')
      }

      await loadConfig()
      await loadModels()
    } catch (err) {
      console.error('Failed to save config:', err)
      throw err
    }
  }

  function getFilteredModels() {
    let filtered = models

    if (tierFilter !== 'All') {
      const tierMap: Record<string, string[]> = {
        'S': ['S+', 'S'],
        'A': ['A+', 'A', 'A-'],
        'B': ['B+', 'B'],
        'C': ['C']
      }
      const allowed = tierMap[tierFilter]
      if (allowed) {
        filtered = filtered.filter((m) => allowed.includes(m.tier))
      }
    }

    if (currentTab === 'favorites') {
      filtered = filtered.filter((m) => favorites.has(m.modelId))
    }

    if (currentTab === 'stats') {
      filtered = filtered.filter((m) => pingHistory[m.modelId]?.length > 0)
    }

    return filtered
  }
</script>

<svelte:head>
  <title>Free Coding Models Dashboard</title>
</svelte:head>

<div class="min-h-screen">
  <!-- Header -->
  <header class="bg-[var(--color-bg-sand)] border-b border-[var(--color-border-warm)]">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-5">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-5">
          <h1 class="text-3xl text-display font-semibold text-[var(--color-text-espresso)] tracking-tight">
            Free Coding Models
          </h1>
          <span class="text-sm font-medium text-[var(--color-text-taupe)] italic tracking-wide">
            Dashboard
          </span>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="secondary" size="md" type="button" on:click={() => showSettings = true}>Settings</Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  </header>

  <!-- Tab Navigation -->
  <div class="bg-[var(--color-bg-sand)] border-b border-[var(--color-border-warm)]">
    <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
      <nav class="flex gap-8">
        <button
          onclick={() => currentTab = 'all'}
          class="py-4 px-2 text-sm font-medium tracking-wide border-b-2 transition-all duration-300 {currentTab === 'all'
            ? 'text-[var(--color-text-espresso)] border-[var(--color-text-espresso)]'
            : 'text-[var(--color-text-taupe)] border-transparent hover:text-[var(--color-text-espresso)]'}"
        >
          All Models
        </button>
        <button
          onclick={() => currentTab = 'favorites'}
          class="py-4 px-2 text-sm font-medium tracking-wide border-b-2 transition-all duration-300 flex items-center gap-2 {currentTab === 'favorites'
            ? 'text-[var(--color-text-espresso)] border-[var(--color-text-espresso)]'
            : 'text-[var(--color-text-taupe)] border-transparent hover:text-[var(--color-text-espresso)]'}"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Favorites
        </button>
        <button
          onclick={() => currentTab = 'stats'}
          class="py-4 px-2 text-sm font-medium tracking-wide border-b-2 transition-all duration-300 flex items-center gap-2 {currentTab === 'stats'
            ? 'text-[var(--color-text-espresso)] border-[var(--color-text-espresso)]'
            : 'text-[var(--color-text-taupe)] border-transparent hover:text-[var(--color-text-espresso)]'}"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 3a1 1 0 000 2h14a1 1 0 100-2H3zM3 7a1 1 0 000 2h14a1 1 0 100-2H3zM3 11a1 1 0 100 2h14a1 1 0 100-2H3zM3 15a1 1 0 100 2h14a1 1 0 100-2H3z" />
          </svg>
          Stats
        </button>
      </nav>
    </div>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
    {#if loading}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    {:else}
      <!-- Controls -->
      <div class="mb-7 flex flex-wrap gap-4 items-center justify-between">
        <div class="flex flex-wrap gap-4 items-center">
          <select
            value={tierFilter}
            onchange={(e: any) => tierFilter = e.target.value}
            class="px-4 py-2.5 bg-[var(--color-bg-sand)] text-[var(--color-text-espresso)] border border-[var(--color-border-warm)] rounded-sm focus:ring-2 focus:ring-[var(--color-accent-periwinkle)] focus:border-[var(--color-accent-periwinkle)] transition-all duration-300 text-sm font-medium tracking-wide"
          >
            <option value="All">All Tiers</option>
            <option value="S">S Tier (S+, S)</option>
            <option value="A">A Tier (A+, A, A-)</option>
            <option value="B">B Tier (B+, B)</option>
            <option value="C">C Tier</option>
          </select>

          <div class="flex items-center text-sm text-[var(--color-text-taupe)] font-medium">
            {#if currentTab === 'favorites'}
              <span>{favorites.size} favorit{favorites.size === 1 ? 'e' : 'e'}</span>
            {:else if currentTab === 'stats'}
              <span>{models.filter(m => pingHistory[m.modelId]?.length > 0).length} models with stats</span>
            {:else}
              <span>{models.length} models loaded</span>
            {/if}
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            onclick={pingSelectedModels}
            disabled={selectedModels.size === 0 || pingingSelected}
            class="px-5 py-2.5 bg-[var(--color-accent-periwinkle)] text-[var(--color-bg-cream)] border border-[var(--color-accent-periwinkle)] rounded-sm hover:bg-[var(--color-text-espresso)] hover:border-[var(--color-text-espresso)] disabled:bg-[var(--color-text-taupe)] disabled:border-[var(--color-text-taupe)] disabled:cursor-not-allowed transition-all duration-300 text-sm font-medium tracking-wide flex items-center gap-2"
          >
            {#if pingingSelected}
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Pinging...
            {:else}
              Ping Selected ({selectedModels.size})
            {/if}
          </button>
          <button
            onclick={pingAllModels}
            disabled={pingingAll}
            class="px-5 py-2.5 bg-[var(--color-accent-olive)] text-[var(--color-bg-cream)] border border-[var(--color-accent-olive)] rounded-sm hover:bg-[var(--color-text-espresso)] hover:border-[var(--color-text-espresso)] disabled:bg-[var(--color-text-taupe)] disabled:border-[var(--color-text-taupe)] disabled:cursor-not-allowed transition-all duration-300 text-sm font-medium tracking-wide flex items-center gap-2"
          >
            {#if pingingAll}
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Pinging...
            {:else}
              Ping All
            {/if}
          </button>
          {#if currentTab === 'stats'}
            <button
              onclick={loadPingHistory}
              class="px-5 py-2.5 bg-[var(--color-accent-terracotta)] text-[var(--color-bg-cream)] border border-[var(--color-accent-terracotta)] rounded-sm hover:bg-[var(--color-text-espresso)] hover:border-[var(--color-text-espresso)] transition-all duration-300 text-sm font-medium tracking-wide flex items-center gap-2"
            >
              Refresh Stats
            </button>
          {/if}
        </div>
      </div>

      <!-- Model Table -->
      <div class="bg-[var(--color-bg-sand)] border border-[var(--color-border-warm)] rounded-sm overflow-hidden shadow-sm">
        {#if getFilteredModels().length === 0}
          <div class="p-12 text-center text-[var(--color-text-taupe)]">
            <p class="text-lg text-display font-semibold text-[var(--color-text-espresso)]">No models found</p>
            <p class="text-sm mt-2">Try adjusting the tier filter or check your API keys in Settings</p>
          </div>
        {:else if currentTab !== 'stats'}
          <ModelTable
            models={getFilteredModels()}
            onModelSelect={handleModelSelect}
            onModelPing={pingModel}
            selectedModels={selectedModels}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        {:else}
          <StatsTable
            models={getFilteredModels()}
            pingHistory={pingHistory}
            onModelPing={pingModel}
            onToggleFavorite={toggleFavorite}
            favorites={favorites}
            sortBy={statsSortBy}
            sortAsc={statsSortAsc}
            onSort={(sortBy, sortAsc) => { statsSortBy = sortBy; statsSortAsc = sortAsc }}
          />
        {/if}
      </div>

      <!-- Footer -->
      <div class="mt-10 text-center text-sm text-[var(--color-text-taupe)]">
        <p class="font-medium text-[var(--color-text-espresso)]">Click "Ping" to test a model once. Use "Ping All" to test all models.</p>
        <p class="mt-2">
          <a href="https://github.com/vava-nessa/free-coding-models" target="_blank" class="text-[var(--color-accent-periwinkle)] hover:text-[var(--color-text-espresso)] transition-colors duration-300 underline decoration-1 underline-offset-2">
            Free Coding Models on GitHub
          </a>
        </p>
      </div>
    {/if}
  </main>

  <!-- Settings Modal -->
  <SettingsModal
    isOpen={showSettings}
    config={config}
    onSave={handleSaveConfig}
    onClose={() => showSettings = false}
  />
</div>
