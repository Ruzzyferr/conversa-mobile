/**
 * Upload the release AAB to the Play closed-testing track.
 *
 * The browser upload is not an option in CI, and it is not reliable outside it
 * either — Chrome's renderer crashes partway through the 65 MB bundle. This
 * talks to the Play Developer API directly: insert an edit, upload the bundle,
 * point the track at it, commit.
 *
 * The commit deliberately leaves changesNotSentForReview at its default, so
 * anything else pending in the console (a store listing edit, a privacy answer)
 * is reviewed together with the build instead of silently held back.
 *
 * Environment:
 *   PLAY_SERVICE_ACCOUNT_JSON  service account key, as JSON
 *   PLAY_TRACK                 defaults to "alpha" (Closed testing)
 *   AAB_PATH, VERSION_NAME, VERSION_CODE, NOTES_FILE
 */
import crypto from 'crypto';
import fs from 'fs';

const PACKAGE = 'com.conversa.app';
const TRACK = process.env.PLAY_TRACK || 'alpha';
const AAB = process.env.AAB_PATH || 'android/app/build/outputs/bundle/release/app-release.aab';
const VERSION_NAME = process.env.VERSION_NAME;
const VERSION_CODE = process.env.VERSION_CODE;
const NOTES_FILE = process.env.NOTES_FILE || 'build-output/notes-short.txt';

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Service-account JWT -> OAuth access token, so googleapis is not a dependency. */
async function accessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`token alınamadı: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function api(token, path, { method = 'GET', body, raw, contentType } = {}) {
  const res = await fetch(path.startsWith('http') ? path : BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType || 'application/json',
    },
    body: raw || (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

const key = JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON);
const token = await accessToken(key);
console.log('servis hesabı:', key.client_email);

const notes = fs.existsSync(NOTES_FILE) ? fs.readFileSync(NOTES_FILE, 'utf8').trim() : '';
const bytes = fs.readFileSync(AAB);
console.log(`paket: ${AAB} (${(bytes.length / 1048576).toFixed(1)} MB)`);

const edit = await api(token, '/edits', { method: 'POST', body: {} });
console.log('edit:', edit.id);

const uploaded = await api(
  token,
  `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${edit.id}/bundles?uploadType=media`,
  { method: 'POST', raw: bytes, contentType: 'application/octet-stream' }
);
console.log('yüklendi -> versionCode', uploaded.versionCode);

if (VERSION_CODE && String(uploaded.versionCode) !== String(VERSION_CODE)) {
  throw new Error(`beklenen versionCode ${VERSION_CODE}, yüklenen ${uploaded.versionCode}`);
}

// Release notes only go out for languages the listing actually has; Play
// rejects the edit for any other locale.
/** One release-notes entry per listing language. */
function releaseNotesFor(languages) {
  if (!languages.length) return undefined;
  if (notes) return languages.map((language) => ({ language, text: notes }));
  let fallback = {};
  try {
    fallback = JSON.parse(fs.readFileSync('build-output/notes-fallback.json', 'utf8'));
  } catch {
    return undefined;
  }
  const entries = languages
    .map((language) => ({ language, text: fallback[language] }))
    .filter((e) => e.text);
  return entries.length ? entries : undefined;
}

const listings = await api(token, `/edits/${edit.id}/listings`);
const languages = (listings.listings || []).map((l) => l.language);
console.log('listeleme dilleri:', languages.join(', ') || '(yok)');

await api(token, `/edits/${edit.id}/tracks/${TRACK}`, {
  method: 'PUT',
  body: {
    track: TRACK,
    releases: [{
      name: `${uploaded.versionCode} (${VERSION_NAME})`,
      versionCodes: [String(uploaded.versionCode)],
      status: 'completed',
      // With commit-derived notes every language gets the same text (the
      // subjects are English by convention). With none, each language gets its
      // own fallback so the tr-TR listing is not left showing English.
      releaseNotes: releaseNotesFor(languages),
    }],
  },
});
console.log(`track "${TRACK}" ayarlandı`);

await api(token, `/edits/${edit.id}:validate`, { method: 'POST', body: {} });
await api(token, `/edits/${edit.id}:commit`, { method: 'POST', body: {} });
console.log('commit edildi — Play incelemesine gönderildi');
