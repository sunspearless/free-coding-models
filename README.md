# free-coding-models

`free-coding-models` is a terminal UI to compare free coding models across providers, monitor live health/latency, and launch supported coding tools with the selected model.

It is built around direct provider integrations. The old global proxy bridge has been removed from the product and is being rewritten from scratch, so only the stable direct-launch workflow is exposed for now.

## Install

```bash
pnpm install
pnpm start
```

To install globally:

```bash
npm install -g free-coding-models
free-coding-models
```

## What It Does

- Lists free coding models from the providers defined in [`sources.js`](./sources.js)
- Pings models continuously and shows latency, uptime, stability, verdict, and usage snapshots
- Lets you filter, sort, favorite, and compare models inside a full-screen TUI
- Launches supported coding tools with the currently selected model, after writing that exact selection as the tool default
- Installs provider catalogs into compatible external tool configs through the `Y` flow

## Stable Product Surface

The public launcher set is currently:

- `OpenCode CLI`
- `OpenCode Desktop`
- `OpenClaw`
- `Crush`
- `Goose`
- `Pi`
- `Aider`
- `Qwen Code`
- `OpenHands`
- `Amp`

Temporarily removed from the public app while the bridge is being rebuilt:

- `Claude Code`
- `Codex`
- `Gemini`
- the old FCM global proxy / daemon / log overlay flow

## Quick Start

```bash
free-coding-models
```

Useful startup flags:

```bash
free-coding-models --opencode
free-coding-models --openclaw --tier S
free-coding-models --crush
free-coding-models --json
free-coding-models --recommend
free-coding-models --help
```

Default tool mode with no launcher flag: `OpenCode CLI`

## Main TUI Keys

- `↑↓` navigate rows
- `Enter` launch/select the current model in the active tool mode
- `Z` cycle tool mode
- `T` cycle tier filter
- `D` cycle provider filter
- `R/O/M/L/A/S/C/H/V/B/U/G` sort columns
- `E` toggle configured models only
- `F` favorite/unfavorite the selected model
- `W` cycle ping cadence
- `P` open Settings
- `Y` open Install Endpoints
- `Q` open Smart Recommend
- `I` open feedback / bug report form
- `N` open changelog
- `K` open help
- `Ctrl+C` exit

## Settings

Press `P` to:

- add or remove provider API keys
- enable or disable providers
- test provider keys
- check for updates
- toggle the terminal width warning
- clean discontinued proxy-era config left behind by older builds

The main TUI also shows a footer notice explaining that the external-tools bridge/proxy is intentionally disabled while it is being rebuilt.

## Install Endpoints

Press `Y` to install one configured provider into supported external tools.

Current install flow:

1. Choose a configured provider
2. Choose a supported tool
3. Choose scope: all models or selected models
4. Write the managed config/env files

This flow is direct-provider only now. The old proxy-backed install path has been removed.

## Tool Notes

When you press `Enter`, FCM now persists the selected model into the target tool before launch so the tool opens on the model you actually picked.

### OpenCode

- `OpenCode CLI` and `OpenCode Desktop` share `~/.config/opencode/opencode.json`
- Selecting a model and pressing `Enter` updates the config and launches the target mode

### OpenClaw

- `free-coding-models` writes the selected provider/model into `~/.openclaw/openclaw.json` as the primary default
- OpenClaw itself is not launched by FCM

### ZAI with OpenCode

ZAI still needs a small local compatibility bridge for OpenCode only, because ZAI uses `/api/coding/paas/v4/*` instead of standard `/v1/*` paths.

That bridge is internal to the OpenCode launcher path and is still supported:

- it starts only when launching a ZAI model in OpenCode
- it binds to localhost on a random port
- it shuts down automatically when OpenCode exits

This is separate from the removed global multi-tool proxy system.

## `/testfcm`

There is a repo-local harness for exercising the real TUI and launcher flow.

Available scripts:

```bash
pnpm test:fcm
pnpm test:fcm:mock
```

`pnpm test:fcm:mock` uses the mock `crush` binary in `test/fixtures/mock-bin` so maintainers can validate the TUI → launcher plumbing without a real external CLI installed.

## Development

Run the unit tests:

```bash
pnpm test
```

Run the app locally:

```bash
pnpm start
```

## Architecture Notes

- Main CLI entrypoint: [`bin/free-coding-models.js`](./bin/free-coding-models.js)
- Pure helpers and sorting logic: [`src/utils.js`](./src/utils.js)
- OpenCode launch/config helpers: [`src/opencode.js`](./src/opencode.js), [`src/opencode-config.js`](./src/opencode-config.js)
- External tool launchers: [`src/tool-launchers.js`](./src/tool-launchers.js)
- Endpoint installer flow: [`src/endpoint-installer.js`](./src/endpoint-installer.js)

## Current Status

The app surface is intentionally narrowed right now to keep releases stable:

- direct provider launches are the supported path
- the old cross-tool proxy stack has been removed from the app
- Claude Code, Codex, and Gemini stay hidden until the rewrite is production-ready

When that rewrite lands, it should come back as a separate, cleaner system rather than more patches on the old one.
