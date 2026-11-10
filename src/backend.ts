// Sends a sign-up to the Google Sheet. A small Apps Script attached to the
// sheet (google-sheet/Code.gs) adds a row and sends the emails. Setup: README.
// Without SHEET_URL it runs in test mode (saved in this browser only).

export type Lead = { name: string; email: string };

const SHEET_URL = import.meta.env.SHEET_URL as string | undefined;
export const testMode = !SHEET_URL;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
class Refused extends Error {}

async function once(lead: Lead) {
  // text/plain keeps this a "simple" request, which Apps Script accepts from any site.
  const res = await fetch(SHEET_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...lead, source: document.referrer || 'direct' }),
  });
  if (!res.ok) throw new Error(`Sheet ${res.status}`);
  const out = await res.json().catch(() => ({ ok: false }));
  if (!out.ok) throw new Refused(out.error || 'refused');
}

export async function saveLead(lead: Lead) {
  if (testMode) {
    await wait(500);
    const list = JSON.parse(localStorage.getItem('curo-leads') || '[]');
    list.push({ ...lead, createdAt: new Date().toISOString() });
    localStorage.setItem('curo-leads', JSON.stringify(list));
    return;
  }
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await once(lead);
    } catch (e) {
      last = e;
      if (e instanceof Refused) break; // the same input would be refused again
      await wait(700 * 2 ** i);
    }
  }
  throw last;
}
