import { lock } from './v102Fixture';

export { executeEntry, json, lock, raw, table, text } from './v102Fixture';
export const revision = 'cd1fcda33e7bae9198823468495f6cb6feb05145';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
