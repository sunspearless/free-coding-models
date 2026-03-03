/**
 * @file lib/usage-reader.js
 * @description Pure functions to read model quota usage from token-stats.json.
 *
 * Designed for TUI consumption: reads the pre-computed `quotaSnapshots.byModel`
 * section from the JSON file written by TokenStats.  Never reads the JSONL log.
 *
 * All functions are pure (no shared mutable state) and handle missing/malformed
 * files gracefully by returning safe fallback values.
 *
 * Default path: ~/.free-coding-models/token-stats.json
 *
 * @exports loadUsageMap
 * @exports usageForModelId
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const DEFAULT_STATS_FILE = join(homedir(), '.free-coding-models', 'token-stats.json')

/**
 * Load token-stats.json and return a plain object mapping modelId → quotaPercent.
 *
 * Only includes models whose `quotaPercent` is a finite number.
 * Returns an empty object on any error (missing file, bad JSON, missing keys).
 *
 * @param {string} [statsFile] - Path to token-stats.json (defaults to ~/.free-coding-models/token-stats.json)
 * @returns {Record<string, number>}  e.g. { 'claude-3-5': 80, 'gpt-4o': 45 }
 */
export function loadUsageMap(statsFile = DEFAULT_STATS_FILE) {
  try {
    if (!existsSync(statsFile)) return {}
    const raw = readFileSync(statsFile, 'utf8')
    const data = JSON.parse(raw)

    const byModel = data?.quotaSnapshots?.byModel
    if (!byModel || typeof byModel !== 'object') return {}

    const map = {}
    for (const [modelId, entry] of Object.entries(byModel)) {
      if (entry && typeof entry.quotaPercent === 'number' && isFinite(entry.quotaPercent)) {
        map[modelId] = entry.quotaPercent
      }
    }
    return map
  } catch {
    return {}
  }
}

/**
 * Return the quota percent remaining for a specific model.
 *
 * @param {string} modelId
 * @param {string} [statsFile] - Path to token-stats.json (defaults to ~/.free-coding-models/token-stats.json)
 * @returns {number | null}  quota percent (0–100), or null if unknown
 */
export function usageForModelId(modelId, statsFile = DEFAULT_STATS_FILE) {
  const map = loadUsageMap(statsFile)
  const value = map[modelId]
  return value !== undefined ? value : null
}
