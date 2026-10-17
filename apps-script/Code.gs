/**
 * DailyFlow - Google Apps Script backend (Google Sheet = database)
 * Also sends task reminders (Google Calendar + email) and the daily progress report.
 *
 * SETUP (first time or after updating this file)
 * 1. Paste this whole file into Extensions > Apps Script. Keep your own TOKEN value below.
 * 2. Run setup()            -> creates / upgrades the sheet tabs.
 * 3. Run installReminders() -> accept the Calendar + Gmail permissions. Installs the timers.
 * 4. Run testEmail()        -> you should get the daily report in your inbox.
 * 5. Deploy > Manage deployments > Edit > New version  (the web app URL stays the same).
 */

const TOKEN = 'change-this-secret';
const EMAIL = 'naveenofficial098@gmail.com';   // default address; the app's Settings screen can change it
const NAME = 'Naveen';

const SHEETS = {
  tasks:    { name: 'Tasks',    cols: ['id', 'title', 'type', 'date', 'time', 'done', 'notes', 'createdAt', 'updatedAt', 'remind', 'notify', 'eventId', 'reminded'] },
  diet:     { name: 'Diet',     cols: ['id', 'date', 'meal', 'items', 'updatedAt'] },
  learning: { name: 'Learning', cols: ['id', 'title', 'topic', 'date', 'done', 'createdAt', 'updatedAt'] },
  gym:      { name: 'Gym',      cols: ['id', 'date', 'cardio', 'strength', 'updatedAt'] },
  daily:    { name: 'Daily',    cols: ['id', 'date', 'water', 'sleep', 'weight', 'win', 'top3', 'focus', 'habits', 'updatedAt'], num: ['water', 'sleep', 'weight', 'focus'] },
  habits:   { name: 'Habits',   cols: ['id', 'title', 'emoji', 'days', 'time', 'start', 'active', 'updatedAt'] },
  finance:  { name: 'Finance',  cols: ['id', 'date', 'type', 'category', 'amount', 'account', 'toAccount', 'note', 'updatedAt'], num: ['amount'] },
  debts:    { name: 'Debts',    cols: ['id', 'person', 'direction', 'amount', 'paid', 'date', 'due', 'note', 'updatedAt'], num: ['amount', 'paid'] },
  accounts: { name: 'Accounts', cols: ['id', 'name', 'kind', 'opening', 'updatedAt'], num: ['opening'] },
  goals:    { name: 'Goals',    cols: ['id', 'name', 'emoji', 'target', 'saved', 'deadline', 'note', 'updatedAt'], num: ['target', 'saved'] },
  settings: { name: 'Settings', cols: ['id', 'kcal', 'protein', 'water', 'sleep', 'morningHour', 'reportHour', 'email', 'mailMorning', 'mailReport', 'updatedAt'], num: ['kcal', 'protein', 'water', 'sleep', 'morningHour', 'reportHour'] }
};

const NUTR_ = {"Idli":[120,4],"Dosa":[130,3],"Masala Dosa":[250,5],"Rava Dosa":[150,3],"Set Dosa":[200,5],"Pesarattu":[170,8],"Uttapam":[180,5],"Pongal":[240,6],"Ven Pongal":[240,6],"Upma":[200,5],"Rava Kichadi":[220,5],"Medu Vada":[280,8],"Poori":[300,5],"Poori Masala":[380,8],"Idiyappam":[200,4],"Appam":[180,3],"Puttu":[220,5],"Kuzhi Paniyaram":[200,5],"Ragi Dosa":[130,3],"Ragi Kali":[200,5],"Oats":[150,5],"Sambar":[90,4],"Coconut Chutney":[60,1],"Tomato Chutney":[40,1],"Podi + Oil":[70,2],"Kesari":[250,3],"Filter Coffee":[70,2],"Tea":[50,1],"Milk":[120,6],"Boiled Egg":[78,6],"Omelette":[130,9],"Banana":[105,1],"Rice":[200,4],"Sambar Rice":[320,10],"Rasam Rice":[280,6],"Curd Rice":[300,8],"Lemon Rice":[300,5],"Tamarind Rice":[320,5],"Tomato Rice":[300,5],"Coconut Rice":[330,5],"Bisi Bele Bath":[350,10],"Veg Biryani":[380,8],"Chicken Biryani":[500,25],"Mutton Biryani":[550,26],"Full Meals":[750,20],"Rasam":[40,1],"Vatha Kuzhambu":[110,3],"Mor Kuzhambu":[90,3],"Kara Kuzhambu":[110,3],"Kootu":[120,5],"Poriyal":[90,2],"Avial":[150,3],"Keerai":[80,4],"Beans Poriyal":[80,2],"Potato Fry":[180,2],"Fish Curry":[180,22],"Fish Fry":[250,24],"Chicken Curry":[250,25],"Chicken 65":[300,22],"Egg Curry":[200,12],"Mutton Curry":[300,24],"Appalam":[50,2],"Pickle":[30,0],"Buttermilk":[40,2],"Payasam":[250,5],"Chapati":[100,3],"Sundal":[140,7],"Mixed Sprouts":[120,8],"Boiled Corn":[130,4],"Masala Vada":[180,6],"Molaga Bajji":[150,3],"Onion Pakoda":[200,4],"Bonda":[180,3],"Samosa":[260,4],"Murukku":[150,2],"Mixture":[200,5],"Banana Chips":[150,1],"Peanuts":[170,7],"Roasted Chana":[120,7],"Poha":[180,4],"Fruit Bowl":[100,1],"Apple":[95,0],"Papaya":[60,1],"Almonds":[80,3],"Coconut Water":[45,0],"Sugarcane Juice":[180,0],"Protein Shake":[150,24],"Biscuits":[100,1],"Phulka":[80,3],"Parotta":[300,6],"Kothu Parotta":[450,14],"Kanji":[150,4],"Dal":[150,9],"Veg Kurma":[180,4],"Paneer Curry":[280,13],"Salna":[150,5],"Salad":[60,2],"Ragi Mudde":[200,5]};
const DEBT_CATS_ = ['Debt received', 'Borrowed money', 'Debt paid', 'Lent money'];

