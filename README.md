# HIT-ME-UP 💚

> **H**ealth **I**nsights & **T**racking — a personal health management platform that *hits you up* with the reminders that matter. And yes, the **HIT** is also High-Intensity Training: a built-in interval timer lives here too.

A fully self-contained, zero-dependency health platform. One Node.js file serves both the REST API and the single-page app; your data stays on your machine in a single JSON file.

![no dependencies](https://img.shields.io/badge/dependencies-zero-2dd4bf) ![data](https://img.shields.io/badge/data-stays%20local-4ade80) ![license](https://img.shields.io/badge/license-MIT-94a3b8)

---

## ✨ What's inside

| Module | Highlights |
| --- | --- |
| 🏠 **Dashboard** | Composite **Health Score (0–100)** with breakdown (adherence, sleep, activity, hydration, training, blood pressure), today's stats, med timeline, trend charts, hit-you-up feed |
| 💓 **Vitals** | Track 8 metrics — weight, blood pressure (dual value), resting HR, sleep, steps, water, glucose, mood — with 30-day charts, trends, ranges and history |
| 💊 **Medications** | Full cabinet CRUD, daily dose timeline with take / skip / undo, 7-day & 30-day **adherence rings** |
| 📅 **Appointments** | Upcoming vs. history, status management, one-click rebook |
| ⚡ **HIT Lab** | **Interval timer** (prep/work/rest/rounds, presets for Tabata / Sprints / EMOM, countdown beeps, round tracker) + training log, weekly load, type distribution |
| 🥗 **Nutrition** | Daily calorie budget, macro donut, meal logging, tappable **water-glass hydration tracker** |
| 🔔 **Hit Me Up** | The reminder center: browser notifications + in-app toasts + audio pings for meds (configurable lead time), hydration nudges, appointment day-before/morning-of |
| 👤 **Profile & Goals** | Personal info, conditions/allergies, emergency card, customizable goals, JSON export, demo reset |

## 🚀 Run it

```bash
npm start        # or: node server.js
```

Then open **http://localhost:3000**. That's it — no build step, no database, no config.

The server binds `0.0.0.0:$PORT` (default `3000`), so it works out of the box in containers and sandboxes.

## 🧠 How the Health Score works

```
100 pts =  Medication adherence (30)   ← % of scheduled doses taken, last 7 days
          + Sleep (15)                 ← 7-day avg vs. your goal
          + Activity (15)              ← 7-day avg steps vs. goal
          + Hydration (10)             ← 7-day avg water vs. goal
          + Training (15)              ← sessions this week vs. goal
          + Blood pressure (15)        ← 7-day avg systolic/diastolic in range
```

85+ *Excellent* · 70–84 *On track* · 55–69 *Needs work* · <55 *At risk*

## 🔌 API

REST over JSON, rooted at `/api`:

```
GET    /api/state                          full app state (bootstrap)
GET    /api/export                         full record, export-ready
POST   /api/reset                          reseed demo data

PATCH  /api/profile                        PATCH /api/goals · PATCH /api/settings

GET    /api/{collection}                   vitals | medications | doses |
POST   /api/{collection}                   appointments | workouts | meals
PATCH  /api/{collection}/:id
DELETE /api/{collection}/:id

POST   /api/medications/:id/dose           { date, time, status: taken|skipped|missed }
```

Storage: `data/db.json` (auto-created, git-ignored).

## 🗂 Project layout

```
server.js                  zero-dependency HTTP + API server (also seeds demo data)
data/db.json               your health record (created at first run)
public/
  index.html               app shell
  css/styles.css           design system (dark clinical theme)
  js/
    utils.js               helpers + metric registries
    api.js                 fetch client
    components.js          icons, toasts, modals, charts, rings
    reminders-engine.js    the "hit me up" engine (30s check loop)
    app.js                 router + shell
    views/                 one module per screen
```

## 🔒 Privacy

No analytics, no cloud, no third-party storage. The only external requests are CDN loads of the Inter font and Chart.js — charts degrade gracefully if offline. Your record lives in one JSON file you can export anytime from **Profile → Export data**.

## 🩺 Disclaimer

HIT-ME-UP is a personal tracking tool, not a medical device. It doesn't diagnose or treat anything — always consult a clinician about medication or vital-sign concerns.

---

*Your health, hitting back with insights.* 🫀
