<script lang="ts">
  import { Star, CheckCircle, XCircle, Clock, Key, Flame, AlertTriangle, Ghost, Rocket, CircleCheck, Turtle, Skull, Hourglass } from '@lucide/svelte'

  let {
    model,
    onSelect,
    onPing,
    selected,
    isFavorite,
    onToggleFavorite
  }: {
    model: any
    onSelect: (selected: boolean) => void
    onPing: () => Promise<void>
    selected: boolean
    isFavorite: boolean
    onToggleFavorite: () => void
  } = $props()

  let statusInfo = $derived(getStatusIcon())
  let verdictInfo = $derived(getVerdictIcon())
  let StatusIcon = $derived(statusInfo.icon)
  let VerdictIcon = $derived(verdictInfo.icon)

  let loading = $state(false)

  async function handlePing() {
    if (loading) return
    loading = true
    try {
      await onPing()
    } finally {
      loading = false
    }
  }

  function getStatusColor() {
    switch (model.status) {
      case 'up': return 'text-[var(--color-accent-olive)]'
      case 'down': return 'text-[var(--color-accent-terracotta)]'
      case 'timeout': return 'text-[var(--color-accent-gold)]'
      case 'noauth': return 'text-[var(--color-text-taupe)]'
      default: return 'text-[var(--color-text-taupe)]'
    }
  }

  function getStatusIcon() {
    switch (model.status) {
      case 'up': return { icon: CheckCircle, color: 'var(--color-accent-olive)', label: 'UP' }
      case 'down': return { icon: XCircle, color: 'var(--color-accent-terracotta)', label: model.httpCode || 'ERR' }
      case 'timeout': return { icon: Hourglass, color: 'var(--color-accent-gold)', label: 'TIMEOUT' }
      case 'noauth': return { icon: Key, color: 'var(--color-text-taupe)', label: 'NO KEY' }
      default: return { icon: Hourglass, color: 'var(--color-text-taupe)', label: 'PENDING' }
    }
  }

  function getVerdictIcon() {
    if (model.httpCode === '429') return { icon: Flame, color: 'var(--color-accent-terracotta)', label: 'Overloaded' }
    const wasUpBefore = model.pings.length > 0 && model.pings.some((p: any) => p.code === '200')
    if ((model.status === 'timeout' || model.status === 'down') && wasUpBefore) return { icon: AlertTriangle, color: 'var(--color-accent-gold)', label: 'Unstable' }
    if (model.status === 'timeout' || model.status === 'down') return { icon: Ghost, color: 'var(--color-text-taupe)', label: 'Not Active' }

    const avg = getAvg()
    if (avg === Infinity) return { icon: Hourglass, color: 'var(--color-text-taupe)', label: 'Pending' }
    if (avg < 400) return { icon: Rocket, color: 'var(--color-accent-olive)', label: 'Perfect' }
    if (avg < 1000) return { icon: CircleCheck, color: 'var(--color-accent-olive)', label: 'Normal' }
    if (avg < 3000) return { icon: Turtle, color: 'var(--color-accent-gold)', label: 'Slow' }
    if (avg < 5000) return { icon: Turtle, color: 'var(--color-accent-terracotta)', label: 'Very Slow' }
    return { icon: Skull, color: 'var(--color-accent-terracotta)', label: 'Unstable' }
  }

  function getAvg() {
    const successfulPings = (model.pings || []).filter((p: any) => p.code === '200')
    if (successfulPings.length === 0) return Infinity
    return Math.round(successfulPings.reduce((a: number, b: any) => a + b.ms, 0) / successfulPings.length)
  }

  function getLatestPing() {
    const latest = model.pings.length > 0 ? model.pings[model.pings.length - 1] : null
    if (!latest || latest.code !== '200') return '—'
    return `${latest.ms}ms`
  }

  function getUptime() {
    if (model.pings.length === 0) return '0%'
    const successful = model.pings.filter((p: any) => p.code === '200').length
    return `${Math.round((successful / model.pings.length) * 100)}%`
  }
</script>

<tr class="hover:bg-[var(--color-bg-cream)] transition-colors duration-200 {selected ? 'bg-[var(--color-bg-cream)]' : ''}">
  <td class="p-4 text-center">
    <input type="checkbox" checked={selected} onchange={() => onSelect(!selected)} class="w-4 h-4 rounded-sm accent-[var(--color-accent-periwinkle)]" />
  </td>
  <td class="p-4 text-center text-sm font-mono-tech text-[var(--color-text-espresso)]">{model.idx}</td>
  <td class="p-4 text-center text-sm font-semibold text-[var(--color-text-espresso)]">{model.tier}</td>
  <td class="p-4 text-sm font-medium text-[var(--color-text-espresso)]">
    {model.label}
    {#if model.isCustom}
      <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-accent-periwinkle)] bg-opacity-20 text-[var(--color-accent-periwinkle)]">
        Custom
      </span>
    {/if}
  </td>
  <td class="p-4 text-center">
    <span class="text-sm font-medium text-[var(--color-text-taupe)]">{model.providerName}</span>
  </td>
  <td class="p-4 text-center">
    <span class="font-mono-tech text-sm text-[var(--color-text-espresso)]">{getLatestPing()}</span>
  </td>
  <td class="p-4 text-center">
    <span class="font-semibold text-sm flex items-center justify-center gap-1.5 {statusInfo.color}">
      <StatusIcon class="w-4 h-4" />
      {statusInfo.label}
    </span>
  </td>
  <td class="p-4 text-center">
    <span class="font-semibold text-sm flex items-center justify-center gap-1.5 {verdictInfo.color}">
      <VerdictIcon class="w-4 h-4" />
      {verdictInfo.label}
    </span>
  </td>
  <td class="p-4 text-center">
    <div class="flex items-center justify-center gap-2">
      <button
        onclick={onToggleFavorite}
        class="p-2 hover:bg-[var(--color-bg-cream)] rounded-sm transition-all duration-300 flex items-center justify-center"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          fill={isFavorite ? 'var(--color-accent-gold)' : 'transparent'}
          stroke="var(--color-text-espresso)"
          strokeWidth={1.5}
          class="w-5 h-5"
        />
      </button>
      <button
        onclick={handlePing}
        disabled={loading}
        class="px-5 py-2.5 bg-[var(--color-accent-periwinkle)] text-[var(--color-bg-cream)] border border-[var(--color-accent-periwinkle)] rounded-sm hover:bg-[var(--color-text-espresso)] hover:border-[var(--color-text-espresso)] disabled:bg-[var(--color-text-taupe)] disabled:border-[var(--color-text-taupe)] disabled:cursor-not-allowed transition-all duration-300 text-sm font-medium tracking-wide"
      >
        {loading ? 'Pinging...' : 'Ping'}
      </button>
    </div>
  </td>
</tr>
