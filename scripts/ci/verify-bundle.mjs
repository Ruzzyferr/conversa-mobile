/**
 * Refuse to ship an AAB whose JS bundle lost its configuration.
 *
 * EXPO_PUBLIC_* values are inlined at bundle time. When they are absent the
 * build still succeeds, the AAB still signs, Play still accepts it — and the
 * app throws on first launch. That is exactly what shipped as versionCode 20.
 * A build that cannot reach the API is not worth uploading, so check the
 * artifact itself rather than trusting the environment.
 *
 * Usage: node scripts/ci/verify-bundle.mjs [aab-path]
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ROOT = path.resolve(import.meta.dirname, '../..');
const AAB = process.argv[2]
  || path.join(ROOT, 'android/app/build/outputs/bundle/release/app-release.aab');

const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
const env = eas.build.production.env;

/** Values that must survive into the bundle for the app to work at all. */
const MUST_CONTAIN = [
  ['API adresi', env.EXPO_PUBLIC_API_URL],
  ['web adresi', env.EXPO_PUBLIC_WEB_URL],
  ['RevenueCat anahtarı', env.EXPO_PUBLIC_RC_ANDROID_API_KEY],
].filter(([, value]) => value);

if (!fs.existsSync(AAB)) throw new Error(`paket bulunamadı: ${AAB}`);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'aab-'));
execFileSync('unzip', ['-o', '-q', AAB, 'base/assets/index.android.bundle', '-d', work]);
const bundlePath = path.join(work, 'base/assets/index.android.bundle');
const bundle = fs.readFileSync(bundlePath, 'utf8');

console.log(`paket: ${(fs.statSync(bundlePath).size / 1048576).toFixed(1)} MB`);

const missing = [];
for (const [label, value] of MUST_CONTAIN) {
  const found = bundle.includes(value);
  console.log(`  ${found ? 'var' : 'YOK'}  ${label}`);
  if (!found) missing.push(`${label} (${value})`);
}

fs.rmSync(work, { recursive: true, force: true });

if (missing.length) {
  console.error('\nBu paket açılışta çöker. Eksik:');
  for (const item of missing) console.error(`  - ${item}`);
  process.exit(1);
}
console.log('paket yapılandırması tam');
