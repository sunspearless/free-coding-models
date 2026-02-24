import { json, error } from '@sveltejs/kit'
import { loadConfig, saveConfig } from '$lib/config.js'
import { sources } from '$lib/sources.js'

// Built-in providers from sources.js
const BUILTIN_PROVIDERS = Object.entries(sources).map(([key, value]) => ({
  key,
  name: value.name,
  url: value.url,
  isBuiltIn: true
}))

export async function GET() {
  const config = loadConfig() as any

  // Merge built-in and custom providers
  const customProviders = Object.entries(config.customProviders || {}).map(([key, value]: [string, any]) => ({
    key,
    name: value.name,
    url: value.url,
    isBuiltIn: false
  }))

  const allProviders = [...BUILTIN_PROVIDERS, ...customProviders]

  return json({ providers: allProviders })
}

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { key, name, url } = body

    // Validation
    if (!key || !name || !url) {
      return error(400, { message: 'Missing required fields: key, name, url' })
    }

    if (!url.startsWith('https://')) {
      return error(400, { message: 'URL must start with https://' })
    }

    if (BUILTIN_PROVIDERS.some(p => p.key === key)) {
      return error(400, { message: 'Cannot override built-in provider' })
    }

    const config = loadConfig() as any
    config.customProviders = config.customProviders || {}

    if (config.customProviders[key]) {
      return error(400, { message: 'Provider key already exists' })
    }

    config.customProviders[key] = { name, url }
    saveConfig(config)

    return json({ success: true, provider: { key, name, url, isBuiltIn: false } })
  } catch (err) {
    return error(400, { message: 'Invalid request body' })
  }
}

export async function DELETE({ url }) {
  const key = url.searchParams.get('key')

  if (!key) {
    return error(400, { message: 'Missing provider key' })
  }

  if (BUILTIN_PROVIDERS.some(p => p.key === key)) {
    return error(400, { message: 'Cannot delete built-in provider' })
  }

  const config = loadConfig() as any
  config.customProviders = config.customProviders || {}

  if (!config.customProviders[key]) {
    return error(404, { message: 'Provider not found' })
  }

  // Remove provider and its models
  delete config.customProviders[key]
  config.customModels = (config.customModels || []).filter((m: any) => m.provider !== key)
  saveConfig(config)

  return json({ success: true })
}
