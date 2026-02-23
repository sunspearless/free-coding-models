# Changelog

---

## 0.1.52

### Added
- New reusable `Button` component with variants and accessible styling.
- Light/Dark theme switcher (`ThemeToggle`) with persistent preference (localStorage) and Tailwind `darkMode` support.
- Updated UI to use consistent button design and added theme toggle in header.
- Extended Tailwind config with `darkMode: 'class'` and dark palette variables.

## 0.1.51

### Fixed
- **Groq/Cerebras models selected for OpenCode had no provider block**: even with the correct `groq/model-id` prefix, OpenCode couldn't use the model because no `provider.groq` block existed in `opencode.json` — now automatically creates the provider block (Groq: built-in with `apiKey: {env:GROQ_API_KEY}`; Cerebras: `@ai-sdk/openai-compatible` with baseURL) and registers the model in `provider.<key>.models`

## 0.1.50

### Fixed
- **Groq/Cerebras models selected for OpenCode were launched as NVIDIA models**: `providerKey` was not passed in `userSelected` on Enter, causing all models to be prefixed with `nvidia/` regardless of their actual provider — now correctly uses `groq/model-id` and `cerebras/model-id`
- **`startOpenCode` and `startOpenCodeDesktop`**: both functions now handle all 3 providers; Groq and Cerebras use OpenCode's built-in provider support (no custom config block needed, just `GROQ_API_KEY`/`CEREBRAS_API_KEY` env vars); NVIDIA retains its existing custom provider config flow

---

## 0.1.49

### Fixed
- **Cerebras / Groq without API key**: models were being pinged with the fallback NVIDIA key, causing misleading `❌ 401` — now pings without auth header; 401 is treated as `🔑 NO KEY` (server reachable, latency shown dimly)
- **Settings: entering an API key had no immediate effect**: after saving a key and closing Settings (Escape), models previously in `noauth` state are now immediately re-pinged with the new key

### Changed
- Ping without API key is now always attempted — a 401 response confirms the server is UP and shows real latency; `🔑 NO KEY` replaces the old `❌ 401` misleading error

---

## 0.1.48

