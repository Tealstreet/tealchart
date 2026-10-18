import { lock } from './v102Fixture';

export { executeEntry, json, lock, raw, table, text } from './v102Fixture';
export const revision = '5c8a503d7b6cc1c161f75d484b5340ebc459a55b';
if (lock.revision !== revision) throw new Error(`V103 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
