import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { lstat, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const lockPath = join(packageRoot, 'oracle-fixtures.json');
const checkoutPath = join(packageRoot, 'oracle-probes');
const receiptName = '.oracle-fixtures-receipt.json';

export function validateLock(lock) {
  if (lock.repository !== 'https://github.com/Tealstreet/tealscript-oracle.git' || typeof lock.revision !== 'string' || !/^[a-f0-9]{40}$/.test(lock.revision)) {
    throw new Error('Oracle lock must name the public archive and an immutable commit.');
  }
  if (!Array.isArray(lock.files) || lock.files.length === 0) throw new Error('Oracle lock has no fixture files.');
  const seen = new Set();
  for (const file of lock.files) {
    if (typeof file.path !== 'string' || !/^[a-zA-Z0-9_.\-/]+$/.test(file.path) || file.path.split('/').some(part => !part || part === '.' || part === '..' || part.toLowerCase() === '.git')) {
      throw new Error(`Unsafe oracle fixture path: ${file.path}`);
    }
    if (seen.has(file.path) || typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) {
      throw new Error(`Invalid or duplicate oracle fixture: ${file.path}`);
    }
    seen.add(file.path);
  }
  return lock;
}

function loadLock() {
  const source = readFileSync(lockPath);
  return { lock: validateLock(JSON.parse(source)), digest: createHash('sha256').update(source).digest('hex') };
}

function git(args, cwd, input) {
  const result = spawnSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

export async function verifyFiles(root, files) {
  let bytes = 0;
  for (const file of files) {
    const path = join(root, file.path);
    const info = await lstat(path);
    if (!info.isFile() || info.size !== file.bytes) throw new Error(`Oracle fixture length/type mismatch: ${file.path}`);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    if (hash.digest('hex') !== file.sha256) throw new Error(`Oracle fixture SHA-256 mismatch: ${file.path}`);
    bytes += info.size;
  }
  return bytes;
}

export function assertReady(root = checkoutPath, lockFile = lockPath) {
  const source = readFileSync(lockFile);
  const lock = validateLock(JSON.parse(source));
  const digest = createHash('sha256').update(source).digest('hex');
  const receipt = join(root, receiptName);
  const identity = existsSync(receipt) ? JSON.parse(readFileSync(receipt, 'utf8')) : null;
  if (identity?.lockSha256 !== digest || identity?.revision !== lock.revision) {
    throw new Error('Native oracle fixtures are absent or the pin changed. Run yarn oracle:fetch in packages/tealscript.');
  }
  const head = join(root, '.git', 'HEAD');
  if (!existsSync(head) || readFileSync(head, 'utf8').trim() !== lock.revision) {
    throw new Error('Native oracle checkout must be detached at the pinned revision. Run yarn oracle:fetch in packages/tealscript.');
  }
  for (const file of lock.files) {
    if (!existsSync(join(root, file.path))) throw new Error(`Missing oracle fixture ${file.path}. Run yarn oracle:fetch.`);
  }
}

function guard() {
  const tracked = git(['ls-files', '--', 'oracle-probes'], packageRoot);
  if (tracked) throw new Error('Oracle captures must be committed to Tealstreet/tealscript-oracle, never the application repository.');
  loadLock();
}

export function assertManaged(root) {
  if (!existsSync(join(root, '.git')) || !existsSync(join(root, receiptName))) {
    throw new Error(`Refusing to replace an unmanaged oracle directory: ${root}. Move capture work to the public oracle repository first.`);
  }
  const receipt = JSON.parse(readFileSync(join(root, receiptName), 'utf8'));
  if (git(['remote', 'get-url', 'origin'], root) !== 'https://github.com/Tealstreet/tealscript-oracle.git' || git(['rev-parse', 'HEAD'], root) !== receipt.revision) {
    throw new Error(`Refusing to replace an oracle checkout with changed identity: ${root}`);
  }
  const changes = git(['status', '--porcelain', '--untracked-files=all', '--ignored'], root)
    .split('\n').filter(line => line && line !== `!! ${receiptName}`);
  if (changes.length) {
    throw new Error(`Refusing to replace changed oracle fixtures: ${root}. Preserve your work in the oracle repository.`);
  }
}

async function fetchFixtures() {
  guard();
  const { lock, digest } = loadLock();
  if (existsSync(checkoutPath)) {
    assertManaged(checkoutPath);
    const receipt = JSON.parse(readFileSync(join(checkoutPath, receiptName), 'utf8'));
    if (receipt.lockSha256 === digest && git(['rev-parse', 'HEAD'], checkoutPath) === lock.revision) {
      git(['checkout', '--detach', lock.revision], checkoutPath);
      const bytes = await verifyFiles(checkoutPath, lock.files);
      await writeFile(join(checkoutPath, receiptName), JSON.stringify({ lockSha256: digest, revision: lock.revision }) + '\n');
      console.log(`Verified ${lock.files.length} oracle fixtures (${bytes} bytes), ${lock.revision}.`);
      return;
    }
  }
  const staging = await mkdtemp(join(packageRoot, '.oracle-fixtures-'));
  try {
    git(['clone', '--filter=blob:none', '--no-checkout', '--depth=1', lock.repository, staging], packageRoot);
    if (git(['rev-parse', 'HEAD'], staging) !== lock.revision) git(['fetch', '--depth=1', 'origin', lock.revision], staging);
    await writeFile(join(staging, '.git', 'info', 'sparse-checkout'), '');
    git(['config', 'core.sparseCheckout', 'true'], staging);
    git(['config', 'core.sparseCheckoutCone', 'false'], staging);
    git(['checkout', '--detach', lock.revision], staging);
    git(['sparse-checkout', 'set', '--no-cone', '--stdin'], staging, lock.files.map(file => `/${file.path}`).join('\n') + '\n');
    const bytes = await verifyFiles(staging, lock.files);
    await writeFile(join(staging, '.git', 'info', 'exclude'), `${receiptName}\n`);
    await writeFile(join(staging, receiptName), JSON.stringify({ lockSha256: digest, revision: lock.revision }) + '\n');
    if (existsSync(checkoutPath)) {
      assertManaged(checkoutPath);
      const backup = staging + '.previous';
      await rename(checkoutPath, backup);
      try {
        await rename(staging, checkoutPath);
      } catch (error) {
        await rename(backup, checkoutPath);
        throw error;
      }
      await rm(backup, { recursive: true });
    } else await rename(staging, checkoutPath);
    console.log(`Fetched and verified ${lock.files.length} oracle fixtures (${bytes} bytes), ${lock.revision}.`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'fetch') await fetchFixtures();
  else if (command === 'guard') guard();
  else if (command === 'verify') {
    assertReady();
    const { lock } = loadLock();
    const revision = git(['rev-parse', 'HEAD'], checkoutPath);
    if (revision !== lock.revision) throw new Error(`Oracle checkout revision mismatch: ${revision}`);
    console.log(`Verified ${lock.files.length} oracle fixtures (${await verifyFiles(checkoutPath, lock.files)} bytes).`);
  } else throw new Error('Usage: node scripts/oracle-fixtures.mjs fetch|verify|guard');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
