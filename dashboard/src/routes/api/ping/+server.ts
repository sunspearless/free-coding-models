import { json, error } from '@sveltejs/kit'
import { loadConfig, saveConfig, getApiKey } from '$lib/config.js'
import { sources } from '$lib/sources.js'

const PING_TIMEOUT = 15000 // 15 seconds

/**
 * 📖 ping: Send a single chat completion request to measure model availability and latency.
 * 📖 url param is the provider's endpoint URL — differs per provider (NIM, Groq, Cerebras).
 * 📖 apiKey can be null — in that case no Authorization header is sent.
 * 📖 A 401 response still tells us the server is UP and gives us real latency.
 */
async function ping(apiKey, modelId, url) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT)
  const t0    = performance.now()
  try {
    // 📖 Only attach Authorization header when a key is available
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    const resp = await fetch(url, {
      method: 'POST', signal: ctrl.signal,
      headers,
      body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
    })
    return { code: String(resp.status), ms: Math.round(performance.now() - t0) }
  } catch (err) {
    const isTimeout = err.name === 'AbortError'
    return {
      code: isTimeout ? '000' : 'ERR',
      ms: isTimeout ? 'TIMEOUT' : Math.round(performance.now() - t0)
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json()

    const { modelId, providerKey } = body
    if (!modelId || !providerKey) {
      return error(400, { message: 'Missing modelId or providerKey' })
    }

    const config = loadConfig()
    const apiKey = getApiKey(config, providerKey)
    const url = sources[providerKey]?.url

    if (!url) {
      return error(400, { message: 'Invalid provider' })
    }

    const result = await ping(apiKey, modelId, url)

    // 📖 Determine status based on result
    let status
    if (result.code === '200') {
      status = 'up'
    } else if (result.code === '000') {
      status = 'timeout'
    } else if (result.code === '401') {
      status = 'noauth'
    } else {
      status = 'down'
    }

    // 📖 Store ping result in history (keep last 10 per model)
    const pingConfig = loadConfig()
    const history = pingConfig.pingHistory || {}
    const modelHistory = history[modelId] || []
    
    // 📖 Add new ping with timestamp and status
    const pingEntry = {
      ms: result.ms,
      code: result.code,
      timestamp: Date.now(),
      status
    }
    
    // 📖 Keep only last 10 pings for this model
    history[modelId] = [pingEntry, ...modelHistory.slice(0, 9)]
    pingConfig.pingHistory = history
    saveConfig(pingConfig)

    return json({
      code: result.code,
      ms: result.ms,
      status,
      httpCode: result.code
    })
  } catch (err) {
    return error(500, { message: 'Internal server error' })
  }
}
