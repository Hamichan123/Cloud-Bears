/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║   CLOUD BEARS · WAITLIST APPS SCRIPT                              ║
 * ║   Receives waitlist applications from apply.html and logs them   ║
 * ║   into a Google Sheet, with duplicate-protection on wallet & handle.║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 *  SETUP (5 minutes):
 *  ───────────────────────────────────────────────────────────────────
 *  1. Open https://sheets.google.com and create a new spreadsheet.
 *     Name it "Cloud Bears Waitlist" (or anything you like).
 *
 *  2. In that spreadsheet, click  Extensions → Apps Script.
 *
 *  3. Delete the default code and paste THIS ENTIRE FILE in.
 *
 *  4. Save (💾 icon). Give the project a name like "CloudBearsWaitlist".
 *
 *  5. Click  Deploy → New deployment.
 *      • Type:  Web app
 *      • Description:  Cloud Bears Waitlist v1
 *      • Execute as:  Me
 *      • Who has access:  Anyone
 *     Click  Deploy. Authorize when prompted.
 *
 *  6. Copy the "Web app URL" Google gives you. Paste it into apply.html
 *     at the line:    const APPS_SCRIPT_URL = '';
 *
 *  7. Done. Submit a test application — a row appears in your sheet.
 *
 *  HEADERS are created automatically on first run.
 */


/* ─────────────────  CONFIG  ─────────────────── */
const CONFIG = {
  SHEET_NAME: 'Applications',          // Tab name inside the spreadsheet
  STATUS_DEFAULT: 'Pending Review',    // Default status for new applications
  ENABLE_EMAIL_NOTIFICATION: false,    // Set true to receive an email per submission
  NOTIFY_EMAIL: 'you@example.com',     // Where to send the notification email
  PREVENT_DUPLICATE_WALLETS: true,     // Reject if wallet already exists
  PREVENT_DUPLICATE_HANDLES: true      // Reject if X handle already exists
};

const HEADERS = [
  'Timestamp',
  'Ticket ID',
  'X Handle',
  'Liked + Retweeted',
  'Comment Link',
  'Wallet Address',
  'User Agent',
  'IP (best effort)',
  'Status'
];


/* ─────────────────  POST HANDLER  ─────────────── */
function doPost(e) {
  return handleSubmission_((e && e.parameter) || {});
}


/* ----------------- SUBMISSION HANDLER ----------------- */
function handleSubmission_(params) {
  try {
    const sheet = getSheet_();

    // ── Pull fields ─────────────────────────────────
    const handle       = sanitize_(params.handle || '');
    const liked        = sanitize_(params.likedRetweeted || 'No');
    const commentLink  = sanitize_(params.commentLink || '');
    const wallet       = sanitize_(params.wallet || '');
    const ticketId     = sanitize_(params.ticketId || ('CB-' + Date.now().toString().slice(-6)));
    const submittedAt  = params.submittedAt || new Date().toISOString();
    const userAgent    = sanitize_(params.userAgent || '');

    // ── Validation ──────────────────────────────────
    if (!handle)      return jsonResponse_({ ok:false, error:'Missing X handle.' });
    if (!commentLink) return jsonResponse_({ ok:false, error:'Missing comment link.' });
    if (!wallet)      return jsonResponse_({ ok:false, error:'Missing wallet address.' });

    if (!isValidHandle_(handle)) {
      return jsonResponse_({ ok:false, error:'Invalid X handle.' });
    }
    if (!isValidTweetUrl_(commentLink)) {
      return jsonResponse_({ ok:false, error:'Invalid comment link.' });
    }
    if (!isValidWallet_(wallet)) {
      return jsonResponse_({ ok:false, error:'Invalid wallet address.' });
    }

    // ── Duplicate checks ────────────────────────────
    const allData = sheet.getDataRange().getValues();
    if (CONFIG.PREVENT_DUPLICATE_WALLETS && hasDuplicate_(allData, 5, wallet.toLowerCase())) {
      return jsonResponse_({ ok:false, error:'This wallet has already applied.' });
    }
    if (CONFIG.PREVENT_DUPLICATE_HANDLES && hasDuplicate_(allData, 2, handle.toLowerCase())) {
      return jsonResponse_({ ok:false, error:'This X handle has already applied.' });
    }

    // ── Append row ──────────────────────────────────
    sheet.appendRow([
      new Date(submittedAt),
      ticketId,
      handle,
      liked,
      commentLink,
      wallet,
      userAgent,
      '', // IP not directly available in Apps Script web apps
      CONFIG.STATUS_DEFAULT
    ]);

    // optional email notification
    if (CONFIG.ENABLE_EMAIL_NOTIFICATION && CONFIG.NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail({
          to: CONFIG.NOTIFY_EMAIL,
          subject: `🐻 New Cloud Bears waitlist application — ${handle}`,
          htmlBody:
            `<h2>New Waitlist Application</h2>` +
            `<p><b>Ticket:</b> ${ticketId}</p>` +
            `<p><b>X Handle:</b> @${handle}</p>` +
            `<p><b>Wallet:</b> ${wallet}</p>` +
            `<p><b>Comment Link:</b> <a href="${commentLink}">${commentLink}</a></p>` +
            `<p><b>Liked + Retweeted:</b> ${liked}</p>`
        });
      } catch(mailErr) {
        // Email failure shouldn't block the submission
        Logger.log('Mail error: ' + mailErr);
      }
    }

    return jsonResponse_({ ok:true, ticketId: ticketId });

  } catch (err) {
    Logger.log('submission error: ' + err);
    return jsonResponse_({ ok:false, error: String(err) });
  }
}


