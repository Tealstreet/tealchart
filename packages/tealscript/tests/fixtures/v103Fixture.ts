import { lock } from './v102Fixture';

export { executeEntry, json, lock, raw, table, text } from './v102Fixture';
export const revision = 'ac9d6992d6d84e296c58dca98fb6b707224d55a1';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
