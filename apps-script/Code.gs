/**
 * House of Amrut — reservation requests
 * Saves each request from the website as a row in this Google Sheet
 * and emails a notification. Setup steps are in apps-script/README.md.
 */

// ---- Settings -------------------------------------------------------------
// Who gets the email. Separate several addresses with commas.
const NOTIFY_EMAIL = 'you@example.com';
const SHEET_NAME = 'Reservations';
const TIMEZONE = 'America/New_York';

// Keep these in step with the top of assets/main.js.
const OPEN_DAYS = [4, 5, 6];        // 0 = Sunday … 6 = Saturday. Thursday to Saturday.
const FIRST_SEATING = 19 * 60;      // 7:00 PM, minutes after midnight
const LAST_SEATING = 25 * 60;       // 1:00 AM
const MAX_DAYS_AHEAD = 45;          // the site shows about three weeks; a little slack
const PARTY_SIZES = ['1', '2', '3', '4', '5', '6', '7', '8+ guests'];
const EXPERIENCES = ['', 'Tasting Room', 'Guided Journey', 'Private Event'];

// Spam limits. A burst of fake requests could otherwise use up the
// daily email quota (about 100 on a free Gmail account).
const MAX_PER_EMAIL_PER_HOUR = 3;
const MAX_PER_HOUR = 30;
// ---------------------------------------------------------------------------

const HEADERS = ['Received', 'Name', 'Email', 'Phone', 'Party size', 'Date', 'Time',
                 'Experience', 'Special requests', 'Status'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ ok: false, error: 'Busy, please try again' });
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!d || typeof d !== 'object') return reply({ ok: false, error: 'Bad request' });

    // Spam trap: real guests never fill the hidden "website" field.
    if (d.website) return reply({ ok: true });

    const row = {
      name: line(d.name, 120), email: line(d.email, 160), phone: line(d.phone, 40),
      party: line(d.partySize, 20), date: line(d.date, 10), time: line(d.time, 20),
      experience: line(d.experience, 60), notes: clean(d.notes, 1500)
    };

    const missing = ['name', 'email', 'party', 'date', 'time'].filter(k => !row[k]);
    if (missing.length) return reply({ ok: false, error: 'Missing: ' + missing.join(', ') });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return reply({ ok: false, error: 'Invalid email' });
    if (PARTY_SIZES.indexOf(row.party) === -1) return reply({ ok: false, error: 'Invalid party size' });
    if (EXPERIENCES.indexOf(row.experience) === -1) return reply({ ok: false, error: 'Invalid experience' });
    if (seatingTimes().indexOf(row.time) === -1) return reply({ ok: false, error: 'Invalid time' });
    const dateLabel = checkDate(row.date);
    if (!dateLabel) return reply({ ok: false, error: 'Invalid date' });

    if (!underLimit('all', MAX_PER_HOUR) ||
        !underLimit('email:' + row.email.toLowerCase(), MAX_PER_EMAIL_PER_HOUR)) {
      return reply({ ok: false, error: 'Too many requests, please try again later' });
    }

    getSheet().appendRow([new Date(), safe(row.name), safe(row.email), safe(row.phone), safe(row.party),
                          dateLabel, safe(row.time), safe(row.experience) || '—', safe(row.notes), 'New']);

    // The request is saved. A failed email (e.g. quota used up) shouldn't make the
    // guest see an error and send it again.
    try {
      notify(row, dateLabel);
    } catch (mailErr) {
      console.error('Email failed', mailErr);
    }

    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'Server error' });
  } finally {
    lock.releaseLock();
  }
}

function notify(row, dateLabel) {
  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const subject = `Reservation request: ${row.name}, ${dateLabel} at ${row.time}, party of ${row.party}`;
  const lines = [
    ['Name', row.name], ['Email', row.email], ['Phone', row.phone || '—'],
    ['Party size', row.party], ['Date', dateLabel], ['Time', row.time],
    ['Experience', row.experience || '—'], ['Special requests', row.notes || '—']
  ];
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: row.email, // hit Reply to answer the guest directly
    subject: subject,
    body: lines.map(l => l[0] + ': ' + l[1]).join('\n') + '\n\nAll requests: ' + sheetUrl,
    htmlBody:
      '<table style="font-family:Georgia,serif;font-size:15px;border-collapse:collapse">' +
      lines.map(l => `<tr><td style="padding:6px 16px 6px 0;color:#8a733e;vertical-align:top">${l[0]}</td>` +
                     `<td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(l[1])}</td></tr>`).join('') +
      '</table><p style="font-family:Georgia,serif;font-size:13px;color:#888;margin-top:20px">' +
      'Reply to this email to answer the guest. ' +
      `<a href="${sheetUrl}">Open all requests</a></p>`
  });
}

// Visiting the web-app URL in a browser shows this, so you can check it's live.
function doGet() {
  return reply({ ok: true, service: 'House of Amrut reservations' });
}

// Run this once from the editor to create the sheet tab and allow email sending.
function setup() {
  getSheet();
  MailApp.getRemainingDailyQuota();
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.getRange('J2:J').setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['New', 'Confirmed', 'Declined', 'Cancelled'], true).build());
  }
  return sh;
}

// The same time labels the website offers ("7:00 PM" … "1:00 AM").
function seatingTimes() {
  const out = [];
  for (let m = FIRST_SEATING; m <= LAST_SEATING; m += 30) {
    const h = Math.floor(m / 60) % 24, mm = m % 60;
    out.push((h % 12 || 12) + ':' + String(mm).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM'));
  }
  return out;
}

// A real calendar date (YYYY-MM-DD) on an open night, from yesterday (allows for guests in
// other time zones) up to MAX_DAYS_AHEAD. Returns a label like "Fri 6 Nov 2026", or null.
function checkDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (day.getUTCFullYear() !== +m[1] || day.getUTCMonth() !== +m[2] - 1 || day.getUTCDate() !== +m[3]) return null;
  if (OPEN_DAYS.indexOf(day.getUTCDay()) === -1) return null;
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd').split('-');
  const todayUtc = Date.UTC(+today[0], +today[1] - 1, +today[2]);
  const diff = Math.round((day.getTime() - todayUtc) / 86400000);
  if (diff < -1 || diff > MAX_DAYS_AHEAD) return null;
  return Utilities.formatDate(day, 'UTC', 'EEE d MMM yyyy');
}

// Counts requests per key in a one-hour window. Returns false once the limit is reached.
function underLimit(key, max) {
  const cache = CacheService.getScriptCache();
  const k = 'rl:' + Utilities.base64EncodeWebSafe(key).slice(0, 200);
  const n = Number(cache.get(k) || 0);
  if (n >= max) return false;
  cache.put(k, String(n + 1), 3600);
  return true;
}

// Trim and cap length. Keeps line breaks (for the notes field).
function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
}

// Single-line fields: no line breaks or control characters at all.
function line(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, max);
}

// Stop text being read as a spreadsheet formula.
function safe(s) {
  return /^[=+\-@\t\r\n]/.test(s) ? "'" + s : s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
