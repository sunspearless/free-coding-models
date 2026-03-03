/**
 * @file test/usage-reader.test.js
 * @description Tests for lib/usage-reader.js pure functions (Task 2).
 *
 * Each describe block gets its own isolated temp directory via makeTempDir().
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadUsageMap, usageForModelId } from '../lib/usage-reader.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create an isolated temp dir; returns helpers + cleanup. */
function makeTempDir(label) {
  const dir = join(tmpdir(), `fcm-ur-${label}-${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  const statsFile = join(dir, 'token-stats.json')
  const write = (data) => writeFileSync(statsFile, JSON.stringify(data))
  const cleanup = () => { try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ } }
  return { dir, statsFile, write, cleanup }
}

// ─── Suite: loadUsageMap ──────────────────────────────────────────────────────

describe('usage-reader – loadUsageMap', () => {
  let ctx

  before(() => { ctx = makeTempDir('lum') })
  after(() => ctx.cleanup())

  it('returns empty map when file does not exist', () => {
    const nonexistent = join(ctx.dir, 'no-such-file.json')
    const map = loadUsageMap(nonexistent)
    assert.ok(typeof map === 'object' && map !== null, 'must return an object')
    assert.strictEqual(Object.keys(map).length, 0, 'empty map for missing file')
  })

  it('returns empty map when file contains invalid JSON', () => {
    writeFileSync(ctx.statsFile, '{ this is not valid json !!!}')
    const map = loadUsageMap(ctx.statsFile)
    assert.ok(typeof map === 'object' && map !== null)
    assert.strictEqual(Object.keys(map).length, 0)
  })

  it('returns empty map when file is valid JSON but has no quotaSnapshots', () => {
    ctx.write({ byAccount: {}, byModel: {}, hourly: {}, daily: {} })
    const map = loadUsageMap(ctx.statsFile)
    assert.strictEqual(Object.keys(map).length, 0)
  })

  it('returns empty map when quotaSnapshots.byModel is missing', () => {
    ctx.write({ quotaSnapshots: { byAccount: {} } })
    const map = loadUsageMap(ctx.statsFile)
    assert.strictEqual(Object.keys(map).length, 0)
  })

  it('returns map of modelId -> quotaPercent for valid stats', () => {
    ctx.write({
      quotaSnapshots: {
        byAccount: {},
        byModel: {
          'claude-3-5': { quotaPercent: 80, updatedAt: '2026-03-01T00:00:00.000Z' },
          'gpt-4o': { quotaPercent: 45, updatedAt: '2026-03-01T01:00:00.000Z' },
        },
      },
    })
    const map = loadUsageMap(ctx.statsFile)
    assert.strictEqual(Object.keys(map).length, 2)
    assert.strictEqual(map['claude-3-5'], 80)
    assert.strictEqual(map['gpt-4o'], 45)
  })

  it('includes quotaPercent for entry with updatedAt', () => {
    ctx.write({
      quotaSnapshots: {
        byAccount: {},
        byModel: {
          'gemini-pro': { quotaPercent: 60, updatedAt: '2026-03-01T12:00:00.000Z' },
        },
      },
    })
    const map = loadUsageMap(ctx.statsFile)
    assert.strictEqual(map['gemini-pro'], 60)
  })

  it('skips byModel entries missing quotaPercent field', () => {
    ctx.write({
      quotaSnapshots: {
        byAccount: {},
        byModel: {
          'good-model': { quotaPercent: 70, updatedAt: '2026-03-01T00:00:00.000Z' },
          'bad-model': { updatedAt: '2026-03-01T00:00:00.000Z' }, // missing quotaPercent
        },
      },
    })
    const map = loadUsageMap(ctx.statsFile)
    assert.ok('good-model' in map, 'good-model must be included')
    assert.ok(!('bad-model' in map), 'bad-model missing quotaPercent must be skipped')
  })

  it('handles non-numeric quotaPercent gracefully (skips entry)', () => {
    ctx.write({
      quotaSnapshots: {
        byAccount: {},
        byModel: {
          'fine-model': { quotaPercent: 55, updatedAt: '2026-03-01T00:00:00.000Z' },
          'weird-model': { quotaPercent: 'lots', updatedAt: '2026-03-01T00:00:00.000Z' },
        },
      },
    })
    const map = loadUsageMap(ctx.statsFile)
    assert.ok('fine-model' in map)
    assert.ok(!('weird-model' in map), 'non-numeric quotaPercent must be skipped')
  })

  it('handles null or empty quotaSnapshots gracefully', () => {
    ctx.write({ quotaSnapshots: null })
    assert.doesNotThrow(() => loadUsageMap(ctx.statsFile))

    ctx.write({ quotaSnapshots: {} })
    const map2 = loadUsageMap(ctx.statsFile)
    assert.strictEqual(Object.keys(map2).length, 0)
  })
})

// ─── Suite: usageForModelId ───────────────────────────────────────────────────

describe('usage-reader – usageForModelId', () => {
  let ctx

  before(() => { ctx = makeTempDir('ufm') })
  after(() => ctx.cleanup())

  it('returns null when model not in map', () => {
    ctx.write({
      quotaSnapshots: {
        byAccount: {},
        byModel: {
          'existing-model': { quotaPercent: 70, updatedAt: '2026-01-01T00:00:00.000Z' },
        },
      },
    })
    const result = usageForModelId('no-such-model', ctx.statsFile)
    assert.strictEqual(result, null)
  })

  it('returns quotaPercent for known model', () => {
    ctx.write({
      quotaSnapshots: {
        byAccount: {},
        byModel: {
          'known-model': { quotaPercent: 88, updatedAt: '2026-01-01T00:00:00.000Z' },
        },
      },
    })
    const result = usageForModelId('known-model', ctx.statsFile)
    assert.strictEqual(result, 88)
  })

  it('returns null for missing file', () => {
    const result = usageForModelId('any-model', join(ctx.dir, 'does-not-exist.json'))
    assert.strictEqual(result, null)
  })

  it('returns null for malformed file', () => {
    writeFileSync(ctx.statsFile, 'BROKEN')
    const result = usageForModelId('any-model', ctx.statsFile)
    assert.strictEqual(result, null)
  })
})

// ─── Suite: multi-account aggregation (integration) ──────────────────────────

describe('usage-reader – aggregation from multiple accounts (integration)', () => {
  let ctx

  before(() => { ctx = makeTempDir('agg') })
  after(() => ctx.cleanup())

  it('byModel quotaPercent reflects average of multiple accounts sharing a model', () => {
    // Simulate what TokenStats.updateQuotaSnapshot would produce
    ctx.write({
      quotaSnapshots: {
        byAccount: {
          'acct-a': { quotaPercent: 90, providerKey: 'p1', modelId: 'shared', updatedAt: '2026-03-01T00:00:00.000Z' },
          'acct-b': { quotaPercent: 50, providerKey: 'p2', modelId: 'shared', updatedAt: '2026-03-01T00:01:00.000Z' },
        },
        byModel: {
          // Average of 90 + 50 = 70
          'shared': { quotaPercent: 70, updatedAt: '2026-03-01T00:01:00.000Z' },
        },
      },
    })
    const map = loadUsageMap(ctx.statsFile)
    assert.strictEqual(map['shared'], 70, 'should reflect the stored average')
  })
})
