import { lock } from './v102Fixture';

export { executeEntry, json, lock, raw, table, text } from './v102Fixture';
export const revision = '1aad8cc2b41f53bd85b0c5558b36365d371b7244';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
