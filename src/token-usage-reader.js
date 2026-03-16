/**
 * @file token-usage-reader.js
 * @description Reads historical token usage from request-log.jsonl and aggregates it by exact provider + model pair.
 *
 * @details
 *   The TUI already shows live latency and quota state, but that does not tell
 *   you how much you've actually consumed on a given Origin. This module reads
 *   the persistent JSONL request log once at startup and builds a compact
 *   `provider::model -> totalTokens` map for table display.
 *
 *   Why this exists:
 *   - `token-stats.json` keeps convenience aggregates, but not the exact
 *     provider+model sum needed for the new table column.
 *   - `request-log.jsonl` is the source of truth because every proxied request
 *     records prompt and completion token counts with provider context.
 *   - Startup-only parsing keeps runtime overhead negligible during TUI redraws.
 *
 * @functions
 *   → `buildProviderModelTokenKey` — creates a stable aggregation key
 *   → `loadTokenUsageByProviderModel` — reads request-log.jsonl and returns total tokens by provider+model
 *   → `formatTokenTotalCompact` — renders totals as raw ints or compact K / M strings with 2 decimals
 *
 * @exports buildProviderModelTokenKey, loadTokenUsageByProviderModel, formatTokenTotalCompact
 *
 * @see src/log-reader.js
 * @see src/render-table.js
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { loadRecentLogs } from './log-reader.js'

const DEFAULT_DATA_DIR = join(homedir(), '.free-coding-models')
const STATS_FILE = join(DEFAULT_DATA_DIR, 'token-stats.json')

// 📖 buildProviderModelTokenKey keeps provider-scoped totals isolated even when
// 📖 multiple Origins expose the same model ID.
export function buildProviderModelTokenKey(providerKey, modelId) {
  return `${providerKey}::${modelId}`
}

// 📖 loadTokenUsageByProviderModel prioritizes token-stats.json for accurate
// 📖 historical totals. If missing, it falls back to parsing the bounded log history.
export function loadTokenUsageByProviderModel({ logFile, statsFile = STATS_FILE, limit = 50_000 } = {}) {
  // 📖 If a custom logFile is provided (Test Mode), ONLY use that file.
  if (logFile) {
    const testTotals = {}
    const rows = loadRecentLogs({ logFile, limit })
    for (const row of rows) {
      const key = buildProviderModelTokenKey(row.provider, row.model)
      testTotals[key] = (testTotals[key] || 0) + (Number(row.tokens) || 0)
    }
    return testTotals
  }

  const totals = {}

  // 📖 Phase 1: Try to load from the aggregated stats file (canonical source for totals)
  try {
    if (existsSync(statsFile)) {
      const stats = JSON.parse(readFileSync(statsFile, 'utf8'))
      // 📖 Aggregate byAccount entries (which use providerKey/slug/keyIdx as ID)
      // 📖 into providerKey::modelId buckets.
      if (stats.byAccount && typeof stats.byAccount === 'object') {
        for (const [accountId, acct] of Object.entries(stats.byAccount)) {
          const tokens = Number(acct.tokens) || 0
          if (tokens <= 0) continue

          // 📖 Extract providerKey and modelId from accountId (provider/model/index)
          const parts = accountId.split('/')
          if (parts.length >= 2) {
            const providerKey = parts[0]
            const modelId = parts[1]
            const key = buildProviderModelTokenKey(providerKey, modelId)
            totals[key] = (totals[key] || 0) + tokens
          }
        }
      }
    }
  } catch (err) {
    // 📖 Silently fall back to log parsing if stats file is corrupt or unreadable
  }

  // 📖 Phase 2: Supplement with recent log entries if totals are still empty
  // 📖 (e.g. fresh install or token-stats.json deleted)
  if (Object.keys(totals).length === 0) {
    const rows = loadRecentLogs({ limit })
    for (const row of rows) {
      const key = buildProviderModelTokenKey(row.provider, row.model)
      totals[key] = (totals[key] || 0) + (Number(row.tokens) || 0)
    }
  }

  return totals
}

// 📖 formatTokenTotalCompact keeps token counts readable in both the table and log view:
// 📖 0-999 => raw integer, 1k-999k => N.NNk, 1m+ => N.NNM.
export function formatTokenTotalCompact(totalTokens) {
  const safeTotal = Number(totalTokens) || 0
  if (safeTotal >= 999_500) return `${(safeTotal / 1_000_000).toFixed(2)}M`
  if (safeTotal >= 1_000) return `${(safeTotal / 1_000).toFixed(2)}k`
  return String(Math.floor(safeTotal))
}
