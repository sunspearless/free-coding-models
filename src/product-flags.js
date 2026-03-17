/**
 * @file src/product-flags.js
 * @description Product-level copy for temporarily unavailable surfaces.
 *
 * @details
 *   📖 The proxy bridge is being rebuilt from scratch. The main TUI still
 *   📖 shows a clear status line so users know the missing integration is
 *   📖 intentional instead of silently broken.
 *
 * @exports PROXY_DISABLED_NOTICE
 */

// 📖 Public note rendered in the main TUI footer and reused in CLI/runtime guards.
export const PROXY_DISABLED_NOTICE = 'ℹ️ Proxy is temporarily disabled while we rebuild it into a much more stable bridge for external tools.'
