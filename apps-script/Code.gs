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
const EMAIL = 'naveenofficial098@gmail.com'; // reminders are sent here

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


/* =====================================================================
 * EMAIL REMINDERS
 * Run installReminders() ONCE from the editor (accept the Gmail/send-mail permission).
 *   07:00 every day  -> Morning plan (pending first, then today's schedule)
 *   21:00 every day  -> Evening check (what is still open, diet + gym status)
 *   Sunday 20:00     -> Weekly review (consistency score)
 * Change the hours below if you like, then run installReminders() again.
 * ===================================================================== */

function installReminders() {
  ['sendMorningPlan', 'sendEveningCheck', 'sendWeeklyReview'].forEach(function (fn) {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === fn) ScriptApp.deleteTrigger(t); });
  });
  ScriptApp.newTrigger('sendMorningPlan').timeBased().everyDays(1).atHour(7).create();
  ScriptApp.newTrigger('sendEveningCheck').timeBased().everyDays(1).atHour(21).create();
  ScriptApp.newTrigger('sendWeeklyReview').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(20).create();
}

function day_(offset) {
  const d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function yes_(v) { return String(v).toLowerCase() === 'true'; }

function snapshot_() {
  const today = day_(0);
  const tasks = readTable_('tasks'), learn = readTable_('learning'), diet = readTable_('diet'), gym = readTable_('gym');
  const byTime = function (a, b) { return (a.time || '99:99').localeCompare(b.time || '99:99'); };
  const g = gym.filter(function (r) { return r.date === today; })[0];
  const gymDay = function (d) { const r = gym.filter(function (x) { return x.date === d; })[0]; return r && (yes_(r.cardio) || yes_(r.strength)); };
  let streak = 0;
  for (let i = gymDay(today) ? 0 : 1; i < 60 && gymDay(day_(-i)); i++) streak++;

  // 7-day consistency: share of planned tasks + lessons finished
  let planned = 0, finished = 0, gymDays = 0, mealsDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = day_(-i);
    tasks.concat(learn).forEach(function (r) { if (r.date === d) { planned++; if (yes_(r.done)) finished++; } });
    if (gymDay(d)) gymDays++;
    if (diet.some(function (r) { return r.date === d && r.items; })) mealsDays++;
  }
  return {
    today: today,
    todayTasks: tasks.filter(function (t) { return t.date === today; }).sort(byTime),
    todayLearn: learn.filter(function (l) { return l.date === today; }),
    lateTasks: tasks.filter(function (t) { return t.date < today && !yes_(t.done); }),
    lateLearn: learn.filter(function (l) { return l.date < today && !yes_(l.done); }),
    meals: diet.filter(function (r) { return r.date === today && r.items; }).length,
    cardio: !!g && yes_(g.cardio), strength: !!g && yes_(g.strength),
    streak: streak, gymDays: gymDays, mealsDays: mealsDays,
    consistency: planned ? Math.round(finished / planned * 100) : 0, planned: planned, finished: finished
  };
}

const QUOTES_ = [
  'Small steps every day beat big plans someday.',
  'Do the pending work first. Future you will thank you.',
  'You do not need motivation. You need the next tiny action.',
  'Consistency is just showing up when you do not feel like it.',
  'One focused hour is worth more than a distracted day.',
  'Discipline is choosing what you want most over what you want now.',
  'Finish what you started yesterday, then start something new.'
];
function quote_() { return QUOTES_[new Date().getDay() % QUOTES_.length]; }

function list_(title, color, items) {
  if (!items.length) return '';
  return '<h3 style="margin:22px 0 8px;color:' + color + '">' + title + '</h3><ul style="padding-left:20px;margin:0;line-height:1.7">' +
    items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
}
function taskLine_(t) { return (t.time ? '<b>' + t.time + '</b> ' : '') + t.title + ' <span style="color:#888">(' + t.type + ')</span>'; }
function lateLine_(r) { return r.title + ' <span style="color:#d33">- planned ' + r.date + '</span>'; }

function wrap_(heading, body) {
  return '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#14102b;color:#fff4e0;border-radius:18px">' +
    '<h2 style="margin:0 0 6px">' + heading + '</h2>' + body +
    '<p style="margin-top:26px;padding:14px;border-radius:12px;background:rgba(255,197,49,.15);color:#ffc531"><i>' + quote_() + '</i></p></div>';
}

function sendMorningPlan() {
  const s = snapshot_();
  const late = s.lateTasks.map(lateLine_).concat(s.lateLearn.map(lateLine_));
  const body =
    list_('Clear these first (' + late.length + ')', '#ff5d73', late) +
    list_("Today's schedule", '#ffc531', s.todayTasks.map(taskLine_)) +
    list_('Learning today', '#b9a6ff', s.todayLearn.map(function (l) { return l.title + (l.topic ? ' (' + l.topic + ')' : ''); })) +
    '<p style="margin-top:20px">Also today: log your 4 meals and finish cardio + strength. Gym streak: <b>' + s.streak + ' days</b>.</p>';
  MailApp.sendEmail({ to: EMAIL, subject: (late.length ? '⚠️ ' + late.length + ' pending - ' : '☀️ ') + "Your plan for today", htmlBody: wrap_('☀️ Good morning, Naveen', body || '<p>Nothing planned yet. Open DailyFlow and plan your day.</p>') });
}

function sendEveningCheck() {
  const s = snapshot_();
  const open = s.todayTasks.filter(function (t) { return !yes_(t.done); }).map(taskLine_)
    .concat(s.todayLearn.filter(function (l) { return !yes_(l.done); }).map(function (l) { return l.title; }));
  const late = s.lateTasks.map(lateLine_).concat(s.lateLearn.map(lateLine_));
  const body =
    list_('Still open today (' + open.length + ')', '#ffc531', open) +
    list_('Overdue from earlier (' + late.length + ')', '#ff5d73', late) +
    '<p style="margin-top:20px;line-height:1.8">Meals logged: <b>' + s.meals + '/4</b><br>Cardio: <b>' + (s.cardio ? 'done' : 'not yet') + '</b><br>Strength: <b>' + (s.strength ? 'done' : 'not yet') + '</b></p>' +
    '<p>Anything unfinished moves to tomorrow\'s pending list. Tick what you did and plan tomorrow in 2 minutes.</p>';
  MailApp.sendEmail({ to: EMAIL, subject: (open.length + late.length ? '🌙 ' + (open.length + late.length) + ' still open' : '🌙 All clear today') + ' - evening check', htmlBody: wrap_('🌙 Evening check', body) });
}

function sendWeeklyReview() {
  const s = snapshot_();
  const body =
    '<p style="font-size:42px;margin:14px 0 4px;font-weight:bold">' + s.consistency + '%</p>' +
    '<p style="margin:0">of planned tasks and lessons finished in the last 7 days (' + s.finished + ' of ' + s.planned + ').</p>' +
    '<p style="margin-top:18px;line-height:1.8">Workout days: <b>' + s.gymDays + '/7</b><br>Days you logged food: <b>' + s.mealsDays + '/7</b><br>Gym streak: <b>' + s.streak + ' days</b><br>Still pending: <b>' + (s.lateTasks.length + s.lateLearn.length) + '</b></p>' +
    '<p>Pick the one habit you missed most and put it in tomorrow\'s first slot.</p>';
  MailApp.sendEmail({ to: EMAIL, subject: '📊 Weekly review - ' + s.consistency + '% consistency', htmlBody: wrap_('📊 Your week', body) });
}

/** Run once to test that email works. */
function testEmail() { sendMorningPlan(); }
