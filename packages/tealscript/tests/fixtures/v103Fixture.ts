import { lock } from './v102Fixture';

export { executeEntry, json, lock, raw, table, text } from './v102Fixture';
export const revision = '287ebfc19e282245be4df55fc6a9d0f5b876d817';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
