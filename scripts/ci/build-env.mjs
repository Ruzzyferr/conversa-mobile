/**
 * Feed the production EXPO_PUBLIC_* values into a local/CI gradle build.
 *
 * EAS injects `eas.json` -> build.production.env itself, but a plain
 * `gradlew bundleRelease` does not: Expo's bundler reads the process
 * environment (and .env files, which are gitignored and therefore absent in
 * CI). The first CI-built AAB shipped with no API URL, no RevenueCat key and
 * no web URL — and api.ts throws on launch when EXPO_PUBLIC_API_URL is empty,
 * so it was a crash-on-open build that still built and uploaded cleanly.
 *
 * eas.json stays the single source of truth so the two platforms cannot drift.
 *
 * Usage:
 *   node scripts/ci/build-env.mjs          # append to $GITHUB_ENV
 *   node scripts/ci/build-env.mjs --print  # print as KEY=value for `env -S`
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PROFILE = process.env.EAS_PROFILE || 'production';

const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
const env = eas.build?.[PROFILE]?.env;

if (!env || !Object.keys(env).length) {
  throw new Error(`eas.json: build.${PROFILE}.env boş`);
}

/** Without this the release is a crash-on-launch build, so refuse to build one. */
const REQUIRED = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL'];
const missing = REQUIRED.filter((key) => !env[key]);
if (missing.length) {
  throw new Error(`eas.json: build.${PROFILE}.env eksik: ${missing.join(', ')}`);
}

const entries = Object.entries(env).filter(([, value]) => value !== undefined && value !== '');

if (process.argv.includes('--print')) {
  // Tek tirnak: degerler bosluk ve noktali virgul icerebiliyor.
  for (const [key, value] of entries) {
    console.log(`${key}='${String(value).replace(/'/g, `'\''`)}'`);
  }
} else if (process.env.GITHUB_ENV) {
  fs.appendFileSync(
    process.env.GITHUB_ENV,
    entries.map(([key, value]) => `${key}=${value}`).join('\n') + '\n'
  );
  console.log(`${entries.length} değişken aktarıldı (profil: ${PROFILE})`);
  console.log('API:', env.EXPO_PUBLIC_API_URL);
} else {
  console.log(`${entries.length} değişken bulundu; GITHUB_ENV yok, --print kullan`);
}
