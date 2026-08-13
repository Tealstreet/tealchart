/**
 * Jailbreak entry point for @tealstreet/tealchart
 *
 * This file only re-exports ./src/jailbreak, which package.json `exports`
 * already maps './jailbreak' to. Consumers whose bundler rewrites the subpath
 * to a file path — React Native's babel module-resolver expands
 * '@tealstreet/tealchart' to the package directory before Metro's resolver ever
 * sees the specifier — land here instead of the exports map, so the two
 * surfaces must not drift. `native.ts` exists for the same reason.
 */

export * from './src/jailbreak';
