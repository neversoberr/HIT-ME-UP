/**
 * HIT-ME-UP — Health Insights & Tracking
 * Zero-dependency Node.js server: static file serving + JSON REST API
 * with file-persisted storage and a rich demo seed.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

let db = null;
let saveTimer = null;

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!db || !Array.isArray(db.vitals)) throw new Error('corrupt db');
      return;
    } catch (e) {
      console.error('[hit-me-up] db.json unreadable, reseeding:', e.message);
    }
  }
  db = seedDemoData();
  persistDb(true);
}

function persistDb(sync) {
  const write = () => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error('[hit-me-up] failed to persist db:', e.message);
    }
  };
  if (sync) return write();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(write, 150);
}

/* ------------------------------------------------------------------ */
/* Demo seed                                                           */
/* ------------------------------------------------------------------ */

function isoDate(d) { return d.toISOString().slice(0, 10); }
function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); }
function rnd(min, max) { return Math.random() * (max - min) + min; }
function rint(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr) { return arr[rint(0, arr.length - 1)]; }

function seedDemoData() {
  const profile = {
    name: 'Alex Carter',
    age: 34,
    sex: 'male',
    heightCm: 178,
    targetWeightKg: 76,
    bloodType: 'O+',
    conditions: ['Hypertension (managed)', 'Vitamin D deficiency'],
    allergies: ['Penicillin'],
    emergencyContact: { name: 'Jordan Carter', relation: 'Partner', phone: '+1 555 0142' },
    doctor: 'Dr. Priya Nair, MD — Primary Care',
    createdAt: new Date().toISOString(),
  };

  const goals = {
    steps: 10000,
    waterMl: 2500,
    sleepH: 8,
    caloriesIn: 2200,
    caloriesOut: 600,
    workoutsPerWeek: 4,
  };

  const settings = {
    notifications: {
      meds: true,
      leadMin: 10,
      water: true,
      waterEveryMin: 120,
      appointments: true,
    },
  };

  /* --- Vitals: 45 days of history -------------------------------- */
  const vitals = [];
  let weight = 82.4;
  let hr = 73;
  for (let i = 45; i >= 0; i--) {
    const date = daysAgoISO(i);
    weight += rnd(-0.25, 0.18); // gentle downward trend
    hr -= 0.08;
    if (i % 1 === 0) {
      vitals.push({ id: uid('vit'), date, type: 'weight', value: +weight.toFixed(1), note: '' });
      const sys = rint(114, 132) - (i < 20 ? 3 : 0);
      vitals.push({ id: uid('vit'), date, type: 'blood_pressure', value: sys, value2: rint(74, 86), note: '' });
      vitals.push({ id: uid('vit'), date, type: 'heart_rate', value: Math.round(hr + rnd(-3, 3)), note: '' });
      vitals.push({ id: uid('vit'), date, type: 'sleep', value: +rnd(5.6, 8.4).toFixed(1), note: '' });
      vitals.push({ id: uid('vit'), date, type: 'steps', value: rint(3800, 13400), note: '' });
      if (i <= 10 || Math.random() < 0.6) {
        vitals.push({ id: uid('vit'), date, type: 'water', value: pick([1500, 1750, 2000, 2250, 2500, 2750]), note: '' });
      }
      if (Math.random() < 0.35) {
        vitals.push({ id: uid('vit'), date, type: 'glucose', value: +rnd(82, 112).toFixed(0), note: '' });
      }
      if (Math.random() < 0.5) {
        vitals.push({ id: uid('vit'), date, type: 'mood', value: rint(3, 5), note: '' });
      }
    }
  }

  /* --- Medications + dose history --------------------------------- */
  const meds = [
    { id: 'med_lisi', name: 'Lisinopril', dosage: '10 mg', form: 'tablet', times: ['08:00'], frequency: 'daily', instructions: 'Take with water, before breakfast.', active: true, color: '#38bdf8' },
    { id: 'med_meta', name: 'Metformin', dosage: '500 mg', form: 'tablet', times: ['08:30', '20:30'], frequency: 'daily', instructions: 'Take with food to avoid stomach upset.', active: true, color: '#a78bfa' },
    { id: 'med_vitd', name: 'Vitamin D3', dosage: '2000 IU', form: 'capsule', times: ['13:00'], frequency: 'daily', instructions: 'Take with a fat-containing meal.', active: true, color: '#fbbf24' },
  ];

  const doses = [];
  for (let i = 21; i >= 0; i--) {
    const date = daysAgoISO(i);
    for (const med of meds) {
      for (const time of med.times) {
        // ~87% adherence; skip today's future doses
        const taken = Math.random() < 0.87;
        if (i === 0 && time > new Date().toTimeString().slice(0, 5)) continue;
        doses.push({
          id: uid('dose'),
          medicationId: med.id,
          date,
          time,
          status: taken ? 'taken' : (Math.random() < 0.5 ? 'skipped' : 'missed'),
          loggedAt: new Date(date + 'T' + time + ':00').toISOString(),
        });
      }
    }
  }

  /* --- Appointments ------------------------------------------------ */
  const appointments = [
    { id: uid('apt'), title: 'Primary care follow-up', doctor: 'Dr. Priya Nair', specialty: 'Primary Care', date: daysAgoISO(-6), time: '10:30', location: 'Riverside Family Clinic, Suite 204', notes: 'Review blood pressure log and recent labs.', status: 'upcoming' },
    { id: uid('apt'), title: 'Dental cleaning', doctor: 'Dr. Marcus Lee', specialty: 'Dentistry', date: daysAgoISO(-19), time: '14:00', location: 'Bright Smile Dental', notes: '', status: 'upcoming' },
    { id: uid('apt'), title: 'Annual physical + blood panel', doctor: 'Dr. Priya Nair', specialty: 'Primary Care', date: daysAgoISO(24), time: '09:00', location: 'Riverside Family Clinic', notes: 'Fasting required. Lipids + A1c ordered.', status: 'completed' },
    { id: uid('apt'), title: 'Eye exam', doctor: 'Dr. Elena Ruiz', specialty: 'Ophthalmology', date: daysAgoISO(52), time: '11:15', location: 'ClearView Eye Center', notes: '', status: 'completed' },
  ];

  /* --- Workouts ----------------------------------------------------- */
  const hiitSets = [
    { name: 'Tabata: Burpees & Squats', detail: '8 rounds · 20s work / 10s rest' },
    { name: 'Bike Sprints', detail: '10 rounds · 30s sprint / 60s easy' },
    { name: 'Kettlebell Complex', detail: 'Swings · Goblet Squats · Press — 5 rounds' },
  ];
  const strengthSets = [
    { name: 'Push Day', detail: 'Bench 5×5 · OHP 3×8 · Dips 3×12' },
    { name: 'Pull Day', detail: 'Rows 5×5 · Pull-ups 4×8 · Curls 3×12' },
    { name: 'Leg Day', detail: 'Squat 5×5 · RDL 3×8 · Lunges 3×12' },
  ];
  const workouts = [];
  for (let i = 42; i >= 0; i--) {
    const dow = new Date(daysAgoISO(i)).getDay();
    const trains = [1, 2, 4, 5, 6].includes(dow) && Math.random() < 0.78;
    if (!trains) continue;
    const isHiit = Math.random() < 0.45;
    const w = {
      id: uid('wo'),
      date: daysAgoISO(i),
      type: isHiit ? 'hiit' : pick(['strength', 'cardio', 'flexibility']),
      title: '',
      durationMin: 0,
      calories: 0,
      intensity: rint(2, 5),
      notes: '',
    };
    if (w.type === 'hiit') { const s = pick(hiitSets); w.title = s.name; w.detail = s.detail; w.durationMin = rint(18, 32); w.calories = rint(240, 420); }
    else if (w.type === 'strength') { const s = pick(strengthSets); w.title = s.name; w.detail = s.detail; w.durationMin = rint(40, 65); w.calories = rint(280, 460); }
    else if (w.type === 'cardio') { w.title = pick(['Zone 2 Run', 'Cycling — River Loop', 'Rowing Session', 'Incline Walk']); w.detail = 'Steady state'; w.durationMin = rint(30, 55); w.calories = rint(260, 520); }
    else { w.title = pick(['Mobility Flow', 'Yoga — Vinyasa', 'Full-body Stretch']); w.detail = 'Follow-along video'; w.durationMin = rint(20, 45); w.calories = rint(80, 160); }
    workouts.push(w);
  }

  /* --- Meals (last 4 days) ------------------------------------------ */
  const meals = [];
  const breakfasts = [['Greek yogurt + berries + granola', 380, 24, 48, 9], ['Oatmeal with banana & walnuts', 420, 14, 62, 12], ['Eggs (3) + toast + avocado', 520, 27, 40, 30]];
  const lunches = [['Grilled chicken salad', 510, 42, 28, 26], ['Turkey & swiss wrap', 560, 34, 52, 24], ['Salmon bowl with quinoa', 640, 40, 58, 26]];
  const dinners = [['Steak, sweet potato & greens', 690, 46, 52, 34], ['Chicken stir-fry & rice', 620, 44, 68, 18], ['Pasta bolognese', 710, 35, 84, 24], ['Tofu curry & jasmine rice', 580, 24, 78, 18]];
  const snacks = [['Protein shake', 180, 25, 8, 4], ['Apple + peanut butter', 240, 6, 28, 13], ['Mixed nuts (handful)', 200, 7, 8, 17], ['Cottage cheese + pineapple', 160, 18, 14, 3]];
  for (let i = 3; i >= 0; i--) {
    const date = daysAgoISO(i);
    const plan = [[pick(breakfasts), 'breakfast'], [pick(lunches), 'lunch'], [pick(snacks), 'snack'], [pick(dinners), 'dinner']];
    for (const [[name, cal, p, c, f], type] of plan) {
      meals.push({ id: uid('meal'), date, type, name, calories: cal, protein: p, carbs: c, fat: f });
    }
  }

  return { profile, goals, settings, vitals, medications: meds, doses, appointments, workouts, meals };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1e6) { reject(new Error('payload too large')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || !path.extname(rel)) rel = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // SPA fallback
      if (pathname !== '/') return serveStatic(req, res, '/');
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
}

