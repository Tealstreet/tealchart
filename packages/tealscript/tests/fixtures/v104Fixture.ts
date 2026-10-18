import { lock } from './v102Fixture';

export { executeEntry, json, lock, raw, table, text } from './v102Fixture';
export const revision = '1faebe5ac656714b4177c9acbdb5e1e411e8e9b2';
if (lock.revision !== revision)
  throw new Error(`V104 fixture revision mismatch: expected ${revision}, received ${lock.revision}`);