### Fixed
- **`--tier` CLI flag**: `parseArgs()` was never called in `main()`, so `--tier S` was silently ignored — now wired in and applied on TUI startup (thanks @whit3rabbit, PR #11)
- **`--tier` value leaking into `apiKey`**: `parseArgs()` for-loop was capturing the tier value as the API key — fixed by skipping the value arg after `--tier`
- **Ctrl+C not exiting**: sort key handler was intercepting all single-letter keypresses including ctrl-modified ones — added `!key.ctrl` guard so Ctrl+C reaches the exit handler (PR #11)

### Added
- Test verifying `--tier` value does not leak into `apiKey` (63 tests total)

---

## 0.1.47

### Fixed
- **`--tier` CLI flag**: `parseArgs()` was never called in `main()`, so `--tier S` was silently ignored — now wired in and applied on TUI startup (thanks @whit3rabbit, PR #11)
- **`--tier` value leaking into `apiKey`**: `parseArgs()` for-loop was capturing the tier value as the API key — fixed by skipping the value arg after `--tier`
- **Ctrl+C not exiting**: sort key handler was intercepting all single-letter keypresses including ctrl-modified ones — added `!key.ctrl` guard so Ctrl+C reaches the exit handler (PR #11)

### Added
- Test verifying `--tier` value does not leak into `apiKey` (63 tests total)

---

## 0.1.46

### Fixed
- **Discord notification**: Fixed ECONNRESET error — drain response body with `res.resume()` and call `process.exit(0)` immediately after success so the Node process closes cleanly

### Changed
- **Discord link**: Updated invite URL to `https://discord.gg/5MbTnDC3Md` everywhere (README, TUI footer)

---

## 0.1.45

### Fixed
- **Discord notification**: Fixed GitHub Actions workflow crash (secrets context not allowed in step `if` conditions — now handled in the Node script directly)

---

## 0.1.44

### Added
- **Multi-provider support** — Groq (6 models) and Cerebras (3 models) added alongside NVIDIA NIM, for 53 total models
- **Multi-provider first-run wizard** — Steps through all 3 providers (NIM, Groq, Cerebras) on first launch; each is optional, Enter to skip; requires at least one key
- **Settings screen (`P` key)** — New TUI overlay to manage API keys per provider, toggle providers on/off, and test keys with a live ping
- **`lib/config.js`** — New JSON config system (`~/.free-coding-models.json`) replacing the old plain-text file
  - Auto-migrates old `~/.free-coding-models` (plain nvidia key) on first run
  - Stores keys per provider + per-provider enabled/disabled state
  - `NVIDIA_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY` env vars override config
- **Per-provider ping URLs** — `ping()` now accepts explicit endpoint URL; each provider has its own API endpoint in `sources.js`
- **Provider name in Origin column** — Shows `NIM` / `Groq` / `Cerebras` instead of always `NIM`

### Changed
- `MODELS` flat array now includes `providerKey` as 6th element
- State init filters models from disabled providers; rebuilds on settings close
- Config file path changed from `~/.free-coding-models` to `~/.free-coding-models.json` (migration is automatic)

---

## 0.1.41 — 2026-02-22

### Changed
- **sources.js data audit** — verified and corrected SWE-bench scores, tiers, and context windows across all NIM models:
  - Devstral 2 123B: `S, 62.0%, 128k` → `S+, 72.2%, 256k` (official Mistral announcement)
  - Mistral Large 675B: ctx `128k` → `256k`
  - QwQ 32B: ctx `32k` → `131k`
  - Llama 4 Maverick: ctx `128k` → `1M` (NVIDIA NIM confirmed)
  - Llama 4 Scout: ctx `128k` → `10M` (NVIDIA NIM confirmed)
  - GPT OSS 20B: ctx `32k` → `128k`

---

## 0.1.38 — 2026-02-22

### Fixed
- **Cross-platform OpenCode integration**: Fixed OpenCode CLI and Desktop installation issues on Windows and Linux
  - **Windows**: Fixed config path to use %APPDATA%\opencode\opencode.json with fallback to ~/.config
  - **Linux**: Added support for snap, flatpak, and xdg-open to launch OpenCode Desktop
  - **All platforms**: Properly detects OS and uses correct commands and paths
  - **OpenCode Desktop**: Platform-specific launch commands (macOS: `open -a`, Windows: `start`, Linux: multiple methods)

---

## 0.1.37 — 2026-02-22

### Added
- **Auto-update with sudo fallback**: When npm update fails due to permissions, automatically retries with sudo to complete the update

---

## 0.1.36 — 2026-02-22

### Added
- **SWE-bench Verified column**: Shows real SWE-bench Verified scores for all 44 models from official benchmarks
- **Color-coded keyboard shortcuts**: First letter of each column header colored in yellow to indicate sorting key
- **Heart and Coffee in footer**: "Made with 💖 & ☕ by vava-nessa"

### Changed
- **Column organization**: Reordered columns for better logical flow: Rank / Tier / SWE% / Model / Origin / Latest Ping / Avg Ping / Health / Verdict / Up%
- **Health column**: Renamed from "Status" to "Health" with H key for sorting
- **SWE-bench sorting**: S key now sorts by SWE-bench score
- **Latest ping shortcut**: L key (instead of P) for sorting by latest ping
- **Source name**: Simplified "NVIDIA NIM" to "NIM"

### Fixed
- **Column header alignment**: Fixed misalignment caused by ANSI color codes in headers
- **Discord link**: Updated to permanent invite link https://discord.gg/WKA3TwYVuZ

---

## 0.1.35 — 2026-02-22

### Changed
- **Column reorganization**: Reordered columns for better logical flow: Rank / Tier / SWE% / Model / Origin / Latest Ping / Avg Ping / Health / Verdict / Up%

---

## 0.1.34 — 2026-02-22

### Changed
- **Condition renamed to Health**: Renamed "Condition" column to "Health" for better clarity
- **Keyboard shortcut update**: H key now sorts by Health (instead of C for Condition)

---

## 0.1.33 — 2026-02-22

### Fixed
- **Column header alignment**: Fixed column headers misalignment issue caused by ANSI color codes interfering with text padding

---

## 0.1.32 — 2026-02-22

### Changed
- **Column header improvements**: Fixed column alignment issues for better visual appearance
- **Status renamed to Condition**: "Status" column renamed to "Condition" for clarity
- **Keyboard shortcut updates**: S key now sorts by SWE-bench score, C key sorts by Condition
- **Footer Discord text update**: Changed "Join our Discord!" to "Join Free-Coding-Models Discord!"

---

## 0.1.31 — 2026-02-22

### Added
- **SWE-bench column**: Added new SWE-bench Verified score column showing coding performance for each model
- **Color-coded column headers**: First letter of each column header is now colored (yellow) to indicate keyboard shortcut for sorting
- **Keyboard shortcut improvements**: Changed P to L for latest ping sorting, added E for SWE-bench sorting

### Changed
- **Source name simplification**: Renamed "NVIDIA NIM" to "NIM" throughout the codebase
- **Enhanced footer Discord link**: Discord link now displays in bright cyan color with "(link fixed)" indicator

---

## 0.1.29 — 2026-02-22

### Fixed
- **Discord link correction**: Updated all Discord invite URLs to use permanent link https://discord.gg/WKA3TwYVuZ

---

## 0.1.28 — 2026-02-22

### Added
- **Footer emojis**: Added 💬 emoji before Discord link and ⭐ emoji before GitHub link for better visual appeal

---

## 0.1.27 — 2026-02-22

### Changed
- **Footer redesign**: All links now on one line with clickable text: "Join our Discord!" and "Read the docs on GitHub"
- **Improved UX**: Links use same clickable format as author name for consistent user experience

---

## 0.1.26 — 2026-02-22

### Changed
- **Footer improvements**: Replaced "Repository GitHub" with "GitHub", "love" with 💖 emoji, and simplified Discord text
- **README enhancement**: Added GitHub link section below Discord invite

---

## 0.1.25 — 2026-02-22

### Added
- **Discord community link**: Added Discord invite to README and TUI footer
- **Enhanced footer layout**: Improved footer with multi-line layout showing GitHub repo and Discord links
- **Clickable author name**: "vava-nessa" is now clickable in terminal (opens GitHub profile)
- **Release notes automation**: GitHub Actions now uses CHANGELOG.md content for release notes instead of auto-generated notes

### Changed
- **Tier filtering system**: Replaced E/D keys with T key that cycles through tier filters: all → S+/S → A+/A/A- → B+/B → C → all
- **Footer text**: "Made with love by vava-nessa" with clickable links

### Fixed
- **Release workflow**: GitHub Releases now display proper changelog content instead of generic commit summaries

---

## 0.1.24 — 2026-02-22

### Fixed
- **Viewport scrolling for TUI overflow**: Fixed Ghostty and narrow terminal issues where content would scroll past alternate screen
- **Terminal wrapping**: Wide rows now clip at terminal edge instead of wrapping to next line
- **Scrollback pollution**: Replaced `\x1b[2J` with `\x1b[H` + per-line `\x1b[K` to avoid Ghostty scrollback issues
- **Viewport calculation**: Added smart scrolling with "N more above/below" indicators when models exceed screen height
- **Scroll offset adjustment**: Cursor stays within visible window during navigation and terminal resize

### Changed
- **DECAWM off**: Disabled auto-wrap in alternate screen to prevent row height doubling
- **Terminal resize handling**: Viewport automatically adjusts when terminal size changes

---

## 0.1.23 — 2026-02-22

### Refactored
- **Removed startup menu**: No more blocking mode selection menu at startup
- **Default to OpenCode CLI**: App starts directly in CLI mode when no flags given
- **Mode toggle in TUI**: Added Z key to cycle between CLI → Desktop → OpenClaw → CLI
- **GitHub changelogs**: "Read Changelogs" option now opens GitHub URL instead of local file
- **Auto-update by default**: When new version available without flags, auto-updates and relaunches
- **Centered update menu**: Update notification appears only when needed, with clean centered layout

### Changed
- **Header display**: Shows `[💻 CLI] (Z to toggle)` with mode toggle hint
- **Footer instructions**: Added "M Mode" to key bindings
- **Update workflow**: Flags (`--opencode` etc.) still show update menu for compatibility

---

## 0.1.22 — 2026-02-22

### Changed
- **Local changelogs**: "Read Changelogs" menu option now opens local `CHANGELOG.md` file instead of GitHub releases

---

## 0.1.21 — 2026-02-22

### Refactored
- **Simplified tier filtering architecture**: Replaced complex object recreation with simple `hidden` flag system
- **Flags as shortcuts**: `--tier S` now just sets initial state instead of blocking dynamic filtering
- **Dynamic filtering preserved**: E/D keys work seamlessly even when starting with `--tier` flag

### Fixed
- **Ping loop bug**: Fixed issue where filtered models weren't pinged due to using wrong results array
- **Initial ping bug**: Fixed issue where initial ping used wrong results array

---

## 0.1.20 — 2026-02-22

### Added
- **Dynamic tier filtering**: Use E/D keys to filter models by tier during runtime
- Tier filter badge shown in header (e.g., `[Tier S]`)
- E key elevates filter (show fewer, higher-tier models)
- D key descends filter (show more, lower-tier models)
- Preserves ping history when changing filters

### Fixed
- **Error 401 with --tier flag**: Fixed issue where using `--tier` alone would show selection menu instead of proceeding directly to TUI
- Improved flag combination handling for better user experience

---

## 0.1.16

### Added
- OpenCode Desktop support: new `--opencode-desktop` flag and menu option to set model & open the Desktop app
- "Read Changelogs" menu option when an update is available (opens GitHub releases page)
- `startOpenCodeDesktop()` function — same config logic as CLI, launches via `open -a OpenCode`

### Changed
- Startup menu: "OpenCode" renamed to "OpenCode CLI", new "OpenCode Desktop" entry added
- TUI mode badge: shows `[💻 CLI]` or `[🖥 Desktop]` or `[🦞 OpenClaw]`
- Footer action hint adapts to desktop mode (`Enter→OpenDesktop`)

---

## 0.1.12 — 2026-02-22

### Added
- Unit test suite: 59 tests across 11 suites using `node:test` (zero dependencies)
- Tests cover: sources data integrity, core logic (getAvg, getVerdict, getUptime, filterByTier, sortResults, findBestModel), CLI arg parsing, package.json sanity
- `lib/utils.js`: extracted pure logic functions from the monolithic CLI for testability
- `pnpm test` script in package.json

### Fixed
- GitHub Actions release workflow: removed broken `npm version patch` loop, added version detection via git tags
- GitHub Actions now creates a GitHub Release with auto-generated notes for each new version

### Changed
- AGENTS.md updated with test-first workflow: agents must run `pnpm test` before `pnpm start`

---

## 0.1.9 — 2026-02-22

### Fixed
- **OpenCode spawn ENOENT**: Use `shell: true` when spawning `opencode` so the command resolves correctly on Windows (`.cmd`/`.bat` wrappers). Added friendly error message when `opencode` is not installed.
### Added
- Update available warning: red message shown above selection menu when a new npm version exists
- "Update now" menu choice in startup mode selection to install the latest version

---

## 0.1.4 — 2026-02-22

### Fixed
- **OpenClaw config structure**: `providers` was incorrectly written at the config root. Moved to `models.providers` per official OpenClaw docs (`docs.openclaw.ai/providers/nvidia`).
- **OpenClaw API key storage**: Removed `apiKey` from provider block (not a recognized field). API key is now stored under `env.NVIDIA_API_KEY` in the config.
- **OpenClaw models array**: Removed the `models: []` array from the provider block (OpenCode format, not valid in OpenClaw).
- **`openclaw restart` CLI command doesn't exist**: Replaced hint with correct commands — `openclaw models set` / `openclaw configure`. Gateway auto-reloads on config file changes.
- **OpenClaw model not allowed**: Model must be explicitly listed in `agents.defaults.models` allowlist — without this, OpenClaw rejects the model with "not allowed" even when set as primary.
- **README**: Updated OpenClaw integration section with correct JSON structure and correct CLI commands.

---

## 0.1.3 — 2026-02-22

### Added
- OpenClaw integration: set selected NIM model as default provider in `~/.openclaw/openclaw.json`
- Startup mode menu (no flags needed): interactive choice between OpenCode and OpenClaw at launch
- `--openclaw` flag: skip menu, go straight to OpenClaw mode
- `--tier` flag: filter models by tier letter (S, A, B, C)
- Tier badges shown next to model names in the TUI
- 44 models listed, ranked by Aider Polyglot benchmark

### Fixed
- CI permissions for git push in release workflow

---

## 0.1.2 — 2026-02-22

### Added
- `--fiable` flag: analyze 10 seconds, output the single most reliable model as `provider/model_id`
- `--best` flag: show only top-tier models (A+, S, S+)
- `--opencode` flag: explicit OpenCode mode
- Refactored CLI entry point, cleaner flag handling
- Updated release workflow

---

## 0.1.1 — 2026-02-21

### Added
- Continuous monitoring mode: re-pings all models every 2 seconds forever
- Rolling averages calculated from all successful pings since start
- Uptime percentage tracking per model
- Dynamic ping interval: W key to speed up, X key to slow down
- Sortable columns: R/T/O/M/P/A/S/V/U keys
- Verdict column with quality rating per model
- Interactive model selection with arrow keys + Enter
- OpenCode integration: auto-detects NIM setup, sets model as default, launches OpenCode
- `sources.js`: extensible architecture for adding new providers
- Demo GIF added to README
- Renamed CLI to `free-coding-models`

---

## 0.1.0 — 2026-02-21

### Added
- Initial release as `nimping` then renamed to `free-coding-models`
- Parallel pings of NVIDIA NIM coding models via native `fetch`
- Real-time terminal table with latency display
- Alternate screen buffer (no scrollback pollution)
- Top 3 fastest models highlighted with medals 🥇🥈🥉
- ASCII banner and clean UI
- OpenCode installer and interactive model selector
- npm publish workflow via GitHub Actions
