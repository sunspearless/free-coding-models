import { json, error } from '@sveltejs/kit'
import { MODELS, sources } from '$lib/sources.js'
import { loadConfig, getApiKey, isProviderEnabled } from '$lib/config.js'

// Valid tiers
const VALID_TIERS = ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C']

export async function GET() {
  const config = loadConfig() as any

  // Built-in models
  const builtInModels = MODELS
    .filter(([, , , , , providerKey]) => {
      return isProviderEnabled(config, providerKey) && getApiKey(config, providerKey)
    })
    .map(([modelId, label, tier, sweScore, ctx, providerKey], idx) => ({
      idx: idx + 1,
      modelId,
      label,
      tier,
      sweScore,
      ctx,
      providerKey,
      providerName: sources[providerKey]?.name ?? providerKey,
      status: 'pending',
      pings: [],
      httpCode: null,
      lastPing: null,
      isCustom: false
    }))

  // Custom models
  const customModels = (config.customModels || []).map((model: any, idx: number) => ({
    idx: builtInModels.length + idx + 1,
    modelId: model.id,
    label: model.name,
    tier: model.tier,
    sweScore: model.price,
    ctx: model.context,
    providerKey: model.provider,
    providerName: config.customProviders?.[model.provider]?.name ?? model.provider,
    status: 'pending',
    pings: [],
    httpCode: null,
    lastPing: null,
    isCustom: true
  }))

  // Merge built-in and custom models
  const allModels = [...builtInModels, ...customModels]

  return json(allModels)
}

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { id, name, context, price, tier, provider } = body

    // Validation
    if (!id || !name || !context || !tier || !provider) {
      return error(400, { message: 'Missing required fields: id, name, context, tier, provider' })
    }

    if (!VALID_TIERS.includes(tier)) {
      return error(400, { message: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` })
    }

    // Check provider exists (built-in or custom)
    const config = loadConfig() as any
    const isBuiltIn = Object.keys(sources).includes(provider)
    const isCustom = config.customProviders?.[provider]

    if (!isBuiltIn && !isCustom) {
      return error(400, { message: 'Provider does not exist' })
    }

    // Add custom model
    config.customModels = config.customModels || []
    config.customModels.push({
      id,
      name,
      context,
      price: price || 'Unknown',
      tier,
      provider
    })
    saveConfig(config)

    return json({ success: true })
  } catch (err) {
    return error(400, { message: 'Invalid request body' })
  }
}

export async function DELETE({ url }) {
  const modelId = url.searchParams.get('id')

  if (!modelId) {
    return error(400, { message: 'Missing model id' })
  }

  const config = loadConfig() as any
  config.customModels = config.customModels || []

  const initialLength = config.customModels.length
  config.customModels = config.customModels.filter((m: any) => m.id !== modelId)

  if (config.customModels.length >= initialLength) {
    return error(404, { message: 'Model not found or is a built-in model' })
  }

  saveConfig(config)
  return json({ success: true })
}
