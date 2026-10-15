/**
 * DailyFlow - Google Apps Script backend (Google Sheet as database)
 *
 * SETUP
 * 1. Create a Google Sheet. Open Extensions > Apps Script and paste this file.
 * 2. Change TOKEN below to your own secret (same value goes in .env as VITE_TOKEN).
 * 3. Run the setup() function once and accept the permissions. It creates the 4 tabs.
 * 4. Deploy > New deployment > type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 *    Copy the Web app URL (ends with /exec) into .env as VITE_SCRIPT_URL.
 * 5. After any later edit to this file: Deploy > Manage deployments > Edit > New version.
 */

const TOKEN = 'change-this-secret';

const SHEETS = {
  tasks:    { name: 'Tasks',    cols: ['id', 'title', 'type', 'date', 'time', 'done', 'notes', 'createdAt', 'updatedAt'] },
  diet:     { name: 'Diet',     cols: ['id', 'date', 'meal', 'items', 'updatedAt'] },
  learning: { name: 'Learning', cols: ['id', 'title', 'topic', 'date', 'done', 'createdAt', 'updatedAt'] },
  gym:      { name: 'Gym',      cols: ['id', 'date', 'cardio', 'strength', 'updatedAt'] }
};

/** Run once manually to create all tabs with headers. */
function setup() {
  Object.keys(SHEETS).forEach(getSheet_);
}

function doGet(e) {
  try {
    if (!e || !e.parameter || e.parameter.token !== TOKEN) return out_({ ok: false, error: 'Unauthorized' });
    const data = {};
    Object.keys(SHEETS).forEach(function (k) { data[k] = readTable_(k); });
    return out_({ ok: true, data: data });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    lock.waitLock(20000);
    locked = true;
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return out_({ ok: false, error: 'Unauthorized' });
    (body.ops || []).forEach(function (op) {
      if (!SHEETS[op.table]) return;
      if (op.op === 'upsert') upsert_(op.table, op.row);
      else if (op.op === 'delete') remove_(op.table, op.id);
    });
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ---------- helpers ---------- */

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(key) {
  const cfg = SHEETS[key];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(cfg.name);
  if (!sh) {
    sh = ss.insertSheet(cfg.name);
    sh.getRange(1, 1, 1, cfg.cols.length)
      .setValues([cfg.cols]).setFontWeight('bold').setBackground('#8b6cff').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    // plain text format so dates/booleans are never auto-converted
    sh.getRange(1, 1, sh.getMaxRows(), cfg.cols.length).setNumberFormat('@');
  }
  return sh;
}

function readTable_(key) {
  const cfg = SHEETS[key];
  const sh = getSheet_(key);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, last - 1, cfg.cols.length).getValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      const o = {};
      cfg.cols.forEach(function (c, i) {
        let v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        o[c] = String(v);
      });
      return o;
    });
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function upsert_(key, row) {
  const cfg = SHEETS[key];
  const sh = getSheet_(key);
  row.updatedAt = new Date().toISOString();
  const values = cfg.cols.map(function (c) { return row[c] === undefined || row[c] === null ? '' : String(row[c]); });
  const idx = findRow_(sh, row.id);
  if (idx > 0) sh.getRange(idx, 1, 1, cfg.cols.length).setValues([values]);
  else sh.appendRow(values);
}

function remove_(key, id) {
  const sh = getSheet_(key);
  const idx = findRow_(sh, id);
  if (idx > 0) sh.deleteRow(idx);
}