/* ------------------------------------------------------------------ */
/* API router                                                          */
/* ------------------------------------------------------------------ */

function findColl(name) {
  const map = { vitals: 'vitals', medications: 'medications', appointments: 'appointments', workouts: 'workouts', meals: 'meals', doses: 'doses' };
  const key = map[name];
  if (!key || !Array.isArray(db[key])) return null;
  return db[key];
}

async function handleApi(req, res, url) {
  const { pathname } = url;
  const parts = pathname.split('/').filter(Boolean); // ['api', coll, id, action]
  const method = req.method;

  try {
    /* ---- Full state (bootstrap) ---- */
    if (pathname === '/api/state' && method === 'GET') {
      return sendJson(res, 200, db);
    }

    /* ---- Profile ---- */
    if (pathname === '/api/profile') {
      if (method === 'GET') return sendJson(res, 200, db.profile);
      if (method === 'PUT' || method === 'PATCH') {
        const body = await readBody(req);
        db.profile = { ...db.profile, ...body };
        persistDb();
        return sendJson(res, 200, db.profile);
      }
    }

    /* ---- Goals ---- */
    if (pathname === '/api/goals') {
      if (method === 'GET') return sendJson(res, 200, db.goals);
      if (method === 'PUT' || method === 'PATCH') {
        const body = await readBody(req);
        db.goals = { ...db.goals, ...body };
        persistDb();
        return sendJson(res, 200, db.goals);
      }
    }

    /* ---- Settings ---- */
    if (pathname === '/api/settings') {
      if (method === 'GET') return sendJson(res, 200, db.settings);
      if (method === 'PUT' || method === 'PATCH') {
        const body = await readBody(req);
        db.settings = { ...db.settings, ...body, notifications: { ...(db.settings.notifications || {}), ...(body.notifications || {}) } };
        persistDb();
        return sendJson(res, 200, db.settings);
      }
    }

    /* ---- Export ---- */
    if (pathname === '/api/export' && method === 'GET') {
      return sendJson(res, 200, { app: 'HIT-ME-UP', exportedAt: new Date().toISOString(), data: db });
    }

    /* ---- Reset to fresh demo data ---- */
    if (pathname === '/api/reset' && method === 'POST') {
      db = seedDemoData();
      persistDb(true);
      return sendJson(res, 200, { ok: true });
    }

    /* ---- Dose logging (medication action) ---- */
    // POST /api/medications/:id/dose  { date, time, status }
    if (parts.length === 4 && parts[1] === 'medications' && parts[3] === 'dose' && method === 'POST') {
      const med = db.medications.find((m) => m.id === parts[2]);
      if (!med) return sendJson(res, 404, { error: 'medication not found' });
      const body = await readBody(req);
      if (!body.date || !body.time || !['taken', 'skipped', 'missed'].includes(body.status)) {
        return sendJson(res, 400, { error: 'date, time and status (taken|skipped|missed) required' });
      }
      const existing = db.doses.find((d) => d.medicationId === med.id && d.date === body.date && d.time === body.time);
      if (existing) {
        existing.status = body.status;
        existing.loggedAt = new Date().toISOString();
        persistDb();
        return sendJson(res, 200, existing);
      }
      const dose = { id: uid('dose'), medicationId: med.id, date: body.date, time: body.time, status: body.status, loggedAt: new Date().toISOString() };
      db.doses.push(dose);
      persistDb();
      return sendJson(res, 201, dose);
    }

    /* ---- Generic collection CRUD ---- */
    const collName = parts[1];
    const coll = findColl(collName);
    if (!coll) return sendJson(res, 404, { error: 'unknown collection' });
    const id = parts[2];

    if (!id && method === 'GET') return sendJson(res, 200, coll);

    if (!id && method === 'POST') {
      const body = await readBody(req);
      const item = { id: uid(collName.slice(0, 3)), ...body };
      if (collName === 'medications' || collName === 'vitals' || collName === 'appointments' || collName === 'workouts' || collName === 'meals') {
        if (!item.date) item.date = new Date().toISOString().slice(0, 10);
      }
      coll.push(item);
      persistDb();
      return sendJson(res, 201, item);
    }

    if (id && (method === 'GET')) {
      const item = coll.find((x) => x.id === id);
      return item ? sendJson(res, 200, item) : sendJson(res, 404, { error: 'not found' });
    }

    if (id && (method === 'PUT' || method === 'PATCH')) {
      const idx = coll.findIndex((x) => x.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'not found' });
      const body = await readBody(req);
      coll[idx] = { ...coll[idx], ...body, id };
      persistDb();
      return sendJson(res, 200, coll[idx]);
    }

    if (id && method === 'DELETE') {
      const idx = coll.findIndex((x) => x.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'not found' });
      const removed = coll.splice(idx, 1)[0];
      if (collName === 'medications') {
        db.doses = db.doses.filter((d) => d.medicationId !== id);
      }
      persistDb();
      return sendJson(res, 200, { ok: true, removed });
    }

    return sendJson(res, 405, { error: 'method not allowed' });
  } catch (e) {
    return sendJson(res, 400, { error: e.message || 'bad request' });
  }
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end(); return;
  }
  serveStatic(req, res, url.pathname);
});

loadDb();
server.listen(PORT, HOST, () => {
  console.log(`\n  ♥ HIT-ME-UP — Health Insights & Tracking`);
  console.log(`  Server running at http://${HOST}:${PORT}`);
  console.log(`  Database: ${DB_FILE}\n`);
});
