#!/usr/bin/env node

/**
 * Blocks npm, yarn, and bun so the lockfile and node_modules layout stay
 * consistent. Detection uses npm_config_user_agent, which every major
 * package manager sets (e.g. "pnpm/12.3.4 npm/? node/v22.13.0 ...").
 */
const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error(`
This project requires pnpm.

  corepack enable
  corepack prepare pnpm@12.3.4 --activate
  pnpm install

npm, yarn, and bun are not allowed.
`);
  process.exit(1);
}