/* ─────────────────  GET HANDLER (health check)  ── */
function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.handle || params.wallet || params.commentLink || params.ticketId) {
    return handleSubmission_(params);
  }

  return jsonResponse_({
    ok: true,
    service: 'Cloud Bears Waitlist',
    version: '1.0',
    time: new Date().toISOString()
  });
}


/* ─────────────────  SHEET HELPERS  ───────────── */
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  // ensure headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange
      .setFontWeight('bold')
      .setBackground('#1F1A17')
      .setFontColor('#FFF8EE');
    sheet.setFrozenRows(1);
    // sensible column widths
    sheet.setColumnWidth(1, 180); // timestamp
    sheet.setColumnWidth(2, 120); // ticket
    sheet.setColumnWidth(3, 160); // handle
    sheet.setColumnWidth(4, 140); // liked
    sheet.setColumnWidth(5, 280); // comment
    sheet.setColumnWidth(6, 320); // wallet
    sheet.setColumnWidth(7, 220); // UA
    sheet.setColumnWidth(8, 120); // ip
    sheet.setColumnWidth(9, 140); // status
  }
  return sheet;
}

function hasDuplicate_(rows, columnIndex, valueLower) {
  // columnIndex is 1-based to match the user's mental model of sheet columns
  for (let i = 1; i < rows.length; i++) {
    const cell = String(rows[i][columnIndex - 1] || '').toLowerCase();
    if (cell === valueLower) return true;
  }
  return false;
}


/* ─────────────────  VALIDATION  ─────────────── */
function isValidHandle_(h) {
  return /^[A-Za-z0-9_]{1,15}$/.test(h);
}
function isValidTweetUrl_(u) {
  return /^https?:\/\/(www\.)?(x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/i.test(u);
}
function isValidWallet_(w) {
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(w);
  const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w);
  return isEvm || isSol;
}

function sanitize_(v) {
  return String(v).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 500);
}


/* ─────────────────  RESPONSE  ───────────────── */
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ─────────────────  MAINTENANCE TOOLS  ───────── */
/**
 *  Run this once manually from the Apps Script editor to test that
 *  the sheet writes correctly. After running, check the "Applications"
 *  tab — you should see a test row at the bottom.
 */
function testInsert() {
  const fakeEvent = {
    parameter: {
      handle: 'test_user',
      likedRetweeted: 'Yes',
      commentLink: 'https://x.com/test_user/status/1234567890',
      wallet: '0x' + 'A'.repeat(40),
      ticketId: 'CB-TEST00',
      submittedAt: new Date().toISOString(),
      userAgent: 'Apps Script test'
    }
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}

/**
 *  Run this to wipe all applications (keeps headers).
 *  Use with care — destructive.
 */
function clearAllApplications() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
    Logger.log('Cleared ' + (lastRow - 1) + ' applications.');
  } else {
    Logger.log('Nothing to clear.');
  }
}

/**
 *  Quick stats — run from the editor and view the Log.
 */
function showStats() {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const total = data.length - 1;
  let pending = 0, approved = 0, rejected = 0;
  for (let i = 1; i < data.length; i++) {
    const status = String(data[i][8] || '').toLowerCase();
    if (status.indexOf('pending') >= 0) pending++;
    else if (status.indexOf('approved') >= 0) approved++;
    else if (status.indexOf('reject') >= 0) rejected++;
  }
  Logger.log('Total: %s  ·  Pending: %s  ·  Approved: %s  ·  Rejected: %s',
             total, pending, approved, rejected);
}
