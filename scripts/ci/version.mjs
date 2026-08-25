/**
 * Bump the release version for a CI run.
 *
 * Android reads versionCode from version.json (android/app/build.gradle parses
 * it at configure time) and iOS reads buildNumber from app.config.ts, so the
 * two live in different files and have to be moved together.
 *
 * Usage:
 *   node scripts/ci/version.mjs read    -> prints "1.0.3 19 4"
 *   node scripts/ci/version.mjs bump    -> increments both, writes both files
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const VERSION_JSON = path.join(ROOT, 'version.json');
const APP_CONFIG = path.join(ROOT, 'app.config.ts');

const BUILD_NUMBER_RE = /(buildNumber:\s*")(\d+)(")/;

function read() {
  const version = JSON.parse(fs.readFileSync(VERSION_JSON, 'utf8'));
  const config = fs.readFileSync(APP_CONFIG, 'utf8');
  const match = config.match(BUILD_NUMBER_RE);
  if (!match) {
    throw new Error('app.config.ts: buildNumber not found');
  }
  return {
    versionName: version.version,
    versionCode: Number(version.versionCode),
    buildNumber: Number(match[2]),
  };
}

function bump() {
  const current = read();
  const next = {
    versionName: current.versionName,
    versionCode: current.versionCode + 1,
    buildNumber: current.buildNumber + 1,
  };

  fs.writeFileSync(
    VERSION_JSON,
    JSON.stringify({ version: next.versionName, versionCode: next.versionCode }, null, 2) + '\n'
  );

  const config = fs.readFileSync(APP_CONFIG, 'utf8');
  fs.writeFileSync(
    APP_CONFIG,
    config.replace(BUILD_NUMBER_RE, `$1${next.buildNumber}$3`)
  );

  return next;
}

const command = process.argv[2] || 'read';
const result = command === 'bump' ? bump() : read();
process.stdout.write(`${result.versionName} ${result.versionCode} ${result.buildNumber}\n`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version_name=${result.versionName}\n` +
      `version_code=${result.versionCode}\n` +
      `build_number=${result.buildNumber}\n`
  );
}
