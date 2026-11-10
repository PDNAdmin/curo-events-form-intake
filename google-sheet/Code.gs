/**
 * Curo Events sign-ups → Google Sheet (+ emails).
 *
 * Paste this whole file into the spreadsheet's Extensions → Apps Script,
 * then Deploy → New deployment → Web app (see README). Every sign-up from the
 * page becomes a new row. It can also send the person their "how to get
 * started" email and tell you about the sign-up, from your Google account.
 */

// ------------------------------------------------------------------ settings

const SHEET_NAME = 'Sign-ups';

// Send the "how to get started" email to the person who signed up.
const SEND_WELCOME = true;

// Email yourself about each new sign-up. Leave '' to turn this off.
const NOTIFY_TO = ''; // e.g. 'hello@curo.events'

const FROM_NAME = 'Curo Events';
const REPLY_TO = ''; // where replies to the welcome email go; '' = this Google account

// The welcome email. TODO: the Curo team should check the steps.
const WELCOME_SUBJECT = 'Your life impact form: how to get started';
const WELCOME_LINES = [
  'Hi {first},',
  '',
  'Thank you for asking about a life impact form from Curo Events. Here is how it works:',
  '',
  '1. Reply to this email and tell us who the form is for: your family, yourself or someone close to you, and the occasion.',
  '2. We plan the questions with you, so they fit the person and the people who will answer.',
  '3. We build your form and send you the link to share. You get a results page with every story, photo and answer.',
  '',
  'Just reply to this email when you are ready, and we will take it from there.',
  '',
  'The Curo Events team',
];

// ------------------------------------------------------------------ the web app

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  let data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply({ ok: false, error: 'bad request' });
  }
  const name = String(data.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const email = String(data.email || '').trim().toLowerCase().slice(0, 120);
  const source = String(data.source || 'direct').slice(0, 200);
  if (!name || !EMAIL.test(email)) return reply({ ok: false, error: 'check name and email' });
  if (data.website) return reply({ ok: true }); // hidden field filled: a bot

  // One write at a time, so two sign-ups at once can't collide.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let repeat = false;
  try {
    const sheet = getSheet();
    const last = sheet.getLastRow();
    if (last > 1) {
      const known = sheet.getRange(2, 3, last - 1, 1).getValues().flat().map(String);
      repeat = known.indexOf(email) !== -1;
    }
    sheet.appendRow([new Date(), name, email, source, repeat ? 'Signed up before' : '']);
  } finally {
    lock.releaseLock();
  }

  // Emails never block the row: the sign-up is already saved.
  try {
    if (SEND_WELCOME && !repeat) {
      const first = name.split(' ')[0];
      const options = { name: FROM_NAME };
      if (REPLY_TO) options.replyTo = REPLY_TO;
      MailApp.sendEmail(email, WELCOME_SUBJECT, WELCOME_LINES.join('\n').replace('{first}', first), options);
    }
    if (NOTIFY_TO) {
      MailApp.sendEmail(NOTIFY_TO, 'New life impact form sign-up: ' + name,
        'Name: ' + name + '\nEmail: ' + email + '\nFrom page: ' + source + (repeat ? '\n(Signed up before)' : ''),
        { name: FROM_NAME, replyTo: email });
    }
  } catch (err) {
    console.error(err);
  }
  return reply({ ok: true });
}

// Opening the web app link in a browser shows this, so you can check it's live.
function doGet() {
  return reply({ ok: true, message: 'Curo sign-ups are connected.' });
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Time', 'Name', 'Email', 'From page', 'Note']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (select "setup", press Run) to create the
// sheet's header row and give the script permission to use Sheets and Gmail.
function setup() {
  getSheet();
  MailApp.getRemainingDailyQuota();
}
