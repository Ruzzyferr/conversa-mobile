/**
 * Report the outcome of a release run.
 *
 * GitHub only e-mails the account owner about *failed* runs by default, and
 * says nothing at all when a release goes out — which is the case you most want
 * to see, because it is the one that put a build in front of testers.
 *
 * E-mail goes through Resend (the backend already uses it, and noreply@swiip.app
 * is a verified sender). Telegram is sent too when TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID exist; without them that half is skipped silently.
 *
 * Never fails the run: a missed notification is not worth burying a successful
 * release under a red X.
 */
import fs from 'fs';

const {
  RESEND_API_KEY, NOTIFY_EMAIL, NOTIFY_FROM,
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
  RUN_RESULT = 'unknown',
  VERSION_NAME = '?', VERSION_CODE = '?', BUILD_NUMBER = '?',
  PLAY_DONE = 'false', IOS_DONE = 'false',
  RUN_URL = '', GITHUB_SHA = '', COMMIT_SUBJECT = '',
} = process.env;

const ok = RUN_RESULT === 'success';
const notes = (() => {
  try {
    return fs.readFileSync('build-output/notes-short.txt', 'utf8').trim();
  } catch {
    return '';
  }
})();

const shipped = [
  PLAY_DONE === 'true' ? `Play kapalı test — Android ${VERSION_CODE}` : null,
  IOS_DONE === 'true' ? `TestFlight — iOS build ${BUILD_NUMBER}` : null,
].filter(Boolean);

const headline = ok
  ? (shipped.length ? `Conversa ${VERSION_NAME} teste gitti` : `Conversa ${VERSION_NAME} derlendi`)
  : `Conversa ${VERSION_NAME} sürümü başarısız`;

const lines = [
  headline,
  '',
  shipped.length ? shipped.map((s) => `• ${s}`).join('\n') : '• Hiçbir mağazaya gönderilmedi',
  '',
  COMMIT_SUBJECT ? `Commit: ${COMMIT_SUBJECT} (${GITHUB_SHA.slice(0, 7)})` : '',
  notes ? `\nSürüm notları:\n${notes}` : '',
  '',
  RUN_URL,
].filter((l) => l !== '').join('\n');

async function sendEmail() {
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) {
    console.log('e-posta atlandı (secret yok)');
    return;
  }
  const body = {
    from: NOTIFY_FROM || 'Conversa CI <noreply@swiip.app>',
    to: [NOTIFY_EMAIL],
    subject: `${ok ? '✅' : '❌'} ${headline}`,
    text: lines,
  };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('e-posta:', res.status, (await res.text()).slice(0, 200));
}

async function sendTelegram() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('telegram atlandı (secret yok)');
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: `${ok ? '✅' : '❌'} ${lines}`,
      disable_web_page_preview: true,
    }),
  });
  console.log('telegram:', res.status, (await res.text()).slice(0, 200));
}

for (const send of [sendEmail, sendTelegram]) {
  try {
    await send();
  } catch (error) {
    console.log('bildirim gönderilemedi:', error.message);
  }
}
