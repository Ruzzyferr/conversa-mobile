/**
 * Turn the commits since the previous release tag into store release notes.
 *
 * Play caps release notes at 500 characters per language and TestFlight caps
 * "What to Test" at 4000, so the same commit list is rendered twice at
 * different budgets rather than written by hand twice.
 *
 * Commit subjects are used as-is: this repo writes them as prose sentences
 * ("Google/Apple sign-in, responsive discovery deck, and language fixes"),
 * which is already the register store notes want. Conventional-commit
 * prefixes are stripped when present so "feat: x" reads as "X".
 *
 * Usage: node scripts/ci/release-notes.mjs [previousTag]
 * Writes build-output/notes-short.txt and build-output/notes-long.txt.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT_DIR = path.join(ROOT, 'build-output');

const PLAY_LIMIT = 500;
const TESTFLIGHT_LIMIT = 4000;

/** Commits that describe the plumbing rather than the app. */
const SKIP = [
  /^(chore|ci|build|docs|test|style|refactor)(\(.+\))?[:!]/i,
  /^Merge (branch|pull request|remote-tracking)/i,
  /^Release \d/, // the pipeline's own version-bump commits
  /\[skip ci\]/i,
  /\[skip notes\]/i,
];

function git(...args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'], // "No names found" on an untagged repo is expected
  }).trim();
}

function previousTag() {
  if (process.argv[2]) return process.argv[2];
  try {
    return git('describe', '--tags', '--abbrev=0', '--match', 'v*');
  } catch {
    return null; // first release: no tag to diff against
  }
}

function subjects(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const log = git('log', range, '--no-merges', '--pretty=format:%s');
  return log ? log.split('\n') : [];
}

function clean(subject) {
  const withoutPrefix = subject.replace(/^(\w+)(\(.+?\))?!?:\s*/, '');
  return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
}

/** Fill the budget with whole bullets — a half-sentence reads as a bug. */
function render(lines, limit) {
  const out = [];
  let used = 0;
  for (const line of lines) {
    const bullet = `- ${line}`;
    const cost = bullet.length + 1;
    if (used + cost > limit) break;
    out.push(bullet);
    used += cost;
  }
  return out.join('\n');
}

const tag = previousTag();
const picked = subjects(tag)
  .filter((s) => s && !SKIP.some((pattern) => pattern.test(s)))
  .map(clean);

const unique = [...new Set(picked)];

// The store listing is tr-TR, so a Turkish tester should not be handed English
// release notes. Commit subjects are written in English and are shipped as-is,
// but the fallback — which is what a release with no user-facing commits
// actually ships, as versionCode 23 did — is written per language.
const FALLBACK = {
  'en-US': 'Stability and performance improvements.',
  'tr-TR': 'Kararlılık ve performans iyileştirmeleri.',
};

const short = render(unique, PLAY_LIMIT);
const long = render(unique, TESTFLIGHT_LIMIT);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'notes-short.txt'), short || `- ${FALLBACK['en-US']}`);
fs.writeFileSync(path.join(OUT_DIR, 'notes-long.txt'), long || `- ${FALLBACK['en-US']}`);
// Consumed by play-upload.mjs, which needs one text per listing language.
fs.writeFileSync(
  path.join(OUT_DIR, 'notes-fallback.json'),
  JSON.stringify(Object.fromEntries(Object.entries(FALLBACK).map(([k, v]) => [k, `- ${v}`])), null, 2)
);

console.log(`önceki etiket: ${tag ?? '(yok)'}`);
console.log(`commit: ${unique.length} adet, kısa not ${short.length}/${PLAY_LIMIT} karakter`);
console.log('---');
console.log(short || `- ${FALLBACK['en-US']}`);
