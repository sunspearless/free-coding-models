<script lang="ts">
  import ModelRow from './ModelRow.svelte'

  let {
    models,
    onModelSelect,
    onModelPing,
    selectedModels,
    favorites,
    onToggleFavorite
  }: {
    models: any[]
    onModelSelect: (modelId: string, selected: boolean) => void
    onModelPing: (model: any) => Promise<void>
    selectedModels: Set<string>
    favorites: Set<string>
    onToggleFavorite: (modelId: string) => void
  } = $props()

  function isModelSelected(modelId: string): boolean {
    return selectedModels.has(modelId)
  }
</script>

<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-[var(--color-border-warm)] border border-[var(--color-border-warm)]">
    <thead class="bg-[var(--color-bg-cream)]">
      <tr>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest w-14">
          <input type="checkbox" onchange={(e: any) => {
            const checked = e.target.checked
            for (const model of models) {
              onModelSelect(model.modelId, checked)
            }
          }} class="w-4 h-4 rounded-sm accent-[var(--color-accent-periwinkle)]" />
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Rank
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Tier
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Model
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Origin
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Latest Ping
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Status
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Verdict
        </th>
        <th class="p-4 text-left text-xs font-medium text-[var(--color-text-taupe)] uppercase tracking-widest">
          Actions
        </th>
      </tr>
    </thead>
    <tbody class="bg-[var(--color-bg-sand)] divide-y divide-[var(--color-border-warm)]">
      {#each models as model (model.modelId)}
        <ModelRow
          model={model}
          selected={isModelSelected(model.modelId)}
          onSelect={(selected) => onModelSelect(model.modelId, selected)}
          onPing={async () => await onModelPing(model)}
          isFavorite={favorites.has(model.modelId)}
          onToggleFavorite={() => onToggleFavorite(model.modelId)}
        />
      {/each}
    </tbody>
  </table>
</div>

<style>
  table {
    border-collapse: separate;
    border-spacing: 0;
  }
</style>
