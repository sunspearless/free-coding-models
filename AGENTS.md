# Agent Instructions

## Build and Test Commands

### Available Commands
- `pnpm test` or `node --test test/test.js` — Run all 62 tests across 11 suites
- `pnpm start` or `node bin/free-coding-models.js` — Run CLI locally

### Running Single Tests
The test suite uses Node.js built-in `node:test` runner. To run a single test:
- No built-in filtering in `node:test` for individual tests
- Use `describe.only()` or `it.only()` temporarily in `test/test.js`
- Example: Add `.only()` to a test line (e.g., `it.only('returns Infinity when no pings')`)
- **Important**: Remove `.only()` before committing to ensure all tests pass

## Code Style Guidelines

### Imports and Modules
- Use ES6 named imports: `import { readFileSync, writeFileSync } from 'fs'`
- No CommonJS `require()` except for legacy `readline` in main CLI (requires `createRequire`)
- Explicitly list imports in JSDoc `@imports` or `@exports` tags
- Use full file paths with `.js` extension (ESM requirement)

### JSDoc Documentation
Every file must have JSDoc header at the top:
```javascript
/**
 * @file filename.js
 * @description Brief purpose statement.
 *
 * 📖 Detailed explanation of the module's role in the project.
 *    Use 📖 emoji for explanatory comments.
 *
 * @functions
 *   → functionOne — What it does
 *   → functionTwo — What it does
 *
 * @exports exportOne, exportTwo
 * @exports CONSTANT_ONE, CONSTANT_TWO
 *
 * @see related-file.js — Related modules
 */
```
- List all functions with `→ function — description` format
- Document exports with `@exports` tag
- Include `@see` references to related files
- Use `📖` emoji prefix for explanation markers in comments

### Naming Conventions
- Functions: `camelCase` (e.g., `getAvg`, `parseArgs`, `loadConfig`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `PING_TIMEOUT`, `TIER_ORDER`)
- Variables: `camelCase`
- Files: `lowercase-with-dashes.js` (e.g., `free-coding-models.js`, `utils.js`)

### Type Safety
- Use TypeScript-style JSDoc types: `@param {{ apiKeys: Record<string,string> }} config`
- No actual TypeScript files — pure JS with JSDoc type annotations
- Export constants used by tests (e.g., `TIER_ORDER`, `VERDICT_ORDER`) for type reference
- Define expected object shapes in JSDoc `@description` sections

### Pure Functions
- Add pure logic to `lib/utils.js` (no side effects, no I/O, no `process.exit()`)
- Avoid `console.log()` in utility functions
- Makes functions trivially testable with `node:assert` without mocking
- Main CLI (`bin/free-coding-models.js`) imports from `lib/utils.js`

### Error Handling
- Use try/catch for I/O operations (file reads/writes, JSON parsing)
- Silent failures acceptable for config writes (app remains usable)
- Return empty config/default values on parse failures
- Never throw from utility functions in `lib/utils.js`
- Log errors to user in main CLI, never in utility functions

### Constants
- Define at top of file with `📖` comment explaining purpose
- Export constants used by tests (e.g., `TIER_ORDER`, `VERDICT_ORDER`)
- Keep in sync with data definitions in `sources.js`
- Use descriptive names with clear semantic meaning

### File Organization
```
bin/
  free-coding-models.js    — CLI entry point with shebang, imports from lib/
lib/
  utils.js                — Pure testable business logic (getAvg, sortResults, parseArgs, etc.)
  config.js               — JSON config I/O (~/.free-coding-models.json)
test/
  test.js                — Unit tests using node:test + node:assert/strict
sources.js               — Model definitions by provider (NIM, Groq, Cerebras)
```

### No Linting Tools
- No ESLint, Prettier, or similar tools configured
- Follow patterns established in existing code
- Consistent style is maintained via conventions, not tool enforcement

## Post-Feature Testing

After completing any feature or fix, the agent MUST:

1. Run `pnpm test` to verify all unit tests pass (62 tests across 11 suites)
2. If any test fails, fix the issue immediately
3. Re-run `pnpm test` until all tests pass
4. Run `pnpm start` to verify there are no runtime errors
5. If there are errors, fix them immediately
6. Re-run `pnpm start` until all errors are resolved
7. Only then consider the task complete

