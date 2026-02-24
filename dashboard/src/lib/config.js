/**
 * @file lib/config.js
 * @description JSON config management for free-coding-models multi-provider support.
 *
 * 📖 This module manages ~/.free-coding-models.json, the new config file that
 *    stores API keys and per-provider enabled/disabled state for all providers
 *    (NVIDIA NIM, Groq, Cerebras, etc.).
 *
 * 📖 Config file location: ~/.free-coding-models.json
 * 📖 File permissions: 0o600 (user read/write only — contains API keys)
 *
 * 📖 Config JSON structure:
 *   {
 *     "apiKeys": { "nvidia": "nvapi-xxx", "groq": "gsk_xxx", ... },
 *     "providers": { "nvidia": { "enabled": true }, ... },
 *     "favorites": [],
 *     "pingHistory": {},
 *     "customProviders": {
 *       "my-provider": { "name": "My API", "url": "https://api.example.com/v1/chat/completions" }
 *     },
 *     "customModels": [
 *       { "id": "my-provider/my-model", "name": "My Model", "context": "128k", "price": "Free", "tier": "A", "provider": "my-provider" }
 *     ]
 *   }
 *
 * @functions
 *   → loadConfig() — Read config with customProviders/customModels
 *   → saveConfig(config) — Write config with proper → addCustomProvider permissions
 *  (key, name, url) — Add custom provider
 *   → removeCustomProvider(key) — Remove custom provider
 *   → addCustomModel(model) — Add custom model
 *   → removeCustomModel(modelId) — Remove custom model
 *
 * @exports loadConfig, saveConfig, addCustomProvider, removeCustomProvider, addCustomModel, removeCustomModel
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// 📖 New JSON config path — stores all providers' API keys + enabled state
export const CONFIG_PATH = join(homedir(), '.free-coding-models.json')

// 📖 Old plain-text config path — used only for migration
const LEGACY_CONFIG_PATH = join(homedir(), '.free-coding-models')

// 📖 Environment variable names per provider
// 📖 These allow users to override config via env vars (useful for CI/headless setups)
const ENV_VARS = {
  nvidia:     'NVIDIA_API_KEY',
  groq:       'GROQ_API_KEY',
  cerebras:    'CEREBRAS_API_KEY',
  openrouter:  'OPENROUTER_API_KEY',
  zai:         'ZAI_API_KEY',
  ollama:      'OLLAMA_CLOUD_API_KEY',
}

/**
 * 📖 loadConfig: Read the JSON config from disk.
 *
 * 📖 Fallback chain:
 *   1. Try to read ~/.free-coding-models.json (new format)
 *   2. If missing, check if ~/.free-coding-models (old plain-text) exists → migrate
 *   3. If neither, return an empty default config
 *
 * 📖 The migration reads the old file as a plain nvidia API key and writes
 *    a proper JSON config. The old file is NOT deleted (safety first).
 *
 * @returns {{ apiKeys: Record<string,string>, providers: Record<string,{enabled:boolean}> }}
 */
export function loadConfig() {
  // 📖 Try new JSON config first
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf8').trim()
      const parsed = JSON.parse(raw)
   // 📖 Ensure the shape is always complete — fill missing sections with defaults
    if (!parsed.apiKeys) parsed.apiKeys = {}
    if (!parsed.providers) parsed.providers = {}
    if (!parsed.favorites) parsed.favorites = []
    if (!parsed.pingHistory) parsed.pingHistory = {}
    if (!parsed.customProviders) parsed.customProviders = {}
    if (!parsed.customModels) parsed.customModels = []
    return parsed
    } catch {
      // 📖 Corrupted JSON — return empty config (user will re-enter keys)
      return _emptyConfig()
    }
  }

  // 📖 Migration path: old plain-text file exists, new JSON doesn't
  if (existsSync(LEGACY_CONFIG_PATH)) {
    try {
      const oldKey = readFileSync(LEGACY_CONFIG_PATH, 'utf8').trim()
      if (oldKey) {
        const config = _emptyConfig()
        config.apiKeys.nvidia = oldKey
        // 📖 Auto-save migrated config so next launch is fast
        saveConfig(config)
        return config
      }
    } catch {
      // 📖 Can't read old file — proceed with empty config
    }
  }

  return _emptyConfig()
}

