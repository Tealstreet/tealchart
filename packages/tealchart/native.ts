/**
 * React Native entry point for @tealstreet/tealchart
 *
 * Import from '@tealstreet/tealchart/native' (web) or '@packages/tealchart/native' (mobile)
 * to get Skia-based components without breaking web builds.
 *
 * This file only re-exports ./src/index.native, which package.json `exports`
 * already maps './native' to. Consumers whose bundler rewrites the subpath to a
 * file path land here instead of the exports map, so the two surfaces must not
 * drift — listing exports twice is what previously dropped them at runtime.
 */

export * from './src/index.native';