This ensures the codebase remains in a working state at all times.

## Release Process (MANDATORY)

When releasing a new version, follow this exact process:

1. **Version Check**: Check if version already exists with `git log --oneline | grep "^[a-f0-9]\+ [0-9]"`
2. **Version Bump**: Update version in `package.json` (e.g., `0.1.16` → `0.1.17`)
3. **Commit ALL Changed Files**: `git add . && git commit -m "0.1.17"`
   - Always commit with just the version number as the message (e.g., "0.1.17")
   - Include ALL modified files in the commit (bin/, lib/, test/, README.md, CHANGELOG.md, etc.)
4. **Push**: `git push origin main` — GitHub Actions will auto-publish to npm
5. **Wait for npm Publish":
   ```bash
   for i in $(seq 1 30); do sleep 10; v=$(npm view free-coding-models version 2>/dev/null); echo "Attempt $i: npm version = $v"; if [ "$v" = "0.1.17" ]; then echo "✅ published!"; break; fi; done
   ```
6. **Install and Verify**: `npm install -g free-coding-models@0.1.17`
7. **Test Binary**: `free-coding-models --help` (or any other command to verify it works)
8. **Only when the global npm-installed version works → the release is confirmed**

**Why:** A local `npm install -g .` can mask issues because it symlinks the repo. The real npm package is a tarball built from the `files` field — only a real npm install will catch missing files.

## Real-World npm Verification (MANDATORY for every fix/feature)

**Never trust local-only testing.** `pnpm start` runs from the repo and won't catch missing files in the published package. Always run the full npm verification:

1. Bump version in `package.json` (e.g. `0.1.14` → `0.1.15`)
2. Commit and push to `main` — GitHub Actions auto-publishes to npm
3. Wait for the new version to appear on npm:
   ```bash
   # Poll until npm has the new version
   for i in $(seq 1 30); do sleep 10; v=$(npm view free-coding-models version 2>/dev/null); echo "Attempt $i: npm version = $v"; if [ "$v" = "NEW_VERSION" ]; then echo "✅ published!"; break; fi; done
   ```
4. Install the published version globally:
   ```bash
   npm install -g free-coding-models@NEW_VERSION
   ```
5. Run the global binary and verify it works:
   ```bash
   free-coding-models
   ```
6. Only if the global npm-installed version works → the fix is confirmed

**Why:** A local `npm install -g .` can mask issues because it symlinks the repo. The real npm package is a tarball built from the `files` field — if something is missing there, only a real npm install will catch it.

## Test Architecture

- Tests live in `test/test.js` using Node.js built-in `node:test` + `node:assert` (zero deps)
- Pure logic functions are in `lib/utils.js` (extracted from the main CLI for testability)
- The main CLI (`bin/free-coding-models.js`) imports from `lib/utils.js`
- If you add new pure logic (calculations, parsing, filtering), add it to `lib/utils.js` and write tests
- If you modify existing logic in `lib/utils.js`, update the corresponding tests

### What's tested:
- **sources.js data integrity** — model structure, valid tiers, no duplicates, count consistency
- **Core logic** — getAvg, getVerdict, getUptime, filterByTier, sortResults, findBestModel
- **CLI arg parsing** — all flags (--best, --fiable, --opencode, --openclaw, --tier)
- **Package sanity** — package.json fields, bin entry exists, shebang, ESM imports

## Changelog (MANDATORY)

**⚠️ CRITICAL:** After every dev session (feature, fix, refactor), add a succinct entry to `CHANGELOG.md` BEFORE pushing:

- Use the current version from `package.json`
- Add under the matching version header (or create a new one if the version was bumped)
- List changes under `### Added`, `### Fixed`, or `### Changed` as appropriate
- Keep entries short — one line per change is enough
- Include ALL changes made during the session
- Update CHANGELOG.md BEFORE committing and pushing

**Why this is critical:** The changelog is the only historical record of what was changed in each version. Without it, users cannot understand what changed between versions.