/**
 * 📖 saveConfig: Write config object to ~/.free-coding-models.json.
 *
 * 📖 Uses mode 0o600 so file is only readable by the owning user (API keys!).
 * 📖 Pretty-prints JSON for human readability.
 *
 * @param {{ apiKeys: Record<string,string>, providers: Record<string,{enabled:boolean}> }} config
 */
export function saveConfig(config) {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
  } catch {
    // 📖 Silently fail — the app is still usable, keys just won't persist
  }
}

/**
 * 📖 getApiKey: Get the effective API key for a provider.
 *
 * 📖 Priority order (first non-empty wins):
 *   1. Environment variable (e.g. NVIDIA_API_KEY) — for CI/headless
 *   2. Config file value — from ~/.free-coding-models.json
 *   3. null — no key configured
 *
 * @param {{ apiKeys: Record<string,string> }} config
 * @param {string} providerKey — e.g. 'nvidia', 'groq', 'cerebras'
 * @returns {string|null}
 */
export function getApiKey(config, providerKey) {
  // 📖 Env var override — takes precedence over everything
  const envVar = ENV_VARS[providerKey]
  if (envVar && process.env[envVar]) return process.env[envVar]

  // 📖 Config file value
  const key = config?.apiKeys?.[providerKey]
  if (key) return key

  return null
}

/**
 * 📖 isProviderEnabled: Check if a provider is enabled in config.
 *
 * 📖 Providers are enabled by default if not explicitly set to false.
 * 📖 A provider without an API key should still appear in settings (just can't ping).
 *
 * @param {{ providers: Record<string,{enabled:boolean}> }} config
 * @param {string} providerKey
 * @returns {boolean}
 */
export function isProviderEnabled(config, providerKey) {
  const providerConfig = config?.providers?.[providerKey]
  if (!providerConfig) return true // 📖 Default: enabled
  return providerConfig.enabled !== false
}

// 📖 Internal helper: create a blank config with the right shape
function _emptyConfig() {
  return {
    apiKeys: {},
    providers: {},
    favorites: [],
    pingHistory: {},
    customProviders: {},
    customModels: []
  }
}

/**
 * 📖 addCustomProvider: Add a new custom provider.
 *
 * @param {string} key — Unique identifier (e.g., 'my-api')
 * @param {string} name — Display name (e.g., 'My Custom API')
 * @param {string} url — API endpoint URL
 * @returns {boolean} — True if added, false if key already exists
 */
export function addCustomProvider(key, name, url) {
  const config = loadConfig()
  if (config.customProviders[key]) return false
  config.customProviders[key] = { name, url }
  saveConfig(config)
  return true
}

/**
 * 📖 removeCustomProvider: Remove a custom provider and its models.
 *
 * @param {string} key — Provider key to remove
 * @returns {boolean} — True if removed, false if not found
 */
export function removeCustomProvider(key) {
  const config = loadConfig()
  if (!config.customProviders[key]) return false
  delete config.customProviders[key]
  // Also remove all custom models from this provider
  config.customModels = (config.customModels || []).filter(m => m.provider !== key)
  saveConfig(config)
  return true
}

/**
 * 📖 addCustomModel: Add a new custom model.
 *
 * @param {{ id: string, name: string, context: string, price: string, tier: string, provider: string }} model
 * @returns {boolean} — True if added
 */
export function addCustomModel(model) {
  const config = loadConfig()
  config.customModels = config.customModels || []
  config.customModels.push(model)
  saveConfig(config)
  return true
}

/**
 * 📖 removeCustomModel: Remove a custom model by ID.
 *
 * @param {string} modelId — Model ID to remove
 * @returns {boolean} — True if removed, false if not found
 */
export function removeCustomModel(modelId) {
  const config = loadConfig()
  const initialLength = (config.customModels || []).length
  config.customModels = (config.customModels || []).filter(m => m.id !== modelId)
  if (config.customModels.length < initialLength) {
    saveConfig(config)
    return true
  }
  return false
}
