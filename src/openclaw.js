/**
 * @file src/openclaw.js
 * @description OpenClaw config helpers for persisting the selected provider/model as the default.
 *
 * @details
 *   📖 OpenClaw is config-driven: FCM does not launch a separate foreground CLI here.
 *   📖 Pressing Enter in `OpenClaw` mode must therefore do two things reliably:
 *   - install the selected provider/model into `~/.openclaw/openclaw.json`
 *   - set that exact model as the default primary model for the next OpenClaw session
 *
 *   📖 The old implementation was hard-coded to `nvidia/*`, which meant selecting
 *   📖 a Groq/Cerebras/etc. row silently wrote the wrong provider/model into the
 *   📖 OpenClaw config. This module now delegates to the shared direct-install
 *   📖 writer so every supported provider uses the same contract.
 *
 * @functions
 *   → `loadOpenClawConfig` — read the OpenClaw config from disk
 *   → `saveOpenClawConfig` — persist the OpenClaw config to disk
 *   → `startOpenClaw` — install the selected provider/model and set it as default
 *
 * @exports { loadOpenClawConfig, saveOpenClawConfig, startOpenClaw }
 *
 * @see src/endpoint-installer.js
 */

import chalk from 'chalk'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { installProviderEndpoints } from './endpoint-installer.js'
import { ENV_VAR_NAMES } from './provider-metadata.js'
import { PROVIDER_COLOR } from './render-table.js'

const OPENCLAW_CONFIG = join(homedir(), '.openclaw', 'openclaw.json')

function getOpenClawConfigPath(options = {}) {
  return options.paths?.openclawConfigPath || OPENCLAW_CONFIG
}

export function loadOpenClawConfig(options = {}) {
  const filePath = getOpenClawConfigPath(options)
  if (!existsSync(filePath)) return {}
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}

export function saveOpenClawConfig(config, options = {}) {
  const filePath = getOpenClawConfigPath(options)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(config, null, 2))
}

/**
 * 📖 startOpenClaw installs the selected provider/model into OpenClaw and sets
 * 📖 it as the primary default model. OpenClaw itself is not launched here.
 *
 * @param {{ providerKey: string, modelId: string, label: string }} model
 * @param {Record<string, unknown>} config
 * @param {{ paths?: { openclawConfigPath?: string } }} [options]
 * @returns {Promise<ReturnType<typeof installProviderEndpoints> | null>}
 */
export async function startOpenClaw(model, config, options = {}) {
  const providerRgb = PROVIDER_COLOR[model.providerKey] ?? [105, 190, 245]
  const coloredProviderName = chalk.bold.rgb(...providerRgb)(model.providerKey)
  console.log(chalk.rgb(255, 100, 50)(`  🦞 Setting ${chalk.bold(model.label)} as OpenClaw default…`))
  console.log(chalk.dim(`  Provider: ${coloredProviderName}`))
  console.log(chalk.dim(`  Model: ${model.providerKey}/${model.modelId}`))
  console.log()

  try {
    const result = installProviderEndpoints(config, model.providerKey, 'openclaw', {
      scope: 'selected',
      modelIds: [model.modelId],
      track: false,
      paths: options.paths,
    })

    const providerEnvName = ENV_VAR_NAMES[model.providerKey]
    console.log(chalk.rgb(255, 140, 0)(`  ✓ Default model set to: ${result.primaryModelRef || `${result.providerId}/${model.modelId}`}`))
    console.log()
    console.log(chalk.dim(`  📄 Config updated: ${result.path}`))
    if (result.backupPath) console.log(chalk.dim(`  💾 Backup: ${result.backupPath}`))
    if (providerEnvName) console.log(chalk.dim(`  🔑 API key synced under config env.${providerEnvName}`))
    console.log()
    console.log(chalk.dim('  💡 OpenClaw will reload config automatically when it notices the file change.'))
    console.log(chalk.dim(`     To apply manually: openclaw models set ${result.primaryModelRef || `${result.providerId}/${model.modelId}`}`))
    console.log()
    return result
  } catch (error) {
    console.log(chalk.red(`  X Could not configure OpenClaw: ${error instanceof Error ? error.message : String(error)}`))
    console.log()
    return null
  }
}
