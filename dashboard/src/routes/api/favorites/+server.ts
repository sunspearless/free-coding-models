import { json, error } from '@sveltejs/kit'
import { loadConfig, saveConfig } from '$lib/config.js'

export async function GET() {
  const config = loadConfig() as any
  return json({ favorites: config.favorites || [] })
}

export async function PUT({ request }) {
  try {
    const body = await request.json()
    const config = loadConfig() as any

    if (!body.modelId) {
      return error(400, { message: 'modelId is required' })
    }

    // 📖 Add model to favorites if not already present
    const favorites = config.favorites || []
    if (!favorites.includes(body.modelId)) {
      favorites.push(body.modelId)
      config.favorites = favorites
      saveConfig(config)
    }

    return json({ favorites: config.favorites })
  } catch (err) {
    return error(400, { message: 'Invalid request body' })
  }
}

export async function DELETE({ request }) {
  try {
    const body = await request.json()
    const config = loadConfig() as any

    if (!body.modelId) {
      return error(400, { message: 'modelId is required' })
    }

    // 📖 Remove model from favorites
    const favorites = config.favorites || []
    config.favorites = favorites.filter((id: string) => id !== body.modelId)
    saveConfig(config)

    return json({ favorites: config.favorites })
  } catch (err) {
    return error(400, { message: 'Invalid request body' })
  }
}
