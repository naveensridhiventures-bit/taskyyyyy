# DailyFlow - React + Vite PWA with Google Sheet database

Tasks (personal + work), daily schedule, South Indian diet log, learning plan with
carry-over of missed items, and gym tracking. Data lives in your Google Sheet.

## 1. Google Sheet backend
1. Create a new Google Sheet.
2. Extensions > Apps Script. Paste `apps-script/Code.gs`.
3. Change `TOKEN` to your own secret.
4. Run `setup` once (accept permissions). Tabs Tasks, Diet, Learning, Gym are created.
5. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
6. Copy the Web app URL (ends with /exec).
   After editing Code.gs later, use Deploy > Manage deployments > Edit > New version.

## 2. Run the app
```
cp .env.example .env     # fill VITE_SCRIPT_URL and VITE_TOKEN
npm install
npm run dev
```

## 3. Publish and install as an app
```
npm run build
```
Upload `dist/` to Vercel or Netlify (add the two env vars there before building).
Open the site on your phone, then Add to Home Screen. It works offline and syncs when online.

## How things work
- Every change saves on the device first, then goes to the sheet. Offline changes are queued and sent later.
- Missed tasks and lessons stay in a glowing "pending" card on Today until ticked or moved to today.
- Swipe a task or lesson left to delete it.
- Reminders: tap "Reminders" to allow notifications. The app notifies once a day when it is opened
  and items are pending. Notifications while the app is fully closed need a push server, which is not included.


## v5 features
- Top 3 priorities, habits (repeating), focus timer, weekly review with badges, win of the day
- Health: diet with calories and protein, gym, water, sleep, weight chart
- Money: bank and cash balances, income / expense / transfer with 40+ categories, people who owe you and
  people you owe (partial payments, due dates), monthly charts
- Sheet tabs created automatically: Daily, Habits, Finance, Debts, Accounts
- After updating Code.gs: Deploy > Manage deployments > Edit > New version (keep your TOKEN value)

## v8 features
- Tap any task, lesson, habit, transaction, person or goal to edit it (Delete is inside the edit sheet)
- Savings goals (Money > Goals) with progress rings and a "save X per month" plan
- Settings (gear icon): calorie, protein, water and sleep targets, email address, report times
- App lock: 4-digit PIN with fingerprint / face unlock (phones with a screen lock, over https)
- Task reminders: set a time + "Remind me" on a task
  - in-app alarm (rings while the app is open)
  - Google Calendar alert (rings even when the app is closed)
  - email reminder (checked every 5 minutes by your Apps Script)
- Daily progress report email, morning plan email, weekly review (Sunday)

### After updating Code.gs
1. Run `setup`, then `installReminders` (accept Calendar + Gmail permissions), then `testEmail`.
2. Deploy > Manage deployments > Edit > New version.
