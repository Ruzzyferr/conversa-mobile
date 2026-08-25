/**
 * Write "What to Test" onto the build EAS just submitted to TestFlight.
 *
 * `eas submit` uploads the binary but leaves the tester-facing notes empty, so
 * testers see a build with no explanation of what changed. This fills them in
 * from the same commit-derived notes Play gets.
 *
 * The build is not addressable the moment the upload finishes — Apple has to
 * finish processing first — so this polls for it by build number.
 *
 * Environment:
 *   ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY_P8  (the .p8 contents)
 *   BUILD_NUMBER, NOTES_FILE
 */
import crypto from 'crypto';
import fs from 'fs';

const APP_ID = '6803820193';
const KEY_ID = process.env.ASC_KEY_ID;
const ISSUER = process.env.ASC_ISSUER_ID;
const PRIVATE_KEY = process.env.ASC_API_KEY_P8;
const BUILD_NUMBER = String(process.env.BUILD_NUMBER || '').trim();
const NOTES_FILE = process.env.NOTES_FILE || 'build-output/notes-long.txt';

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/** ES256 JWT. Node signs to DER; JOSE wants the raw r||s pair. */
function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: ISSUER, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1',
  }));
  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${payload}`);
  const der = signer.sign(PRIVATE_KEY);

  let offset = 2;
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f);
  const rLength = der[offset + 1];
  const r = der.subarray(offset + 2, offset + 2 + rLength);
  const sOffset = offset + 2 + rLength;
  const s = der.subarray(sOffset + 2, sOffset + 2 + der[sOffset + 1]);
  const pad = (buf) => {
    const trimmed = buf.length > 32 ? buf.subarray(buf.length - 32) : buf;
    const out = Buffer.alloc(32);
    trimmed.copy(out, 32 - trimmed.length);
    return out;
  };
  return `${header}.${payload}.${b64url(Buffer.concat([pad(r), pad(s)]))}`;
}

async function api(method, path, body) {
  const res = await fetch('https://api.appstoreconnect.apple.com/' + path, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}

const notes = fs.existsSync(NOTES_FILE) ? fs.readFileSync(NOTES_FILE, 'utf8').trim() : '';
if (!notes) {
  console.log('not dosyası boş, atlanıyor');
  process.exit(0);
}

let build = null;
for (let attempt = 0; attempt < 30; attempt++) {
  const res = await api('GET',
    `v1/builds?filter[app]=${APP_ID}&filter[version]=${BUILD_NUMBER}&limit=1` +
    '&fields[builds]=version,processingState');
  build = res.data?.[0];
  if (build && build.attributes.processingState === 'VALID') break;
  console.log(`build ${BUILD_NUMBER} bekleniyor... (${build?.attributes.processingState || 'henüz yok'})`);
  build = null;
  await new Promise((resolve) => setTimeout(resolve, 30000));
}

if (!build) {
  console.log(`build ${BUILD_NUMBER} işlenmesi zaman aşımına uğradı; notlar yazılamadı`);
  process.exit(0); // the binary is already in TestFlight — notes are not worth failing the run
}

const existing = await api('GET',
  `v1/builds/${build.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale`);
const row = existing.data?.find((l) => l.attributes.locale === 'en-US');

if (row) {
  await api('PATCH', `v1/betaBuildLocalizations/${row.id}`, {
    data: { type: 'betaBuildLocalizations', id: row.id, attributes: { whatsNew: notes } },
  });
  console.log('notlar güncellendi');
} else {
  await api('POST', 'v1/betaBuildLocalizations', {
    data: {
      type: 'betaBuildLocalizations',
      attributes: { locale: 'en-US', whatsNew: notes },
      relationships: { build: { data: { type: 'builds', id: build.id } } },
    },
  });
  console.log('notlar eklendi');
}
