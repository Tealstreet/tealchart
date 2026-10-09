import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { assertManaged, assertReady, validateLock, verifyFiles } from './oracle-fixtures.mjs';

const repository = 'https://github.com/Tealstreet/tealscript-oracle.git';
const revision = 'a'.repeat(40);
const receiptName = '.oracle-fixtures-receipt.json';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fixture = { path: 'v58/captures/value.csv', bytes: 3, sha256: sha256('abc') };
const makeLock = () => ({ repository, revision, files: [{ ...fixture }] });

async function temporaryRoot(t) {
  const root = await mkdtemp(join(tmpdir(), 'oracle-fixtures-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function writeFixture(root, value = 'abc') {
  await mkdir(join(root, 'v58/captures'), { recursive: true });
  await writeFile(join(root, fixture.path), value);
}

async function writeReady(root, lock = makeLock()) {
  const source = `${JSON.stringify(lock)}\n`;
  const lockFile = join(root, 'oracle-fixtures.json');
  await writeFile(lockFile, source);
  await writeFile(join(root, receiptName), JSON.stringify({ revision: lock.revision, lockSha256: sha256(source) }));
  await mkdir(join(root, '.git'), { recursive: true });
  await writeFile(join(root, '.git/HEAD'), `${lock.revision}\n`);
  return lockFile;
}

function git(root, ...args) {
  const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}

async function managedCheckout(t) {
  const root = await temporaryRoot(t);
  git(root, 'init', '-b', 'master');
  git(root, 'remote', 'add', 'origin', repository);
  await writeFixture(root);
  git(root, 'add', '.');
  git(root, '-c', 'user.name=Fixture Test', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Fixture');
  await writeFile(join(root, '.git/info/exclude'), `${receiptName}\n`);
  await writeFile(join(root, receiptName), JSON.stringify({ revision: git(root, 'rev-parse', 'HEAD'), lockSha256: 'b'.repeat(64) }));
  return root;
}

test('validateLock accepts an immutable public archive pin', () => {
  const lock = makeLock();
  assert.equal(validateLock(lock), lock);
});

test('validateLock rejects mutable pins, alternate repositories and malformed inventories', () => {
  for (const lock of [
    { ...makeLock(), repository: 'https://example.invalid/archive.git' },
    { ...makeLock(), revision: 'master' },
    { ...makeLock(), revision: 'a'.repeat(39) },
    { ...makeLock(), revision: [revision] },
    { ...makeLock(), files: [] },
    { ...makeLock(), files: [{ ...fixture, bytes: -1 }] },
    { ...makeLock(), files: [{ ...fixture, bytes: 1.5 }] },
    { ...makeLock(), files: [{ ...fixture, sha256: 'not-a-hash' }] },
    { ...makeLock(), files: [{ ...fixture, sha256: [fixture.sha256] }] },
  ]) assert.throws(() => validateLock(lock));
});

test('validateLock rejects traversal, Git metadata paths and duplicate fixture entries', () => {
  for (const path of ['/outside', '../outside', 'v58/../outside', 'v58//file', './file', '.git/config', 'v58/file?query', 'v58/file#fragment']) {
    assert.throws(() => validateLock({ ...makeLock(), files: [{ ...fixture, path }] }), /Unsafe/);
  }
  assert.throws(() => validateLock({ ...makeLock(), files: [{ ...fixture }, { ...fixture }] }), /duplicate/);
});

test('verifyFiles accepts exact bytes and rejects same-length corruption', async t => {
  const root = await temporaryRoot(t);
  await writeFixture(root);
  assert.equal(await verifyFiles(root, [fixture]), 3);
  await writeFixture(root, 'abd');
  await assert.rejects(verifyFiles(root, [fixture]), /SHA-256 mismatch/);
});

test('verifyFiles rejects missing files, truncation, directories and symlinks', async t => {
  const root = await temporaryRoot(t);
  await assert.rejects(verifyFiles(root, [fixture]), /ENOENT/);
  await writeFixture(root, 'ab');
  await assert.rejects(verifyFiles(root, [fixture]), /length\/type mismatch/);
  await rm(join(root, fixture.path));
  await mkdir(join(root, fixture.path));
  await assert.rejects(verifyFiles(root, [fixture]), /length\/type mismatch/);
  await rm(join(root, fixture.path), { recursive: true });
  await writeFile(join(root, 'same-bytes.csv'), 'abc');
  await symlink(join(root, 'same-bytes.csv'), join(root, fixture.path));
  await assert.rejects(verifyFiles(root, [fixture]), /length\/type mismatch/);
});

test('assertReady rejects missing receipts, changed locks and removed fixtures', async t => {
  const root = await temporaryRoot(t);
  await writeFixture(root);
  const lockFile = await writeReady(root);
  assert.doesNotThrow(() => assertReady(root, lockFile));
  await rm(join(root, receiptName));
  assert.throws(() => assertReady(root, lockFile), /oracle:fetch/);
  await writeReady(root);
  await writeFile(lockFile, `${JSON.stringify({ ...makeLock(), revision: 'c'.repeat(40) })}\n`);
  assert.throws(() => assertReady(root, lockFile), /pin changed/);
  await writeReady(root);
  await rm(join(root, fixture.path));
  assert.throws(() => assertReady(root, lockFile), /Missing oracle fixture/);
});

test('assertReady rejects a receipt with the right lock hash but the wrong revision', async t => {
  const root = await temporaryRoot(t);
  await writeFixture(root);
  const lockFile = await writeReady(root);
  const identity = JSON.parse(await readFile(join(root, receiptName), 'utf8'));
  await writeFile(join(root, receiptName), JSON.stringify({ ...identity, revision: 'c'.repeat(40) }));
  assert.throws(() => assertReady(root, lockFile), /pin changed/);
});

test('assertReady rejects changed or attached HEAD despite a matching receipt', async t => {
  const root = await temporaryRoot(t);
  await writeFixture(root);
  const lockFile = await writeReady(root);
  for (const head of ['c'.repeat(40), 'ref: refs/heads/master']) {
    await writeFile(join(root, '.git/HEAD'), `${head}\n`);
    assert.throws(() => assertReady(root, lockFile), /detached at the pinned revision/);
  }
  await rm(join(root, '.git/HEAD'));
  assert.throws(() => assertReady(root, lockFile), /oracle:fetch/);
});

test('assertManaged accepts a clean managed checkout', async t => {
  const root = await managedCheckout(t);
  assert.doesNotThrow(() => assertManaged(root));
});

test('assertManaged rejects an unmanaged capture directory and preserves its contents', async t => {
  const root = await temporaryRoot(t);
  await writeFixture(root, 'raw capture');
  assert.throws(() => assertManaged(root), /unmanaged/);
  assert.equal(await readFile(join(root, fixture.path), 'utf8'), 'raw capture');
});

test('assertManaged rejects modified and untracked capture work without changing it', async t => {
  const root = await managedCheckout(t);
  await writeFixture(root, 'new capture');
  assert.throws(() => assertManaged(root), /changed oracle fixtures/);
  assert.equal(await readFile(join(root, fixture.path), 'utf8'), 'new capture');
  git(root, 'restore', fixture.path);
  await writeFile(join(root, 'new-capture.csv'), 'untracked capture');
  assert.throws(() => assertManaged(root), /changed oracle fixtures/);
  assert.equal(await readFile(join(root, 'new-capture.csv'), 'utf8'), 'untracked capture');
});

test('assertManaged rejects changed remote and revision identities', async t => {
  const root = await managedCheckout(t);
  const receipt = await readFile(join(root, receiptName), 'utf8');
  git(root, 'remote', 'set-url', 'origin', 'https://example.invalid/capture.git');
  assert.throws(() => assertManaged(root), /changed identity/);
  assert.equal(await readFile(join(root, receiptName), 'utf8'), receipt);
  git(root, 'remote', 'set-url', 'origin', repository);
  await writeFile(join(root, receiptName), JSON.stringify({ revision, lockSha256: 'b'.repeat(64) }));
  assert.throws(() => assertManaged(root), /changed identity/);
  assert.equal(await readFile(join(root, fixture.path), 'utf8'), 'abc');
});

test('assertManaged preserves ignored capture work rather than treating it as disposable', async t => {
  const root = await managedCheckout(t);
  await writeFile(join(root, '.git/info/exclude'), `${receiptName}\n*.csv\n`);
  await writeFile(join(root, 'new-capture.csv'), 'ignored capture');
  assert.throws(() => assertManaged(root), /changed oracle fixtures/);
  assert.equal(await readFile(join(root, 'new-capture.csv'), 'utf8'), 'ignored capture');
});
