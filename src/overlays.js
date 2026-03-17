/**
 * @file overlays.js
 * @description Factory for TUI overlay renderers and recommend analysis flow.
 *
 * @details
 *   This module centralizes all overlay rendering in one place:
 *   - Settings, Install Endpoints, Help, Smart Recommend, Feedback, Changelog
 *   - Settings diagnostics for provider key tests, including wrapped retry/error details
 *   - Recommend analysis timer orchestration and progress updates
 *
 *   The factory pattern keeps stateful UI logic isolated while still
 *   allowing the main CLI to control shared state and dependencies.
 *
 *   📖 Feedback overlay (I key) combines feature requests + bug reports in one left-aligned input
 *
 *   → Functions:
 *   - `createOverlayRenderers` — returns renderer + analysis helpers
 *
 * @exports { createOverlayRenderers }
 * @see ./key-handler.js — handles keypresses for all overlay interactions
 */

import { loadChangelog } from './changelog-loader.js'
import { buildCliHelpLines } from './cli-help.js'

export function createOverlayRenderers(state, deps) {
  const {
    chalk,
    sources,
    PROVIDER_METADATA,
    PROVIDER_COLOR,
    LOCAL_VERSION,
    getApiKey,
    resolveApiKeys,
    isProviderEnabled,
    TIER_CYCLE,
    SETTINGS_OVERLAY_BG,
    HELP_OVERLAY_BG,
    RECOMMEND_OVERLAY_BG,
    OVERLAY_PANEL_WIDTH,
    keepOverlayTargetVisible,
    sliceOverlayLines,
    tintOverlayLines,
    TASK_TYPES,
    PRIORITY_TYPES,
    CONTEXT_BUDGETS,
    FRAMES,
    TIER_COLOR,
    getAvg,
    getStabilityScore,
    toFavoriteKey,
    getTopRecommendations,
    adjustScrollOffset,
    getPingModel,
    getConfiguredInstallableProviders,
    getInstallTargetModes,
    getProviderCatalogModels,
    getToolMeta,
  } = deps

  // 📖 Wrap plain diagnostic text so long Settings messages stay readable inside
  // 📖 the overlay instead of turning into one truncated red line.
  // 📖 Uses 100% of terminal width minus padding for better readability.
  const wrapPlainText = (text, width = null) => {
    const effectiveWidth = width || (state.terminalCols - 16)
    const normalized = typeof text === 'string' ? text.trim() : ''
    if (!normalized) return []
    const words = normalized.split(/\s+/)
    const lines = []
    let current = ''
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (next.length > effectiveWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = next
      }
    }
    if (current) lines.push(current)
    return lines
  }

  // ─── Settings screen renderer ─────────────────────────────────────────────
  // 📖 renderSettings: Draw the settings overlay in the alt screen buffer.
  // 📖 Shows all providers with their API key (masked) + enabled state.
  // 📖 When in edit mode (settingsEditMode=true), shows an inline input field.
  // 📖 Key "T" in settings = test API key for selected provider.
  function renderSettings() {
    const providerKeys = Object.keys(sources)
    const updateRowIdx = providerKeys.length
    const widthWarningRowIdx = updateRowIdx + 1
    const cleanupLegacyProxyRowIdx = widthWarningRowIdx + 1
    const changelogViewRowIdx = cleanupLegacyProxyRowIdx + 1
    const EL = '\x1b[K'
    const lines = []
    const cursorLineByRow = {}

    // 📖 Branding header
    lines.push(`  ${chalk.cyanBright('🚀')} ${chalk.bold.cyanBright('free-coding-models')} ${chalk.dim(`v${LOCAL_VERSION}`)}`)
    lines.push(`  ${chalk.bold('⚙  Settings')}`)

    if (state.settingsErrorMsg) {
      lines.push(`  ${chalk.red.bold(state.settingsErrorMsg)}`)
      lines.push('')
    }

    lines.push(`  ${chalk.bold('🧩 Providers')}`)
    // 📖 Dynamic separator line using 100% terminal width
    const separatorWidth = Math.max(20, state.terminalCols - 10)
    lines.push(`  ${chalk.dim('  ' + '─'.repeat(separatorWidth))}`)
    lines.push('')

    for (let i = 0; i < providerKeys.length; i++) {
      const pk = providerKeys[i]
      const src = sources[pk]
      const meta = PROVIDER_METADATA[pk] || {}
      const isCursor = i === state.settingsCursor
      const enabled = isProviderEnabled(state.config, pk)
      const keyVal = state.config.apiKeys?.[pk] ?? ''
      // 📖 Resolve all keys for this provider (for multi-key display)
      const allKeys = resolveApiKeys(state.config, pk)
      const keyCount = allKeys.length

      // 📖 Build API key display — mask most chars, show last 4
      let keyDisplay
      if ((state.settingsEditMode || state.settingsAddKeyMode) && isCursor) {
        // 📖 Inline editing/adding: show typed buffer with cursor indicator
        const modePrefix = state.settingsAddKeyMode ? chalk.dim('[+] ') : ''
        keyDisplay = chalk.cyanBright(`${modePrefix}${state.settingsEditBuffer || ''}▏`)
      } else if (keyCount > 0) {
        // 📖 Show the primary (first/string) key masked + count indicator for extras
        const primaryKey = allKeys[0]
        const visible = primaryKey.slice(-4)
        const masked = '•'.repeat(Math.min(16, Math.max(4, primaryKey.length - 4)))
        const keyMasked = chalk.dim(masked + visible)
        const extra = keyCount > 1 ? chalk.cyan(` (+${keyCount - 1} more)`) : ''
        keyDisplay = keyMasked + extra
      } else {
        keyDisplay = chalk.dim('(no key set)')
      }

      // 📖 Test result badge
      const testResult = state.settingsTestResults[pk]
      // 📖 Default badge reflects configuration first: a saved key should look
      // 📖 ready to test even before the user has run the probe once.
      let testBadge = keyCount > 0 ? chalk.cyan('[Test]') : chalk.dim('[Missing Key 🔑]')
      if (testResult === 'pending') testBadge = chalk.yellow('[Testing…]')
      else if (testResult === 'ok')   testBadge = chalk.greenBright('[Test ✅]')
      else if (testResult === 'missing_key') testBadge = chalk.dim('[Missing Key 🔑]')
      else if (testResult === 'auth_error') testBadge = chalk.red('[Auth ❌]')
      else if (testResult === 'rate_limited') testBadge = chalk.yellow('[Rate limit ⏳]')
      else if (testResult === 'no_callable_model') testBadge = chalk.magenta('[No model ⚠]')
      else if (testResult === 'fail') testBadge = chalk.red('[Test ❌]')
      // 📖 No truncation of rate limits - overlay now uses 100% terminal width
      const rateSummary = chalk.dim(meta.rateLimits || 'No limit info')

      const enabledBadge = enabled ? chalk.greenBright('✅') : chalk.redBright('❌')
      // 📖 Color provider names the same way as in the main table
      const providerRgb = PROVIDER_COLOR[pk] ?? [105, 190, 245]
      const providerName = chalk.bold.rgb(...providerRgb)((meta.label || src.name || pk).slice(0, 22).padEnd(22))
      const bullet = isCursor ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')

      const row = `${bullet}[ ${enabledBadge} ] ${providerName}  ${keyDisplay.padEnd(30)}  ${testBadge}  ${rateSummary}`
      cursorLineByRow[i] = lines.length
      lines.push(isCursor ? chalk.bgRgb(30, 30, 60)(row) : row)
    }

    lines.push('')
    const selectedProviderKey = providerKeys[Math.min(state.settingsCursor, providerKeys.length - 1)]
    const selectedSource = sources[selectedProviderKey]
    const selectedMeta = PROVIDER_METADATA[selectedProviderKey] || {}
    if (selectedSource && state.settingsCursor < providerKeys.length) {
      const selectedKey = getApiKey(state.config, selectedProviderKey)
      const setupStatus = selectedKey ? chalk.green('API key detected ✅') : chalk.yellow('API key missing ⚠')
      // 📖 Color the provider name in the setup instructions header
      const selectedProviderRgb = PROVIDER_COLOR[selectedProviderKey] ?? [105, 190, 245]
      const coloredProviderName = chalk.bold.rgb(...selectedProviderRgb)(selectedMeta.label || selectedSource.name || selectedProviderKey)
      lines.push(`  ${chalk.bold('Setup Instructions')} — ${coloredProviderName}`)
      lines.push(chalk.dim(`  1) Create a ${selectedMeta.label || selectedSource.name} account: ${selectedMeta.signupUrl || 'signup link missing'}`))
      lines.push(chalk.dim(`  2) ${selectedMeta.signupHint || 'Generate an API key and paste it with Enter on this row'}`))
      lines.push(chalk.dim(`  3) Press ${chalk.yellow('T')} to test your key. Status: ${setupStatus}`))
      if (selectedProviderKey === 'cloudflare') {
        const hasAccountId = Boolean((process.env.CLOUDFLARE_ACCOUNT_ID || '').trim())
        const accountIdStatus = hasAccountId ? chalk.green('CLOUDFLARE_ACCOUNT_ID detected ✅') : chalk.yellow('Set CLOUDFLARE_ACCOUNT_ID ⚠')
        lines.push(chalk.dim(`  4) Export ${chalk.yellow('CLOUDFLARE_ACCOUNT_ID')} in your shell. Status: ${accountIdStatus}`))
      }
      const testDetail = state.settingsTestDetails?.[selectedProviderKey]
      if (testDetail) {
        lines.push('')
        lines.push(chalk.red.bold('  Test Diagnostics'))
        for (const detailLine of wrapPlainText(testDetail)) {
          lines.push(chalk.red(`  ${detailLine}`))
        }
      }
      lines.push('')
    }

    lines.push('')
    lines.push(`  ${chalk.bold('🛠 Maintenance')}`)
    lines.push(`  ${chalk.dim('  ' + '─'.repeat(separatorWidth))}`)
    lines.push('')

    const updateCursor = state.settingsCursor === updateRowIdx
    const updateBullet = updateCursor ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
    const updateState = state.settingsUpdateState
    const latestFound = state.settingsUpdateLatestVersion
    const updateActionLabel = updateState === 'available' && latestFound
      ? `Install update (v${latestFound})`
      : 'Check for updates manually'
    let updateStatus = chalk.dim('Press Enter or U to check npm registry')
    if (updateState === 'checking') updateStatus = chalk.yellow('Checking npm registry…')
    if (updateState === 'available' && latestFound) updateStatus = chalk.greenBright(`Update available: v${latestFound} (Enter to install)`)
    if (updateState === 'up-to-date') updateStatus = chalk.green('Already on latest version')
    if (updateState === 'error') updateStatus = chalk.red('Check failed (press U to retry)')
    if (updateState === 'installing') updateStatus = chalk.cyan('Installing update…')
    const updateRow = `${updateBullet}${chalk.bold(updateActionLabel).padEnd(44)} ${updateStatus}`
    cursorLineByRow[updateRowIdx] = lines.length
    lines.push(updateCursor ? chalk.bgRgb(30, 30, 60)(updateRow) : updateRow)
    // 📖 Widths Warning toggle row (disable widths warning)
    const disableWidthsWarning = Boolean(state.config.settings?.disableWidthsWarning)
    const widthWarningBullet = state.settingsCursor === widthWarningRowIdx ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
    const widthWarningStatus = disableWidthsWarning ? chalk.greenBright('DISABLED') : chalk.dim('enabled')
    const widthWarningRow = `${widthWarningBullet}${chalk.bold('Disable Widths Warning').padEnd(44)} ${widthWarningStatus}`
    cursorLineByRow[widthWarningRowIdx] = lines.length
    lines.push(state.settingsCursor === widthWarningRowIdx ? chalk.bgRgb(30, 30, 60)(widthWarningRow) : widthWarningRow)
    if (updateState === 'error' && state.settingsUpdateError) {
      lines.push(chalk.red(`      ${state.settingsUpdateError}`))
    }

    // 📖 Cleanup row removes stale proxy-era config left behind by older builds.
    const cleanupLegacyProxyBullet = state.settingsCursor === cleanupLegacyProxyRowIdx ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
    const cleanupLegacyProxyRow = `${cleanupLegacyProxyBullet}${chalk.bold('Clean Legacy Proxy Config').padEnd(44)} ${chalk.magentaBright('Enter remove discontinued bridge leftovers')}`
    cursorLineByRow[cleanupLegacyProxyRowIdx] = lines.length
    lines.push(state.settingsCursor === cleanupLegacyProxyRowIdx ? chalk.bgRgb(55, 25, 55)(cleanupLegacyProxyRow) : cleanupLegacyProxyRow)

    // 📖 Changelog viewer row
    const changelogViewBullet = state.settingsCursor === changelogViewRowIdx ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
    const changelogViewRow = `${changelogViewBullet}${chalk.bold('View Changelog').padEnd(44)} ${chalk.dim('Enter browse version history')}`
    cursorLineByRow[changelogViewRowIdx] = lines.length
    lines.push(state.settingsCursor === changelogViewRowIdx ? chalk.bgRgb(30, 45, 30)(changelogViewRow) : changelogViewRow)

    // 📖 Profile system removed - API keys now persist permanently across all sessions

    lines.push('')
    if (state.settingsEditMode) {
      lines.push(chalk.dim('  Type API key  •  Enter Save  •  Esc Cancel'))
    } else {
      lines.push(chalk.dim('  ↑↓ Navigate  •  Enter Edit/Run  •  + Add key  •  - Remove key  •  Space Toggle  •  T Test key  •  U Updates  •  Esc Close'))
    }
    // 📖 Show sync/restore status message if set
    if (state.settingsSyncStatus) {
      const { type, msg } = state.settingsSyncStatus
      lines.push(type === 'success' ? chalk.greenBright(`  ${msg}`) : chalk.yellow(`  ${msg}`))
    }
    lines.push('')

    // 📖 Footer with credits
    lines.push('')
    lines.push(
      chalk.dim('  ') +
      chalk.rgb(255, 150, 200)('Made with 💖 & ☕ by ') +
      chalk.cyanBright('\x1b]8;;https://github.com/vava-nessa\x1b\\vava-nessa\x1b]8;;\x1b\\') +
      chalk.dim('  •  ☕ ') +
      chalk.rgb(255, 200, 100)('\x1b]8;;https://buymeacoffee.com/vavanessadev\x1b\\Buy me a coffee\x1b]8;;\x1b\\') +
      chalk.dim('  •  ') +
      'Esc to close'
    )

    // 📖 Keep selected Settings row visible on small terminals by scrolling the overlay viewport.
    const targetLine = cursorLineByRow[state.settingsCursor] ?? 0
    state.settingsScrollOffset = keepOverlayTargetVisible(
      state.settingsScrollOffset,
      targetLine,
      lines.length,
      state.terminalRows
    )
    const { visible, offset } = sliceOverlayLines(lines, state.settingsScrollOffset, state.terminalRows)
    state.settingsScrollOffset = offset

    const tintedLines = tintOverlayLines(visible, SETTINGS_OVERLAY_BG, state.terminalCols)
    const cleared = tintedLines.map(l => l + EL)
    return cleared.join('\n')
  }

  // ─── Install Endpoints overlay renderer ───────────────────────────────────
  // 📖 renderInstallEndpoints drives the provider → tool → scope → model flow
  // 📖 behind the `Y` hotkey. It deliberately reuses the same overlay viewport
  // 📖 helpers as Settings so long provider/model lists stay navigable.
  function renderInstallEndpoints() {
    const EL = '\x1b[K'
    const lines = []
    const cursorLineByRow = {}
    const providerChoices = getConfiguredInstallableProviders(state.config)
    const toolChoices = getInstallTargetModes()
    const totalSteps = 4
    const scopeChoices = [
      {
        key: 'all',
        label: 'Install all models',
        hint: 'Recommended — FCM will refresh this provider catalog automatically later.',
      },
      {
        key: 'selected',
        label: 'Install selected models only',
        hint: 'Choose a smaller curated subset for a cleaner model picker.',
      },
    ]
    const selectedProviderLabel = state.installEndpointsProviderKey
      ? (sources[state.installEndpointsProviderKey]?.name || state.installEndpointsProviderKey)
      : '—'

    // 📖 Resolve tool label from metadata instead of hard-coded switch
    const selectedToolLabel = state.installEndpointsToolMode
      ? (() => {
          const meta = getToolMeta(state.installEndpointsToolMode)
          const suffix = state.installEndpointsToolMode.startsWith('opencode') ? ' (shared opencode.json)' : ''
          return `${meta.label}${suffix}`
        })()
      : '—'

    const selectedConnectionLabel = 'Direct Provider'

    lines.push('')
    // 📖 Branding header
    lines.push(`  ${chalk.cyanBright('🚀')} ${chalk.bold.cyanBright('free-coding-models')} ${chalk.dim(`v${LOCAL_VERSION}`)}`)
    lines.push(`  ${chalk.bold('🔌 Install Endpoints')}`)
    lines.push('')
    lines.push(chalk.dim('  — install provider catalogs into supported coding tools'))
    if (state.installEndpointsErrorMsg) {
      lines.push(`  ${chalk.yellow(state.installEndpointsErrorMsg)}`)
    }
    lines.push('')

    if (state.installEndpointsPhase === 'providers') {
      lines.push(`  ${chalk.bold(`Step 1/${totalSteps}`)}  ${chalk.cyan('Choose a configured provider')}`)
      lines.push('')

      if (providerChoices.length === 0) {
        lines.push(chalk.dim('  No configured providers can be installed directly right now.'))
        lines.push(chalk.dim('  Add an API key in Settings (`P`) first, then reopen this screen.'))
      } else {
        providerChoices.forEach((provider, idx) => {
          const isCursor = idx === state.installEndpointsCursor
          const bullet = isCursor ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
          const row = `${bullet}${chalk.bold(provider.label.padEnd(24))} ${chalk.dim(`${provider.modelCount} models`)}`
          cursorLineByRow[idx] = lines.length
          lines.push(isCursor ? chalk.bgRgb(24, 44, 62)(row) : row)
        })
      }

      lines.push('')
      lines.push(chalk.dim('  ↑↓ Navigate  •  Enter Choose provider  •  Esc Close'))
    } else if (state.installEndpointsPhase === 'tools') {
      lines.push(`  ${chalk.bold(`Step 2/${totalSteps}`)}  ${chalk.cyan('Choose the target tool')}`)
      lines.push(chalk.dim(`  Provider: ${selectedProviderLabel}`))
      lines.push('')

      // 📖 Use getToolMeta for labels instead of hard-coded ternary chains
      toolChoices.forEach((toolMode, idx) => {
        const isCursor = idx === state.installEndpointsCursor
        const meta = getToolMeta(toolMode)
        const label = `${meta.emoji} ${meta.label}`
        const note = toolMode.startsWith('opencode')
          ? chalk.dim('shared config file')
          : toolMode === 'openhands'
            ? chalk.dim('env file (~/.fcm-*-env)')
            : chalk.dim('managed config install')
        const bullet = isCursor ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
        const row = `${bullet}${chalk.bold(label.padEnd(26))} ${note}`
        cursorLineByRow[idx] = lines.length
        lines.push(isCursor ? chalk.bgRgb(24, 44, 62)(row) : row)
      })

      lines.push('')
      lines.push(chalk.dim('  ↑↓ Navigate  •  Enter Choose tool  •  Esc Back'))
    } else if (state.installEndpointsPhase === 'scope') {
      lines.push(`  ${chalk.bold(`Step 3/${totalSteps}`)}  ${chalk.cyan('Choose the install scope')}`)
      lines.push(chalk.dim(`  Provider: ${selectedProviderLabel}  •  Tool: ${selectedToolLabel}  •  ${selectedConnectionLabel}`))
      lines.push('')

      scopeChoices.forEach((scope, idx) => {
        const isCursor = idx === state.installEndpointsCursor
        const bullet = isCursor ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
        const row = `${bullet}${chalk.bold(scope.label)}`
        cursorLineByRow[idx] = lines.length
        lines.push(isCursor ? chalk.bgRgb(24, 44, 62)(row) : row)
        lines.push(chalk.dim(`      ${scope.hint}`))
        lines.push('')
      })

      lines.push(chalk.dim('  Enter Continue  •  Esc Back'))
    } else if (state.installEndpointsPhase === 'models') {
      const models = getProviderCatalogModels(state.installEndpointsProviderKey)
      const selectedCount = state.installEndpointsSelectedModelIds.size

      lines.push(`  ${chalk.bold(`Step 4/${totalSteps}`)}  ${chalk.cyan('Choose which models to install')}`)
      lines.push(chalk.dim(`  Provider: ${selectedProviderLabel}  •  Tool: ${selectedToolLabel}  •  ${selectedConnectionLabel}`))
      lines.push(chalk.dim(`  Selected: ${selectedCount}/${models.length}`))
      lines.push('')

      models.forEach((model, idx) => {
        const isCursor = idx === state.installEndpointsCursor
        const selected = state.installEndpointsSelectedModelIds.has(model.modelId)
        const bullet = isCursor ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
        const checkbox = selected ? chalk.greenBright('[✓]') : chalk.dim('[ ]')
        const tier = chalk.cyan(model.tier.padEnd(2))
        const row = `${bullet}${checkbox} ${chalk.bold(model.label.padEnd(26))} ${tier} ${chalk.dim(model.ctx.padEnd(6))} ${chalk.dim(model.modelId)}`
        cursorLineByRow[idx] = lines.length
        lines.push(isCursor ? chalk.bgRgb(24, 44, 62)(row) : row)
      })

      lines.push('')
      lines.push(chalk.dim('  ↑↓ Navigate  •  Space Toggle model  •  A All/None  •  Enter Install  •  Esc Back'))
    } else if (state.installEndpointsPhase === 'result') {
      const result = state.installEndpointsResult
      const accent = result?.type === 'success' ? chalk.greenBright : chalk.redBright
      lines.push(`  ${chalk.bold('Result')}  ${accent(result?.title || 'Install result unavailable')}`)
      lines.push('')

      for (const detail of result?.lines || []) {
        lines.push(`  ${detail}`)
      }

      if (result?.type === 'success') {
        lines.push('')
        lines.push(chalk.dim('  Future FCM launches will refresh this catalog automatically when the provider list evolves.'))
      }

      lines.push('')
      lines.push(chalk.dim('  Enter or Esc Close'))
    }

    const targetLine = cursorLineByRow[state.installEndpointsCursor] ?? 0
    state.installEndpointsScrollOffset = keepOverlayTargetVisible(
      state.installEndpointsScrollOffset,
      targetLine,
      lines.length,
      state.terminalRows
    )
    const { visible, offset } = sliceOverlayLines(lines, state.installEndpointsScrollOffset, state.terminalRows)
    state.installEndpointsScrollOffset = offset

    const tintedLines = tintOverlayLines(visible, SETTINGS_OVERLAY_BG, state.terminalCols)
    const cleared = tintedLines.map((line) => line + EL)
    return cleared.join('\n')
  }

  // ─── Help overlay renderer ────────────────────────────────────────────────
  // 📖 renderHelp: Draw the help overlay listing all key bindings.
  // 📖 Toggled with K key. Gives users a quick reference without leaving the TUI.
  function renderHelp() {
    const EL = '\x1b[K'
    const lines = []

    // 📖 Branding header
    lines.push(`  ${chalk.cyanBright('🚀')} ${chalk.bold.cyanBright('free-coding-models')} ${chalk.dim(`v${LOCAL_VERSION}`)}`)
    lines.push(`  ${chalk.bold('❓ Help & Keyboard Shortcuts')}`)
    lines.push('')
    lines.push(`  ${chalk.dim('— ↑↓ / PgUp / PgDn / Home / End scroll • K or Esc close')}`)
    lines.push(`  ${chalk.bold('Columns')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Rank')}        SWE-bench rank (1 = best coding score)  ${chalk.dim('Sort:')} ${chalk.yellow('R')}`)
    lines.push(`              ${chalk.dim('Quick glance at which model is objectively the best coder right now.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Tier')}        S+ / S / A+ / A / A- / B+ / B / C based on SWE-bench score  ${chalk.dim('Cycle:')} ${chalk.yellow('T')}`)
    lines.push(`              ${chalk.dim('Skip the noise — S/S+ models solve real GitHub issues, C models are for light tasks.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('SWE%')}        SWE-bench score — coding ability benchmark (color-coded)  ${chalk.dim('Sort:')} ${chalk.yellow('S')}`)
    lines.push(`              ${chalk.dim('The raw number behind the tier. Higher = better at writing, fixing, and refactoring code.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('CTX')}         Context window size (128k, 200k, 256k, 1m, etc.)  ${chalk.dim('Sort:')} ${chalk.yellow('C')}`)
    lines.push(`              ${chalk.dim('Bigger context = the model can read more of your codebase at once without forgetting.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Model')}       Model name (⭐ = favorited, pinned at top)  ${chalk.dim('Sort:')} ${chalk.yellow('M')}  ${chalk.dim('Favorite:')} ${chalk.yellow('F')}`)
    lines.push(`              ${chalk.dim('Star the ones you like — they stay pinned at the top across restarts.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Provider')}    Provider source (NIM, Groq, Cerebras, etc.)  ${chalk.dim('Sort:')} ${chalk.yellow('O')}  ${chalk.dim('Cycle:')} ${chalk.yellow('D')}`)
    lines.push(`              ${chalk.dim('Same model on different providers can have very different speed and uptime.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Latest')}      Most recent ping response time (ms)  ${chalk.dim('Sort:')} ${chalk.yellow('L')}`)
    lines.push(`              ${chalk.dim('Shows how fast the server is responding right now — useful to catch live slowdowns.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Avg Ping')}    Average response time across all measurable pings (200 + 401) (ms)  ${chalk.dim('Sort:')} ${chalk.yellow('A')}`)
    lines.push(`              ${chalk.dim('The long-term truth. Even without a key, a 401 still gives real latency so the average stays useful.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Health')}      Live status: ✅ UP / 🔥 429 / ⏳ TIMEOUT / ❌ ERR / 🔑 NO KEY  ${chalk.dim('Sort:')} ${chalk.yellow('H')}`)
    lines.push(`              ${chalk.dim('Tells you instantly if a model is reachable or down — no guesswork needed.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Verdict')}     Overall assessment: Perfect / Normal / Spiky / Slow / Overloaded  ${chalk.dim('Sort:')} ${chalk.yellow('V')}`)
    lines.push(`              ${chalk.dim('One-word summary so you don\'t have to cross-check speed, health, and stability yourself.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Stability')}   Composite 0–100 score: p95 + jitter + spike rate + uptime  ${chalk.dim('Sort:')} ${chalk.yellow('B')}`)
    lines.push(`              ${chalk.dim('A fast model that randomly freezes is worse than a steady one. This catches that.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Up%')}         Uptime — ratio of successful pings to total pings  ${chalk.dim('Sort:')} ${chalk.yellow('U')}`)
    lines.push(`              ${chalk.dim('If a model only works half the time, you\'ll waste time retrying. Higher = more reliable.')}`)
    lines.push('')
    lines.push(`  ${chalk.cyan('Used')}        Historical prompt+completion tokens tracked for this exact provider/model pair`)
    lines.push(`              ${chalk.dim('Loaded from local stats snapshots. Displayed in K tokens, or M tokens above one million.')}`)
    lines.push('')


    lines.push('')
    lines.push(`  ${chalk.bold('Main TUI')}`)
    lines.push(`  ${chalk.bold('Navigation')}`)
    lines.push(`  ${chalk.yellow('↑↓')}           Navigate rows`)
    lines.push(`  ${chalk.yellow('Enter')}        Select model and launch`)
    lines.push('')
    lines.push(`  ${chalk.bold('Controls')}`)
    lines.push(`  ${chalk.yellow('W')}  Toggle ping mode  ${chalk.dim('(speed 2s → normal 10s → slow 30s → forced 4s)')}`)
    lines.push(`  ${chalk.yellow('E')}  Toggle configured models only  ${chalk.dim('(enabled by default)')}`)
    lines.push(`  ${chalk.yellow('Z')}  Cycle tool mode  ${chalk.dim('(OpenCode → Desktop → OpenClaw → Crush → Goose → Pi → Aider → Qwen → OpenHands → Amp)')}`)
    lines.push(`  ${chalk.yellow('F')}  Toggle favorite on selected row  ${chalk.dim('(⭐ pinned at top, persisted)')}`)
    lines.push(`  ${chalk.yellow('Y')}  Install endpoints  ${chalk.dim('(provider catalog → compatible tools, direct provider only)')}`)
    lines.push(`  ${chalk.yellow('Q')}  Smart Recommend  ${chalk.dim('(🎯 find the best model for your task — questionnaire + live analysis)')}`)
    lines.push(`  ${chalk.rgb(255, 87, 51).bold('I')}  Feedback, bugs & requests  ${chalk.dim('(📝 send anonymous feedback, bug reports, or feature requests)')}`)
    lines.push(`  ${chalk.yellow('P')}  Open settings  ${chalk.dim('(manage API keys, provider toggles, updates, legacy cleanup)')}`)
      // 📖 Profile system removed - API keys now persist permanently across all sessions
    lines.push(`  ${chalk.yellow('Shift+R')}  Reset view settings  ${chalk.dim('(tier filter, sort, provider filter → defaults)')}`)
    lines.push(`  ${chalk.yellow('N')}  Changelog  ${chalk.dim('(📋 browse all versions, Enter to view details)')}`)
    lines.push(`  ${chalk.yellow('K')} / ${chalk.yellow('Esc')}  Show/hide this help`)
    lines.push(`  ${chalk.yellow('Ctrl+C')}  Exit`)
    lines.push('')
    lines.push(`  ${chalk.bold('Settings (P)')}`)
    lines.push(`  ${chalk.yellow('↑↓')}           Navigate rows`)
    lines.push(`  ${chalk.yellow('PgUp/PgDn')}    Jump by page`)
    lines.push(`  ${chalk.yellow('Home/End')}     Jump first/last row`)
    lines.push(`  ${chalk.yellow('Enter')}        Edit key / run selected maintenance action`)
    lines.push(`  ${chalk.yellow('Space')}        Toggle provider enable/disable`)
    lines.push(`  ${chalk.yellow('T')}            Test selected provider key`)
    lines.push(`  ${chalk.yellow('U')}            Check updates manually`)
    lines.push(`  ${chalk.yellow('Esc')}          Close settings`)
    lines.push('')
    lines.push(...buildCliHelpLines({ chalk, indent: '  ', title: 'CLI Flags' }))
    lines.push('')
    // 📖 Help overlay can be longer than viewport, so keep a dedicated scroll offset.
    const { visible, offset } = sliceOverlayLines(lines, state.helpScrollOffset, state.terminalRows)
    state.helpScrollOffset = offset
    const tintedLines = tintOverlayLines(visible, HELP_OVERLAY_BG, state.terminalCols)
    const cleared = tintedLines.map(l => l + EL)
    return cleared.join('\n')
  }

  // 📖 renderRecommend: Draw the Smart Recommend overlay with 3 phases:
  //   1. 'questionnaire' — ask 3 questions (task type, priority, context budget)
  //   2. 'analyzing' — loading screen with progress bar (10s, 2 pings/sec)
  //   3. 'results' — show Top 3 recommendations with scores
  function renderRecommend() {
    const EL = '\x1b[K'
    const lines = []

    // 📖 Branding header
    lines.push('')
    lines.push(`  ${chalk.cyanBright('🚀')} ${chalk.bold.cyanBright('free-coding-models')} ${chalk.dim(`v${LOCAL_VERSION}`)}`)
    lines.push(`  ${chalk.bold('🎯 Smart Recommend')}`)
    lines.push('')
    lines.push(chalk.dim('  — find the best model for your task'))
    lines.push('')

    if (state.recommendPhase === 'questionnaire') {
      // 📖 Question definitions — each has a title, options array, and answer key
      const questions = [
        {
          title: 'What are you working on?',
          options: Object.entries(TASK_TYPES).map(([key, val]) => ({ key, label: val.label })),
          answerKey: 'taskType',
        },
        {
          title: 'What matters most?',
          options: Object.entries(PRIORITY_TYPES).map(([key, val]) => ({ key, label: val.label })),
          answerKey: 'priority',
        },
        {
          title: 'How big is your context?',
          options: Object.entries(CONTEXT_BUDGETS).map(([key, val]) => ({ key, label: val.label })),
          answerKey: 'contextBudget',
        },
      ]

      const q = questions[state.recommendQuestion]
      const qNum = state.recommendQuestion + 1
      const qTotal = questions.length

      // 📖 Progress breadcrumbs showing answered questions
      let breadcrumbs = ''
      for (let i = 0; i < questions.length; i++) {
        const answered = state.recommendAnswers[questions[i].answerKey]
        if (i < state.recommendQuestion && answered) {
          const answeredLabel = questions[i].options.find(o => o.key === answered)?.label || answered
          breadcrumbs += chalk.greenBright(`  ✓ ${questions[i].title} ${chalk.bold(answeredLabel)}`) + '\n'
        }
      }
      if (breadcrumbs) {
        lines.push(breadcrumbs.trimEnd())
        lines.push('')
      }

      lines.push(`  ${chalk.bold(`Question ${qNum}/${qTotal}:`)} ${chalk.cyan(q.title)}`)
      lines.push('')

      for (let i = 0; i < q.options.length; i++) {
        const opt = q.options[i]
        const isCursor = i === state.recommendCursor
        const bullet = isCursor ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
        const label = isCursor ? chalk.bold.white(opt.label) : chalk.white(opt.label)
        lines.push(`${bullet}${label}`)
      }

      lines.push('')
      lines.push(chalk.dim('  ↑↓ navigate  •  Enter select  •  Esc cancel'))

    } else if (state.recommendPhase === 'analyzing') {
      // 📖 Loading screen with progress bar
      const pct = Math.min(100, Math.round(state.recommendProgress))
      const barWidth = 40
      const filled = Math.round(barWidth * pct / 100)
      const empty = barWidth - filled
      const bar = chalk.greenBright('█'.repeat(filled)) + chalk.dim('░'.repeat(empty))

      lines.push(`  ${chalk.bold('Analyzing models...')}`)
      lines.push('')
      lines.push(`  ${bar}  ${chalk.bold(String(pct) + '%')}`)
      lines.push('')

      // 📖 Show what we're doing
      const taskLabel = TASK_TYPES[state.recommendAnswers.taskType]?.label || '—'
      const prioLabel = PRIORITY_TYPES[state.recommendAnswers.priority]?.label || '—'
      const ctxLabel = CONTEXT_BUDGETS[state.recommendAnswers.contextBudget]?.label || '—'
      lines.push(chalk.dim(`  Task: ${taskLabel}  •  Priority: ${prioLabel}  •  Context: ${ctxLabel}`))
      lines.push('')

      // 📖 Spinning indicator
      const spinIdx = state.frame % FRAMES.length
      lines.push(`  ${chalk.yellow(FRAMES[spinIdx])} Pinging models at 2 pings/sec to gather fresh latency data...`)
      lines.push('')
      lines.push(chalk.dim('  Esc to cancel'))

    } else if (state.recommendPhase === 'results') {
      // 📖 Show Top 3 results with detailed info
      const taskLabel = TASK_TYPES[state.recommendAnswers.taskType]?.label || '—'
      const prioLabel = PRIORITY_TYPES[state.recommendAnswers.priority]?.label || '—'
      const ctxLabel = CONTEXT_BUDGETS[state.recommendAnswers.contextBudget]?.label || '—'
      lines.push(chalk.dim(`  Task: ${taskLabel}  •  Priority: ${prioLabel}  •  Context: ${ctxLabel}`))
      lines.push('')

      if (state.recommendResults.length === 0) {
        lines.push(`  ${chalk.yellow('No models could be scored. Try different criteria or wait for more pings.')}`)
      } else {
        lines.push(`  ${chalk.bold('Top Recommendations:')}`)
        lines.push('')

        for (let i = 0; i < state.recommendResults.length; i++) {
          const rec = state.recommendResults[i]
          const r = rec.result
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
          const providerName = sources[r.providerKey]?.name ?? r.providerKey
          const tierFn = TIER_COLOR[r.tier] ?? (t => chalk.white(t))
          const avg = getAvg(r)
          const avgStr = avg === Infinity ? '—' : Math.round(avg) + 'ms'
          const sweStr = r.sweScore ?? '—'
          const ctxStr = r.ctx ?? '—'
          const stability = getStabilityScore(r)
          const stabStr = stability === -1 ? '—' : String(stability)

          const isCursor = i === state.recommendCursor
          const highlight = isCursor ? chalk.bgRgb(20, 50, 25) : (s => s)

          lines.push(highlight(`  ${medal} ${chalk.bold('#' + (i + 1))}  ${chalk.bold.white(r.label)}  ${chalk.dim('(' + providerName + ')')}`))
          lines.push(highlight(`       Score: ${chalk.bold.greenBright(String(rec.score) + '/100')}  │  Tier: ${tierFn(r.tier)}  │  SWE: ${chalk.cyan(sweStr)}  │  Avg: ${chalk.yellow(avgStr)}  │  CTX: ${chalk.cyan(ctxStr)}  │  Stability: ${chalk.cyan(stabStr)}`))
          lines.push('')
        }
      }

      lines.push('')
      lines.push(`  ${chalk.dim('These models are now')} ${chalk.greenBright('highlighted')} ${chalk.dim('and')} 🎯 ${chalk.dim('pinned in the main table.')}`)
      lines.push('')
      lines.push(chalk.dim('  ↑↓ navigate  •  Enter select & close  •  Esc close  •  Q new search'))
    }

    lines.push('')
    const { visible, offset } = sliceOverlayLines(lines, state.recommendScrollOffset, state.terminalRows)
    state.recommendScrollOffset = offset
    const tintedLines = tintOverlayLines(visible, RECOMMEND_OVERLAY_BG, state.terminalCols)
    const cleared2 = tintedLines.map(l => l + EL)
    return cleared2.join('\n')
  }

  // ─── Smart Recommend: analysis phase controller ────────────────────────────
  // 📖 startRecommendAnalysis: begins the 10-second analysis phase.
  // 📖 Pings a random subset of visible models at 2 pings/sec while advancing progress.
  // 📖 After 10 seconds, computes recommendations and transitions to results phase.
  function startRecommendAnalysis() {
    state.recommendPhase = 'analyzing'
    state.recommendProgress = 0
    state.recommendResults = []

    const pingModel = getPingModel?.()
    if (!pingModel) return

    const startTime = Date.now()
    const ANALYSIS_DURATION = 10_000 // 📖 10 seconds
    const PING_RATE = 500            // 📖 2 pings per second (every 500ms)

    // 📖 Progress updater — runs every 200ms to update the progress bar
    state.recommendAnalysisTimer = setInterval(() => {
      const elapsed = Date.now() - startTime
      state.recommendProgress = Math.min(100, (elapsed / ANALYSIS_DURATION) * 100)

      if (elapsed >= ANALYSIS_DURATION) {
        // 📖 Analysis complete — compute recommendations
        clearInterval(state.recommendAnalysisTimer)
        clearInterval(state.recommendPingTimer)
        state.recommendAnalysisTimer = null
        state.recommendPingTimer = null

        const recs = getTopRecommendations(
          state.results,
          state.recommendAnswers.taskType,
          state.recommendAnswers.priority,
          state.recommendAnswers.contextBudget,
          3
        )
        state.recommendResults = recs
        state.recommendPhase = 'results'
        state.recommendCursor = 0

        // 📖 Mark recommended models so the main table can highlight them
        state.recommendedKeys = new Set(recs.map(rec => toFavoriteKey(rec.result.providerKey, rec.result.modelId)))
        // 📖 Tag each result object so sortResultsWithPinnedFavorites can pin them
        state.results.forEach(r => {
          const key = toFavoriteKey(r.providerKey, r.modelId)
          const rec = recs.find(rec => toFavoriteKey(rec.result.providerKey, rec.result.modelId) === key)
          r.isRecommended = !!rec
          r.recommendScore = rec ? rec.score : 0
        })
      }
    }, 200)

    // 📖 Targeted pinging — ping random visible models at 2/sec for fresh data
    state.recommendPingTimer = setInterval(() => {
      const visible = state.results.filter(r => !r.hidden && r.status !== 'noauth')
      if (visible.length === 0) return
      // 📖 Pick a random model to ping — spreads load across all models over 10s
      const target = visible[Math.floor(Math.random() * visible.length)]
      pingModel(target).catch(() => {})
    }, PING_RATE)
  }

  // ─── Feedback overlay renderer ────────────────────────────────────────────
  // 📖 renderFeedback: Draw the overlay for anonymous Discord feedback.
  // 📖 Shows an input field where users can type feedback, bug reports, or any comments.
  function renderFeedback() {
    const EL = '\x1b[K'
    const lines = []

    // 📖 Calculate available space for multi-line input (dynamic based on terminal width)
    const maxInputWidth = state.terminalCols - 8 // 8 = padding (4 spaces each side)
    const maxInputLines = 10 // Show up to 10 lines of input
    
    // 📖 Split buffer into lines for display (with wrapping)
    const wrapText = (text, width) => {
      const words = text.split(' ')
      const lines = []
      let currentLine = ''
      
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word
        if (testLine.length <= width) {
          currentLine = testLine
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = word
        }
      }
      if (currentLine) lines.push(currentLine)
      return lines
    }

    const inputLines = wrapText(state.bugReportBuffer, maxInputWidth)
    const displayLines = inputLines.slice(0, maxInputLines)

    // 📖 Branding header
    lines.push('')
    lines.push(`  ${chalk.cyanBright('🚀')} ${chalk.bold.cyanBright('free-coding-models')} ${chalk.dim(`v${LOCAL_VERSION}`)}`)
    lines.push(`  ${chalk.bold.rgb(57, 255, 20)('📝 Feedback, bugs & requests')}`)
    lines.push('')
    lines.push(chalk.dim("  — don't hesitate to send us feedback, bug reports, or just your feeling about the app"))
    lines.push('')
    
    // 📖 Status messages (if any)
    if (state.bugReportStatus === 'sending') {
      lines.push(`  ${chalk.yellow('⏳ Sending...')}`)
      lines.push('')
    } else if (state.bugReportStatus === 'success') {
      lines.push(`  ${chalk.greenBright.bold('✅ Successfully sent!')} ${chalk.dim('Closing overlay in 3 seconds...')}`)
      lines.push('')
      lines.push(`  ${chalk.dim('Thank you for your feedback! It has been sent to the project team.')}`)
      lines.push('')
    } else if (state.bugReportStatus === 'error') {
      lines.push(`  ${chalk.red('❌ Error:')} ${chalk.yellow(state.bugReportError || 'Failed to send')}`)
      lines.push(`  ${chalk.dim('Press Backspace to edit, or Esc to close')}`)
      lines.push('')
    } else {
      lines.push(`  ${chalk.dim('Type your feedback below. Press Enter to send, Esc to cancel.')}`)
      lines.push(`  ${chalk.dim('Your message will be sent anonymously to the project team.')}`)
      lines.push('')
    }

    // 📖 Simple input area – left-aligned, framed by horizontal lines
    lines.push(`  ${chalk.cyan('Message')} (${state.bugReportBuffer.length}/500 chars)`)
    lines.push(`  ${chalk.dim('─'.repeat(maxInputWidth))}`)
    // 📖 Input lines — left-aligned, or placeholder when empty
    if (displayLines.length > 0) {
      for (const line of displayLines) {
        lines.push(`    ${line}`)
      }
      // 📖 Show cursor on last line
      if (state.bugReportStatus === 'idle' || state.bugReportStatus === 'error') {
        lines[lines.length - 1] += chalk.cyanBright('▏')
      }
    } else {
      const placeholderBR = state.bugReportStatus === 'idle' ? chalk.white.italic('Type your message here...') : ''
      lines.push(`    ${placeholderBR}${chalk.cyanBright('▏')}`)
    }
    lines.push(`  ${chalk.dim('─'.repeat(maxInputWidth))}`)
    lines.push('')
    lines.push(chalk.dim('  Enter Send  •  Esc Cancel  •  Backspace Delete'))

    // 📖 Apply overlay tint and return
    const BUG_REPORT_OVERLAY_BG = chalk.bgRgb(0, 0, 0) // Dark red-ish background (RGB: 46, 20, 20)
    const tintedLines = tintOverlayLines(lines, BUG_REPORT_OVERLAY_BG, state.terminalCols)
    const cleared = tintedLines.map(l => l + EL)
    return cleared.join('\n')
  }

  // ─── Changelog overlay renderer ───────────────────────────────────────────
  // 📖 renderChangelog: Two-phase overlay — index of all versions or details of one version
  function renderChangelog() {
    const EL = '\x1b[K'
    const lines = []
    const changelogData = loadChangelog()
    const { versions } = changelogData
    const versionList = Object.keys(versions).sort((a, b) => {
      const aParts = a.split('.').map(Number)
      const bParts = b.split('.').map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0
        const bVal = bParts[i] || 0
        if (bVal !== aVal) return bVal - aVal
      }
      return 0
    })

    // 📖 Branding header
    lines.push(`  ${chalk.cyanBright('🚀')} ${chalk.bold.cyanBright('free-coding-models')} ${chalk.dim(`v${LOCAL_VERSION}`)}`)

    if (state.changelogPhase === 'index') {
      // ═══════════════════════════════════════════════════════════════════════
      // 📖 INDEX PHASE: Show all versions with selection
      // ═══════════════════════════════════════════════════════════════════════
      lines.push(`  ${chalk.bold('📋 Changelog - All Versions')}`)
      lines.push(`  ${chalk.dim('— ↑↓ navigate • Enter select • Esc close')}`)
      lines.push('')

      for (let i = 0; i < versionList.length; i++) {
        const version = versionList[i]
        const changes = versions[version]
        const isSelected = i === state.changelogCursor

        // 📖 Count items in this version
        let itemCount = 0
        for (const key of ['added', 'fixed', 'changed', 'updated']) {
          if (changes[key]) itemCount += changes[key].length
        }

        // 📖 Build a short summary from the first few items (max ~15 words, stripped of markdown)
        const allItems = []
        for (const k of ['added', 'fixed', 'changed', 'updated']) {
          if (changes[k]) for (const item of changes[k]) allItems.push(item)
        }
        let summary = ''
        if (allItems.length > 0) {
          // 📖 Extract the bold title part if present, otherwise use the raw text
          const firstItem = allItems[0]
          const boldMatch = firstItem.match(/\*\*([^*]+)\*\*/)
          const rawText = boldMatch ? boldMatch[1] : firstItem.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
          // 📖 Truncate to ~15 words max
          const words = rawText.split(/\s+/).slice(0, 15)
          summary = words.join(' ')
          if (rawText.split(/\s+/).length > 15) summary += '…'
        }

        // 📖 Format version line with selection highlight + dim summary
        const countStr = `${itemCount} ${itemCount === 1 ? 'change' : 'changes'}`
        const prefix = `  v${version.padEnd(8)} — ${countStr}`
        if (isSelected) {
          const full = summary ? `${prefix} · ${summary}` : prefix
          lines.push(chalk.inverse(full))
        } else {
          const dimSummary = summary ? chalk.dim(` · ${summary}`) : ''
          lines.push(`${prefix}${dimSummary}`)
        }
      }

      lines.push('')
      lines.push(`  ${chalk.dim(`Total: ${versionList.length} versions`)}`)

    } else if (state.changelogPhase === 'details') {
      // ═══════════════════════════════════════════════════════════════════════
      // 📖 DETAILS PHASE: Show detailed changes for selected version
      // ═══════════════════════════════════════════════════════════════════════
      lines.push(`  ${chalk.bold(`📋 v${state.changelogSelectedVersion}`)}`)
      lines.push(`  ${chalk.dim('— ↑↓ / PgUp / PgDn scroll • B back • Esc close')}`)
      lines.push('')

      const changes = versions[state.changelogSelectedVersion]
      if (changes) {
        const sections = { added: '✨ Added', fixed: '🐛 Fixed', changed: '🔄 Changed', updated: '📝 Updated' }
        for (const [key, label] of Object.entries(sections)) {
          if (changes[key] && changes[key].length > 0) {
            lines.push(`  ${chalk.yellow(label)}`)
            for (const item of changes[key]) {
              // 📖 Unwrap markdown bold/code markers for display
              let displayText = item.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')
              // 📖 Wrap long lines
              const maxWidth = state.terminalCols - 16
              if (displayText.length > maxWidth) {
                displayText = displayText.substring(0, maxWidth - 3) + '…'
              }
              lines.push(`    • ${displayText}`)
            }
            lines.push('')
          }
        }
      }
    }

    // 📖 Keep selected changelog row visible by scrolling the overlay viewport (index phase)
    if (state.changelogPhase === 'index') {
      const targetLine = 4 + state.changelogCursor  // 📖 3 header lines + 1 blank = versions start at line 4
      state.changelogScrollOffset = keepOverlayTargetVisible(
        state.changelogScrollOffset,
        targetLine,
        lines.length,
        state.terminalRows
      )
    }

    // 📖 Use scrolling with overlay handler
    const CHANGELOG_OVERLAY_BG = chalk.bgRgb(10, 40, 80)  // Dark blue background
    const { visible, offset } = sliceOverlayLines(lines, state.changelogScrollOffset, state.terminalRows)
    state.changelogScrollOffset = offset
    const tintedLines = tintOverlayLines(visible, CHANGELOG_OVERLAY_BG, state.terminalCols)
    const cleared = tintedLines.map(l => l + EL)
    return cleared.join('\n')
  }

  // 📖 stopRecommendAnalysis: cleanup timers if user cancels during analysis
  function stopRecommendAnalysis() {
    if (state.recommendAnalysisTimer) { clearInterval(state.recommendAnalysisTimer); state.recommendAnalysisTimer = null }
    if (state.recommendPingTimer) { clearInterval(state.recommendPingTimer); state.recommendPingTimer = null }
  }

  return {
    renderSettings,
    renderInstallEndpoints,
    renderHelp,
    renderRecommend,
    renderFeedback,
    renderChangelog,
    startRecommendAnalysis,
    stopRecommendAnalysis,
  }
}
