/* HIT-ME-UP — shared utilities */
'use strict';

const U = {
  esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  },

  todayISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  },

  isoOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  },

  fmtDate(iso, opts) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric' });
  },

  fmtDateLong(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  },

  fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  },

  minutesNow() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  },

  timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  },

  sum(arr) { return arr.reduce((a, b) => a + b, 0); },
  avg(arr) { return arr.length ? U.sum(arr) / arr.length : 0; },

  latest(vitals, type, date) {
    const list = vitals.filter((v) => v.type === type && (!date || v.date <= date));
    return list.length ? list[list.length - 1] : null;
  },

  onDate(vitals, type, date) {
    return vitals.filter((v) => v.type === type && v.date === date);
  },

  lastNDays(vitals, type, n) {
    const from = U.isoOffset(-(n - 1));
    return vitals
      .filter((v) => v.type === type && v.date >= from)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  trendArrow(list) {
    if (list.length < 4) return { dir: 'flat', label: 'Not enough data' };
    const half = Math.floor(list.length / 2);
    const older = U.avg(list.slice(0, half).map((v) => v.value));
    const newer = U.avg(list.slice(-half).map((v) => v.value));
    const delta = newer - older;
    const pct = older ? (delta / older) * 100 : 0;
    if (Math.abs(pct) < 1.5) return { dir: 'flat', label: 'Stable' };
    return {
      dir: delta > 0 ? 'up' : 'down',
      label: `${delta > 0 ? '+' : ''}${delta.toFixed(1)} vs earlier`,
      delta,
    };
  },

  initials(name) {
    return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  },

  debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },
};

/* Vital type registry — labels, units, colors, icon keys */
const VITAL_TYPES = {
  weight: { label: 'Weight', unit: 'kg', color: '#2dd4bf', icon: 'scale', dual: false },
  blood_pressure: { label: 'Blood Pressure', unit: 'mmHg', color: '#fb7185', icon: 'heart', dual: true, v1Label: 'Systolic', v2Label: 'Diastolic' },
  heart_rate: { label: 'Resting HR', unit: 'bpm', color: '#f43f5e', icon: 'pulse', dual: false },
  sleep: { label: 'Sleep', unit: 'h', color: '#a78bfa', icon: 'moon', dual: false },
  steps: { label: 'Steps', unit: 'steps', color: '#38bdf8', icon: 'steps', dual: false },
  water: { label: 'Water', unit: 'ml', color: '#22d3ee', icon: 'drop', dual: false },
  glucose: { label: 'Blood Glucose', unit: 'mg/dL', color: '#fbbf24', icon: 'droplet', dual: false },
  mood: { label: 'Mood', unit: '/5', color: '#4ade80', icon: 'smile', dual: false },
};

const WORKOUT_TYPES = {
  hiit: { label: 'HIT / HIIT', color: '#f97316', icon: 'bolt' },
  strength: { label: 'Strength', color: '#a78bfa', icon: 'dumbbell' },
  cardio: { label: 'Cardio', color: '#38bdf8', icon: 'run' },
  flexibility: { label: 'Mobility', color: '#4ade80', icon: 'stretch' },
};

const MEAL_TYPES = {
  breakfast: { label: 'Breakfast', emoji: '🍳' },
  lunch: { label: 'Lunch', emoji: '🥗' },
  dinner: { label: 'Dinner', emoji: '🍽️' },
  snack: { label: 'Snack', emoji: '🍎' },
};
