import { json, error } from '@sveltejs/kit'
import { loadConfig, saveConfig } from '$lib/config.js'

export async function GET() {
  const config = loadConfig() as any

  // 📖 Return masked API keys for security (only show first 4 chars + ...)
  const maskedKeys: Record<string, string> = {}
  for (const [provider, key] of Object.entries(config.apiKeys || {})) {
    if (key && key.length > 8) {
      maskedKeys[provider] = key.substring(0, 4) + '...' + key.substring(key.length - 4)
    } else {
      maskedKeys[provider] = key || ''
    }
  }

  return json({
    apiKeys: maskedKeys,
    providers: config.providers || {},
    favorites: config.favorites || [],
    pingHistory: config.pingHistory || {},
    customProviders: config.customProviders || {},
    customModels: config.customModels || []
  })
}

export async function PUT({ request }) {
  try {
    const body = await request.json()
    const config = loadConfig() as any

    // 📖 Initialize providers if missing (prevents empty providers object on save)
    if (!config.providers || Object.keys(config.providers).length === 0) {
      config.providers = {
        nvidia: { enabled: true },
        groq: { enabled: true },
        cerebras: { enabled: true },
        openrouter: { enabled: true },
        zai: { enabled: true },
        ollama: { enabled: true }
      }
    }

    // 📖 Update API keys if provided (only update non-empty values to preserve existing keys)
    if (body.apiKeys) {
      for (const [provider, newKey] of Object.entries(body.apiKeys)) {
        if (newKey && newKey.trim()) {
          config.apiKeys[provider] = newKey
        }
      }
    }

    // 📖 Update provider enabled state if provided
    if (body.providers) {
      for (const [provider, providerConfig] of Object.entries(body.providers)) {
        if (providerConfig) {
          config.providers[provider] = providerConfig
        }
      }
    }

    // 📖 Update favorites if provided
    if (body.favorites) {
      config.favorites = body.favorites
    }

    // 📖 Update customProviders if provided
    if (body.customProviders) {
      config.customProviders = body.customProviders
    }

    // 📖 Update customModels if provided
    if (body.customModels) {
      config.customModels = body.customModels
    }

    saveConfig(config)

    return json({ success: true })
  } catch (err) {
    return error(400, { message: 'Invalid request body' })
  }
}