/* ===================== web app ===================== */

function setup() { Object.keys(SHEETS).forEach(getSheet_); }

function doGet(e) {
  try {
    if (!e || !e.parameter || e.parameter.token !== TOKEN) return out_({ ok: false, error: 'Unauthorized' });
    const data = {};
    Object.keys(SHEETS).forEach(function (k) { data[k] = readTable_(k); });
    return out_({ ok: true, data: data });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    lock.waitLock(25000); locked = true;
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return out_({ ok: false, error: 'Unauthorized' });
    const RUN = { sendDailyReport: sendDailyReport, sendMorningPlan: sendMorningPlan, sendWeeklyReview: sendWeeklyReview };
    (body.ops || []).forEach(function (op) {
      if (op.op === 'run') { if (RUN[op.fn]) RUN[op.fn](); return; }
      if (!SHEETS[op.table]) return;
      if (op.op === 'upsert') upsert_(op.table, op.row);
      else if (op.op === 'delete') remove_(op.table, op.id);
    });
    return out_({ ok: true });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
  finally { if (locked) lock.releaseLock(); }
}

/* ===================== sheet helpers ===================== */

function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function getSheet_(key) {
  const cfg = SHEETS[key];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(cfg.name);
  const isNum = function (c) { return (cfg.num || []).indexOf(c) >= 0; };
  if (!sh) {
    sh = ss.insertSheet(cfg.name);
    sh.getRange(1, 1, 1, cfg.cols.length).setValues([cfg.cols]).setFontWeight('bold').setBackground('#8b6cff').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    // plain text for dates/booleans so they are never auto-converted; money and counts stay numeric
    cfg.cols.forEach(function (c, i) { if (!isNum(c)) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
  } else if (sh.getLastColumn() < cfg.cols.length) {
    // upgrade an older sheet: add the new columns at the end
    for (let i = sh.getLastColumn() + 1; i <= cfg.cols.length; i++) {
      sh.getRange(1, i).setValue(cfg.cols[i - 1]).setFontWeight('bold').setBackground('#8b6cff').setFontColor('#ffffff');
      if (!isNum(cfg.cols[i - 1])) sh.getRange(1, i, sh.getMaxRows(), 1).setNumberFormat('@');
    }
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
        if (v instanceof Date) v = Utilities.formatDate(v, tz, c === 'time' ? 'HH:mm' : 'yyyy-MM-dd');
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
  const idx = findRow_(sh, row.id);
  if (key === 'tasks') {
    const old = idx > 0 ? String(sh.getRange(idx, cfg.cols.indexOf('eventId') + 1).getValue() || '') : '';
    syncCalendar_(row, old);          // creates / moves / removes the Google Calendar alert
  }
  const values = cfg.cols.map(function (c) {
    const v = row[c];
    if (v === undefined || v === null || v === '') return '';
    return (cfg.num || []).indexOf(c) >= 0 && !isNaN(Number(v)) ? Number(v) : String(v);
  });
  if (idx > 0) sh.getRange(idx, 1, 1, cfg.cols.length).setValues([values]);
  else sh.appendRow(values);
}

function remove_(key, id) {
  const sh = getSheet_(key);
  const idx = findRow_(sh, id);
  if (idx < 0) return;
  if (key === 'tasks') {
    try {
      const eid = String(sh.getRange(idx, SHEETS.tasks.cols.indexOf('eventId') + 1).getValue() || '');
      if (eid) { const ev = CalendarApp.getDefaultCalendar().getEventById(eid); if (ev) ev.deleteEvent(); }
    } catch (err) { console.error('calendar delete: ' + err); }
  }
  sh.deleteRow(idx);
}

/* ===================== time + settings helpers ===================== */

function yes_(v) { return String(v).toLowerCase() === 'true'; }
function num_(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function day_(offset) {
  const d = new Date(); d.setDate(d.getDate() + (offset || 0));
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function parseDT_(date, time) {
  const a = String(date).split('-').map(Number), b = String(time || '00:00').split(':').map(Number);
  return new Date(a[0], a[1] - 1, a[2], b[0] || 0, b[1] || 0).getTime();
}
function fmt12_(t) {
  if (!t) return '';
  const p = String(t).split(':').map(Number), h = p[0] || 0, m = p[1] || 0;
  return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
}
function remindText_(m) {
  const n = Number(m);
  return n === 0 ? 'at the scheduled time' : n < 60 ? n + ' min before' : n === 60 ? '1 hour before' : n === 1440 ? '1 day before' : n + ' min before';
}
function settings_() {
  const r = readTable_('settings').filter(function (x) { return x.id === 'main'; })[0] || {};
  const n = function (v, d) { return v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v); };
  const b = function (v, d) { return v === undefined || v === '' ? d : yes_(v); };
  return { kcal: n(r.kcal, 2000), protein: n(r.protein, 80), water: n(r.water, 8), sleep: n(r.sleep, 8), morningHour: n(r.morningHour, 7), reportHour: n(r.reportHour, 21), email: r.email || EMAIL, mailMorning: b(r.mailMorning, true), mailReport: b(r.mailReport, true) };
}

/* ===================== Google Calendar alerts ===================== */

function syncCalendar_(row, oldEventId) {
  try {
    const cal = CalendarApp.getDefaultCalendar();
    const eid = row.eventId || oldEventId;
    let ev = null;
    if (eid) { try { ev = cal.getEventById(eid); } catch (e) { ev = null; } }
    const rem = row.remind;
    const wants = row.time && rem !== undefined && rem !== null && String(rem) !== '' &&
      String(row.notify === undefined ? 'cal,mail' : row.notify).indexOf('cal') >= 0 && !yes_(row.done);
    if (!wants) { if (ev) ev.deleteEvent(); row.eventId = ''; return; }
    const start = new Date(parseDT_(row.date, row.time)), end = new Date(start.getTime() + 30 * 60000);
    const title = '\u23F0 ' + row.title;
    if (ev) { ev.setTitle(title); ev.setTime(start, end); }
    else ev = cal.createEvent(title, start, end, { description: 'Task from DailyFlow (' + (row.type || 'task') + ')' });
    ev.removeAllReminders();
    ev.addPopupReminder(Math.max(0, Number(rem)));
    if (Number(rem) > 0) ev.addPopupReminder(0);
    row.eventId = ev.getId();
  } catch (err) { console.error('calendar: ' + err); }
}

/* ===================== task reminder emails (runs every 5 minutes) ===================== */

function checkTaskReminders() {
  const cfg = SHEETS.tasks, sh = getSheet_('tasks'), last = sh.getLastRow();
  if (last < 2) return;
  const ix = function (c) { return cfg.cols.indexOf(c); };
  const vals = sh.getRange(2, 1, last - 1, cfg.cols.length).getValues();
  const S = settings_(), now = Date.now(), tz = Session.getScriptTimeZone();
  vals.forEach(function (r, i) {
    if (!r[0] || yes_(r[ix('done')]) || yes_(r[ix('reminded')])) return;
    const rem = r[ix('remind')];
    if (rem === '' || rem === null || rem === undefined) return;
    if (String(r[ix('notify')] || 'cal,mail').indexOf('mail') < 0) return;
    let date = r[ix('date')], time = r[ix('time')];
    if (date instanceof Date) date = Utilities.formatDate(date, tz, 'yyyy-MM-dd');
    if (time instanceof Date) time = Utilities.formatDate(time, tz, 'HH:mm');
    if (!date || !time) return;
    const due = parseDT_(date, String(time)), at = due - Number(rem) * 60000;
    if (now >= at && now <= due + 2 * 3600000) {
      const t = { title: r[ix('title')], type: r[ix('type')], time: String(time), date: String(date), remind: rem };
      MailApp.sendEmail({ to: S.email, name: 'DailyFlow', subject: '\u23F0 ' + t.title + ' \u00B7 ' + fmt12_(t.time), htmlBody: reminderHtml_(t, due, now) });
      sh.getRange(i + 2, ix('reminded') + 1).setValue('true');
    }
  });
}

function reminderHtml_(t, due, now) {
  const mins = Math.round((due - now) / 60000);
  const when = mins > 1 ? 'in ' + (mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min' : mins + ' min') : mins >= -1 ? 'right now' : Math.abs(mins) + ' min ago';
  return shell_(
    '<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;background-color:#d94a60;background-image:linear-gradient(135deg,#ff5d73,#ff8a4c)"><tr><td style="padding:28px 24px;text-align:center">' +
    '<div style="font-size:44px;line-height:1">\u23F0</div><div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:10px 0 6px;color:#fff4e0">Reminder \u00B7 ' + remindText_(t.remind) + '</div>' +
    '<div style="font-size:26px;font-weight:bold;color:#ffffff;line-height:1.25">' + esc_(t.title) + '</div>' +
    '<div style="margin-top:14px;display:inline-block;padding:8px 16px;border-radius:99px;background:rgba(20,16,43,.35);color:#fff4e0;font-size:15px">' + fmt12_(t.time) + ' \u00B7 ' + when + '</div>' +
    '</td></tr></table></td></tr>' +
    card_('Next step', '<div style="font-size:14px;line-height:1.6;color:#e9dfc8">Open DailyFlow, finish it and tick it off. Not now? Snooze it from the in-app alarm or move it to tomorrow.</div>', '#ffc531') +
    quoteRow_());
}

/* ===================== HTML email building blocks ===================== */

function shell_(inner) {
  return '<div style="margin:0;padding:18px 10px;background:#0f0c24"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#fff4e0">' + inner + '</table></div>';
}
function card_(title, body, accent) {
  return '<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f1946;border-radius:18px;border:1px solid #352d70"><tr><td style="padding:18px;color:#fff4e0;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="font-size:15px;font-weight:bold;color:' + (accent || '#fff4e0') + ';margin-bottom:12px">' + title + '</div>' + body + '</td></tr></table></td></tr>';
}
function bar_(pct, color, track) {
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + (track || '#3a3270') + ';border-radius:6px"><tr>' +
    (pct > 0 ? '<td width="' + pct + '%" style="background:' + color + ';height:9px;border-radius:6px;font-size:0;line-height:0">&nbsp;</td>' : '') +
    '<td style="font-size:0;line-height:0">&nbsp;</td></tr></table>';
}
function barRow_(label, valueText, pct, color) {
  return '<div style="margin-bottom:12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;color:#cfc4ad">' + label +
    '</td><td align="right" style="font-size:13px;font-weight:bold;color:#fff4e0">' + valueText + '</td></tr></table><div style="margin-top:6px">' + bar_(pct, color) + '</div></div>';
}
function tiles_(arr) {
  let html = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">';
  for (let i = 0; i < arr.length; i += 3) {
    html += '<tr>';
    for (let j = i; j < i + 3; j++) {
      const t = arr[j];
      html += '<td width="33%" style="padding:' + (i ? '8px' : '0') + ' ' + (j % 3 === 2 ? '0' : '8px') + ' 0 0" valign="top">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2a2260;border-radius:14px"><tr><td style="padding:12px 6px;text-align:center">' +
        '<div style="font-size:20px;line-height:1.1">' + t[0] + '</div><div style="font-size:18px;font-weight:bold;margin:4px 0 2px;color:' + (t[3] || '#fff4e0') + '">' + t[1] + '</div>' +
        '<div style="font-size:11px;color:#b9ae96">' + t[2] + '</div></td></tr></table></td>';
    }
    html += '</tr>';
  }
  return html + '</table>';
}
function lines_(items, mark, color, empty) {
  if (!items.length) return '<div style="font-size:14px;color:#b9ae96">' + empty + '</div>';
  return items.map(function (x) {
    return '<div style="padding:7px 0;border-bottom:1px solid #2e2766;font-size:14px;line-height:1.4;color:#fff4e0"><span style="color:' + color + ';font-weight:bold">' + mark + '</span> ' + x + '</div>';
  }).join('');
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
function quoteRow_() {
  return '<tr><td style="padding:4px 0 0;text-align:center;font-size:13px;color:#ffc531;font-style:italic;line-height:1.5">' + QUOTES_[new Date().getDay() % QUOTES_.length] +
    '<div style="margin-top:10px;font-size:11px;color:#8d84a8;font-style:normal">Sent by DailyFlow</div></td></tr>';
}
function inr_(n) { n = Math.round(n); return (n < 0 ? '-' : '') + '\u20B9' + Math.abs(n).toString().replace(/(\d)(?=(\d\d)+\d$)/g, '$1,'); }

/* ===================== data for the reports ===================== */

function byTime_(a, b) { return (a.time || '99:99').localeCompare(b.time || '99:99'); }

function collect_() {
  const S = settings_(), today = day_(0), tomorrow = day_(1), dow = String(new Date().getDay());
  const tasks = readTable_('tasks'), learn = readTable_('learning'), diet = readTable_('diet'), gym = readTable_('gym'), daily = readTable_('daily'),
    habits = readTable_('habits'), fin = readTable_('finance'), debts = readTable_('debts'), accounts = readTable_('accounts'), goals = readTable_('goals');
  const row = daily.filter(function (r) { return r.date === today; })[0] || {};
  const hIds = String(row.habits || '').split(',').filter(Boolean);
  const habitsToday = habits.filter(function (h) { return String(h.active) !== 'false' && String(h.days).split(',').indexOf(dow) >= 0 && (h.start || '0') <= today; });
  const tToday = tasks.filter(function (t) { return t.date === today; }).sort(byTime_);
  const tLate = tasks.filter(function (t) { return t.date < today && !yes_(t.done); });
  const lToday = learn.filter(function (l) { return l.date === today; });
  const lLate = learn.filter(function (l) { return l.date < today && !yes_(l.done); });
  const allT = tToday.concat(tLate), allL = lToday.concat(lLate);
  const tDone = allT.filter(function (t) { return yes_(t.done); }), lDone = allL.filter(function (l) { return yes_(l.done); });
  const hDone = habitsToday.filter(function (h) { return hIds.indexOf(h.id) >= 0; });
  const mealRows = diet.filter(function (r) { return r.date === today && r.items; });
  const g = gym.filter(function (r) { return r.date === today; })[0] || {};
  const gymN = (yes_(g.cardio) ? 1 : 0) + (yes_(g.strength) ? 1 : 0);

  // nutrition
  let kcal = 0, protein = 0; const meals = {};
  mealRows.forEach(function (r) {
    const items = String(r.items).split('|').filter(Boolean);
    meals[r.meal] = items;
    items.forEach(function (f) { const n = NUTR_[f]; if (n) { kcal += n[0]; protein += n[1]; } });
  });

  // money
  let inc = 0, exp = 0;
  fin.forEach(function (t) { if (t.date === today && DEBT_CATS_.indexOf(t.category) < 0) { if (t.type === 'income') inc += num_(t.amount); if (t.type === 'expense') exp += num_(t.amount); } });
  const bal = accounts.map(function (a) {
    let b = num_(a.opening);
    fin.forEach(function (t) {
      const amt = num_(t.amount);
      if (t.type === 'income' && t.account === a.id) b += amt;
      else if (t.type === 'expense' && t.account === a.id) b -= amt;
      else if (t.type === 'transfer') { if (t.account === a.id) b -= amt; if (t.toAccount === a.id) b += amt; }
    });
    return { name: a.name, kind: a.kind, balance: b };
  });
  let toReceive = 0, toPay = 0; const dueDebts = [];
  debts.forEach(function (d) {
    const rem = num_(d.amount) - num_(d.paid); if (rem <= 0) return;
    if (d.direction === 'receive') toReceive += rem; else toPay += rem;
    if (d.due && d.due <= today) dueDebts.push({ rec: d.direction === 'receive', person: d.person, rem: rem, due: d.due });
  });

  // active-day streak
  const active = {};
  tasks.forEach(function (t) { if (yes_(t.done)) active[t.date] = 1; });
  learn.forEach(function (l) { if (yes_(l.done)) active[l.date] = 1; });
  gym.forEach(function (r) { if (yes_(r.cardio) || yes_(r.strength)) active[r.date] = 1; });
  daily.forEach(function (r) { if (r.habits) active[r.date] = 1; });
  let streak = 0;
  for (let i = active[today] ? 0 : 1; i < 400 && active[day_(-i)]; i++) streak++;

  const total = allT.length + allL.length + habitsToday.length + 4 + 2;
  const done = tDone.length + lDone.length + hDone.length + Math.min(4, mealRows.length) + gymN;
  return {
    S: S, today: today, tomorrow: tomorrow, row: row, allT: allT, allL: allL, tDone: tDone, lDone: lDone, hDone: hDone, habitsToday: habitsToday,
    tPending: allT.filter(function (t) { return !yes_(t.done); }), lPending: allL.filter(function (l) { return !yes_(l.done); }),
    mealRows: mealRows, meals: meals, kcal: kcal, protein: protein, gymN: gymN, cardio: yes_(g.cardio), strength: yes_(g.strength),
    inc: inc, exp: exp, bal: bal, toReceive: toReceive, toPay: toPay, dueDebts: dueDebts, goals: goals, streak: streak,
    tomorrowTasks: tasks.filter(function (t) { return t.date === tomorrow && !yes_(t.done); }).sort(byTime_),
    total: total, done: done, pct: total ? Math.round(done / total * 100) : 0
  };
}

/* ===================== the daily progress report ===================== */

function sendDailyReport() {
  const d = collect_(), S = d.S, today = d.today;
  const label = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEEE, d MMM yyyy');
  const grade = d.pct >= 90 ? 'Outstanding \uD83C\uDFC6' : d.pct >= 70 ? 'Great day \uD83D\uDCAA' : d.pct >= 50 ? 'Solid progress \uD83D\uDC4D' : d.pct >= 30 ? 'Keep pushing \uD83C\uDF31' : 'Tomorrow is a fresh start \u2600\uFE0F';
  const water = num_(d.row.water), sleep = d.row.sleep === '' || d.row.sleep === undefined ? 0 : num_(d.row.sleep), focus = num_(d.row.focus), weight = num_(d.row.weight);

  let html = '';
  html += '<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;background-color:#6a4cff;background-image:linear-gradient(135deg,#8b6cff,#ff5d73)"><tr><td style="padding:26px 22px">' +
    '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#fff4e0">Daily report</div>' +
    '<div style="font-size:24px;font-weight:bold;margin:4px 0 16px;color:#ffffff">' + label + '</div>' +
    '<div style="color:#ffffff"><span style="font-size:58px;font-weight:bold;line-height:1">' + d.pct + '%</span> <span style="font-size:15px;margin-left:6px">' + grade + '</span></div>' +
    '<div style="margin-top:14px">' + bar_(d.pct, '#fff4e0', 'rgba(255,255,255,.28)') + '</div>' +
    '<div style="margin-top:12px;font-size:13px;color:#fff4e0">' + d.done + ' of ' + d.total + ' done &nbsp;\u00B7&nbsp; \uD83D\uDD25 ' + d.streak + ' day streak</div>' +
    '</td></tr></table></td></tr>';

  html += card_('Your day at a glance', tiles_([
    ['\u2705', d.tDone.length + '/' + d.allT.length, 'Tasks'], ['\uD83E\uDDE0', d.lDone.length + '/' + d.allL.length, 'Learning'], ['\uD83D\uDD01', d.hDone.length + '/' + d.habitsToday.length, 'Habits'],
    ['\uD83C\uDF5B', Math.min(4, d.mealRows.length) + '/4', 'Meals'], ['\uD83D\uDCA7', water + '/' + S.water, 'Water'], ['\uD83D\uDE34', sleep ? sleep + ' h' : '-', 'Sleep'],
    ['\uD83D\uDCAA', d.gymN + '/2', 'Workout'], ['\u23F1\uFE0F', focus + ' min', 'Focus'], ['\u2696\uFE0F', weight ? weight + ' kg' : '-', 'Weight']
  ]));

  const doneLines = d.tDone.map(function (t) { return '<span style="color:#9fe6c3">' + esc_(t.title) + '</span>'; })
    .concat(d.lDone.map(function (l) { return '<span style="color:#9fe6c3">\uD83D\uDCDA ' + esc_(l.title) + '</span>'; }))
    .concat(d.hDone.map(function (h) { return '<span style="color:#9fe6c3">' + esc_(h.emoji || '') + ' ' + esc_(h.title) + '</span>'; }));
  html += card_('Completed today (' + doneLines.length + ')', lines_(doneLines, '\u2714', '#3ddc97', 'Nothing ticked yet. Tomorrow, start with one small win.'), '#3ddc97');

  const pend = d.tPending.map(function (t) { return esc_(t.title) + (t.date < d.today ? ' <span style="color:#ff8fa0;font-size:12px">(from ' + t.date + ')</span>' : t.time ? ' <span style="color:#ffc531;font-size:12px">' + fmt12_(t.time) + '</span>' : ''); })
    .concat(d.lPending.map(function (l) { return '\uD83D\uDCDA ' + esc_(l.title) + (l.date < d.today ? ' <span style="color:#ff8fa0;font-size:12px">(from ' + l.date + ')</span>' : ''); }));
  html += card_('Still pending (' + pend.length + ')', lines_(pend, '\u25CB', '#ff8fa0', 'All clear. Nothing is pending. \uD83C\uDF89') + (pend.length ? '<div style="margin-top:10px;font-size:12px;color:#b9ae96">Pending items carry over to tomorrow so you can finish them first.</div>' : ''), '#ff8fa0');

  const mealNames = { morning: '\uD83C\uDF05 Breakfast', noon: '\u2600\uFE0F Lunch', evening: '\uD83C\uDF75 Snacks', night: '\uD83C\uDF19 Dinner' };
  const foodLines = Object.keys(mealNames).filter(function (k) { return d.meals[k]; }).map(function (k) { return '<b>' + mealNames[k] + ':</b> ' + esc_(d.meals[k].join(', ')); });
  html += card_('Nutrition', barRow_('Calories (approx)', d.kcal + ' / ' + S.kcal + ' kcal', d.kcal / S.kcal * 100, d.kcal > S.kcal ? '#ff5d73' : '#ffc531') +
    barRow_('Protein', d.protein + ' / ' + S.protein + ' g', d.protein / S.protein * 100, '#3ddc97') +
    '<div style="font-size:13px;line-height:1.7;color:#e9dfc8;margin-top:6px">' + (foodLines.join('<br>') || 'No meals logged today.') + '</div>', '#ffc531');

  html += card_('Workout and body', barRow_('Water', water + ' / ' + S.water + ' glasses', water / S.water * 100, '#4cc9f0') +
    barRow_('Sleep', (sleep || 0) + ' / ' + S.sleep + ' h', sleep / S.sleep * 100, '#8b6cff') +
    '<div style="font-size:14px;margin-top:4px;color:#fff4e0">' + (d.cardio ? '\u2705' : '\u2B1C') + ' Cardio &nbsp;&nbsp; ' + (d.strength ? '\u2705' : '\u2B1C') + ' Strength training</div>', '#4cc9f0');

  if (d.bal.length || d.inc || d.exp || d.toReceive || d.toPay) {
    let money = tiles_([['\uD83D\uDCE5', inr_(d.inc), 'Income today', '#3ddc97'], ['\uD83D\uDCE4', inr_(d.exp), 'Spent today', '#ff8fa0'], ['\uD83D\uDCB0', inr_(d.inc - d.exp), 'Net today']]);
    if (d.bal.length) money += '<div style="margin-top:14px">' + d.bal.map(function (a) { return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:5px 0;font-size:14px;color:#cfc4ad">' + esc_(a.name) + '</td><td align="right" style="font-size:14px;font-weight:bold;color:#fff4e0">' + inr_(a.balance) + '</td></tr></table>'; }).join('') + '</div>';
    if (d.toReceive || d.toPay) money += '<div style="margin-top:10px;font-size:13px;color:#e9dfc8">To receive <b style="color:#3ddc97">' + inr_(d.toReceive) + '</b> &nbsp;\u00B7&nbsp; To pay <b style="color:#ff8fa0">' + inr_(d.toPay) + '</b></div>';
    if (d.dueDebts.length) money += '<div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#3a2a55;font-size:13px;line-height:1.6;color:#ffd7de">\u26A0\uFE0F ' + d.dueDebts.map(function (x) { return (x.rec ? 'Collect ' : 'Pay ') + inr_(x.rem) + (x.rec ? ' from ' : ' to ') + esc_(x.person) + ' (due ' + x.due + ')'; }).join('<br>\u26A0\uFE0F ') + '</div>';
    html += card_('Money', money, '#ffc531');
  }

  const openGoals = d.goals.filter(function (g) { return num_(g.target) > 0; });
  if (openGoals.length) html += card_('Savings goals', openGoals.map(function (g) {
    const sv = num_(g.saved), tg = num_(g.target), pc = Math.min(100, sv / tg * 100);
    let hint = pc >= 100 ? 'Goal reached \uD83C\uDF89' : '';
    if (!hint && g.deadline) {
      const ms = new Date(g.deadline.split('-')[0], g.deadline.split('-')[1] - 1, g.deadline.split('-')[2]) - new Date(), mo = ms <= 0 ? 0 : Math.max(1, Math.round(ms / (86400000 * 30.4375)));
      hint = mo ? 'Save ' + inr_(Math.ceil((tg - sv) / mo)) + ' per month for ' + mo + ' month' + (mo > 1 ? 's' : '') : 'Deadline passed';
    }
    return barRow_(esc_((g.emoji || '') + ' ' + g.name), inr_(sv) + ' / ' + inr_(tg), pc, '#3ddc97') + (hint ? '<div style="margin:-6px 0 12px;font-size:12px;color:#b9ae96">' + hint + '</div>' : '');
  }).join(''), '#3ddc97');

  html += card_('Tomorrow (' + d.tomorrowTasks.length + ')', lines_(d.tomorrowTasks.map(function (t) {
    return (t.time ? '<b style="color:#ffc531">' + fmt12_(t.time) + '</b> ' : '') + esc_(t.title) + (String(t.remind || '') !== '' && t.time ? ' <span style="font-size:12px;color:#3ddc97">\uD83D\uDD14 ' + remindText_(t.remind) + '</span>' : '');
  }), '\u2192', '#8b6cff', 'Nothing planned yet. Open DailyFlow and plan your Top 3.'), '#b9a6ff');

  if (d.row.win) html += card_('\uD83C\uDFC5 Your win today', '<div style="font-size:15px;line-height:1.6;font-style:italic;color:#fff4e0">\u201C' + esc_(d.row.win) + '\u201D</div>', '#ffc531');
  html += quoteRow_();

  MailApp.sendEmail({ to: S.email, name: 'DailyFlow', subject: '\uD83D\uDCCA Daily report \u00B7 ' + d.pct + '% \u00B7 ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEE d MMM'), htmlBody: shell_(html) });
}

function sendEveningCheck() { sendDailyReport(); }   // old name, kept so existing timers still work

/* ===================== morning plan + weekly review ===================== */

function snapshot_() {
  const today = day_(0);
  const tasks = readTable_('tasks'), learn = readTable_('learning'), diet = readTable_('diet'), gym = readTable_('gym');
  const gymDay = function (d) { const r = gym.filter(function (x) { return x.date === d; })[0]; return r && (yes_(r.cardio) || yes_(r.strength)); };
  let streak = 0;
  for (let i = gymDay(today) ? 0 : 1; i < 60 && gymDay(day_(-i)); i++) streak++;
  let planned = 0, finished = 0, gymDays = 0, mealsDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = day_(-i);
    tasks.concat(learn).forEach(function (r) { if (r.date === d) { planned++; if (yes_(r.done)) finished++; } });
    if (gymDay(d)) gymDays++;
    if (diet.some(function (r) { return r.date === d && r.items; })) mealsDays++;
  }
  return {
    today: today, todayTasks: tasks.filter(function (t) { return t.date === today; }).sort(byTime_),
    todayLearn: learn.filter(function (l) { return l.date === today; }),
    lateTasks: tasks.filter(function (t) { return t.date < today && !yes_(t.done); }),
    lateLearn: learn.filter(function (l) { return l.date < today && !yes_(l.done); }),
    streak: streak, gymDays: gymDays, mealsDays: mealsDays, consistency: planned ? Math.round(finished / planned * 100) : 0, planned: planned, finished: finished
  };
}
function sectionList_(title, color, items) {
  return items.length ? card_(title, lines_(items, '\u2022', color, ''), color) : '';
}
function moneyLines_() {
  const today = day_(0), out = [];
  readTable_('debts').forEach(function (d) {
    const rem = num_(d.amount) - num_(d.paid);
    if (rem > 0 && d.due && d.due <= today) out.push((d.direction === 'receive' ? 'Collect ' : 'Pay ') + inr_(rem) + (d.direction === 'receive' ? ' from ' : ' to ') + esc_(d.person) + ' <span style="color:#ff8fa0">(due ' + d.due + ')</span>');
  });
  return out;
}
function taskLine_(t) { return (t.time ? '<b style="color:#ffc531">' + fmt12_(t.time) + '</b> ' : '') + esc_(t.title) + ' <span style="color:#8d84a8">(' + esc_(t.type) + ')</span>'; }

function sendMorningPlan() {
  const s = snapshot_(), S = settings_();
  const late = s.lateTasks.concat(s.lateLearn).map(function (r) { return esc_(r.title) + ' <span style="color:#ff8fa0">(planned ' + r.date + ')</span>'; });
  let html = '<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;background-color:#d9a21e;background-image:linear-gradient(135deg,#ffc531,#ff8a4c)"><tr><td style="padding:24px 22px;color:#2a1a05">' +
    '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase">Morning plan</div><div style="font-size:26px;font-weight:bold;margin:4px 0">\u2600\uFE0F Good morning, ' + NAME + '</div>' +
    '<div style="font-size:14px">' + (late.length ? late.length + ' pending to clear first' : 'A clean slate today') + ' \u00B7 \uD83D\uDD25 ' + s.streak + ' day gym streak</div></td></tr></table></td></tr>';
  html += sectionList_('Clear these first (' + late.length + ')', '#ff5d73', late);
  html += sectionList_("Today's schedule", '#ffc531', s.todayTasks.map(taskLine_));
  html += sectionList_('Learning today', '#b9a6ff', s.todayLearn.map(function (l) { return esc_(l.title) + (l.topic ? ' (' + esc_(l.topic) + ')' : ''); }));
  html += sectionList_('Money due', '#3ddc97', moneyLines_());
  html += card_('Also today', '<div style="font-size:14px;line-height:1.7;color:#e9dfc8">Log your 4 meals, drink ' + S.water + ' glasses of water and finish cardio + strength.</div>', '#4cc9f0');
  MailApp.sendEmail({ to: S.email, name: 'DailyFlow', subject: (late.length ? '\u26A0\uFE0F ' + late.length + ' pending \u00B7 ' : '\u2600\uFE0F ') + "Your plan for today", htmlBody: shell_(html + quoteRow_()) });
}

function sendWeeklyReview() {
  const s = snapshot_(), S = settings_();
  let html = '<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;background-color:#3b7fd6;background-image:linear-gradient(135deg,#4cc9f0,#8b6cff)"><tr><td style="padding:26px 22px;color:#ffffff">' +
    '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase">Weekly review</div><div style="font-size:56px;font-weight:bold;line-height:1.1;margin:6px 0">' + s.consistency + '%</div>' +
    '<div style="font-size:14px">of planned tasks and lessons finished (' + s.finished + ' of ' + s.planned + ')</div><div style="margin-top:14px">' + bar_(s.consistency, '#fff4e0', 'rgba(255,255,255,.28)') + '</div></td></tr></table></td></tr>';
  html += card_('This week', tiles_([['\uD83D\uDCAA', s.gymDays + '/7', 'Workout days'], ['\uD83C\uDF5B', s.mealsDays + '/7', 'Food logged'], ['\uD83D\uDD25', s.streak, 'Gym streak']]), '#ffc531');
  html += card_('Next week', '<div style="font-size:14px;line-height:1.7;color:#e9dfc8">Pending right now: <b>' + (s.lateTasks.length + s.lateLearn.length) + '</b>. Pick the one habit you missed most and put it in tomorrow\u2019s first slot.</div>', '#b9a6ff');
  MailApp.sendEmail({ to: S.email, name: 'DailyFlow', subject: '\uD83D\uDCCA Weekly review \u00B7 ' + s.consistency + '% consistency', htmlBody: shell_(html + quoteRow_()) });
}

/* ===================== timers ===================== */

function installReminders() {
  const own = ['sendMorningPlan', 'sendEveningCheck', 'sendWeeklyReview', 'checkTaskReminders', 'hourlyTick', 'scheduleTick'];
  ScriptApp.getProjectTriggers().forEach(function (t) { if (own.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkTaskReminders').timeBased().everyMinutes(5).create();   // task reminder emails
  ScriptApp.newTrigger('scheduleTick').timeBased().everyMinutes(15).create();        // morning plan + daily report at your chosen hours
  CalendarApp.getDefaultCalendar();       // asks for Calendar permission
  MailApp.getRemainingDailyQuota();       // asks for Gmail permission
}

function scheduleTick() {
  const S = settings_(), tz = Session.getScriptTimeZone();
  const hour = Number(Utilities.formatDate(new Date(), tz, 'H')), today = day_(0);
  const props = PropertiesService.getScriptProperties();
  if (S.mailMorning && hour === S.morningHour && props.getProperty('morning') !== today) { props.setProperty('morning', today); sendMorningPlan(); }
  if (S.mailReport && hour === S.reportHour && props.getProperty('report') !== today) {
    props.setProperty('report', today); sendDailyReport();
    if (new Date().getDay() === 0) sendWeeklyReview();
  }
}

/** Run once to test that the daily report email works. */
function testEmail() { sendDailyReport(); }
