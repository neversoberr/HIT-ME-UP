/* HIT-ME-UP — background reminder engine.
   Runs while the app is open: checks every 30s for due medications,
   hydration nudges and appointment reminders, then "hits you up"
   with an in-app toast + system notification (if permitted). */
'use strict';

const Reminders = {
  _interval: null,
  _fired: new Set(), /* keys of reminders already fired: type|id|date|time */
  _lastWaterPing: 0,

  start() {
    this.stop();
    this._interval = setInterval(() => this.check(), 30000);
    this.check();
  },

  stop() {
    clearInterval(this._interval);
    this._interval = null;
  },

  async requestPermission() {
    if (typeof Notification === 'undefined') return 'unsupported';
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
  },

  notify(title, body) {
    /* in-app toast is always shown */
    toast(title, body, 'warn', 8000);
    /* system notification when permitted */
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, icon: undefined, tag: 'hit-me-up-' + Date.now(), silent: false });
        setTimeout(() => n.close(), 12000);
      } catch { /* some browsers require service worker; ignore */ }
    }
    /* little audio ping */
    try {
      const ctx = this._ctx || (this._ctx = new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 784;
      gain.gain.value = 0.035;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.frequency.setValueAtTime(988, ctx.currentTime + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.stop(ctx.currentTime + 0.36);
    } catch { /* no audio */ }
  },

  check() {
    const state = App.state;
    if (!state) return;
    const settings = state.settings?.notifications || {};
    const today = U.todayISO();
    const nowMin = U.minutesNow();

    /* 1) medication reminders */
    if (settings.meds !== false) {
      const lead = settings.leadMin ?? 10;
      for (const med of state.medications.filter((m) => m.active)) {
        for (const time of med.times) {
          const key = `med|${med.id}|${today}|${time}`;
          if (this._fired.has(key)) continue;
          const t = U.timeToMinutes(time);
          /* fire once when now >= dose time - lead */
          if (nowMin >= t - lead && nowMin <= t + 45) {
            const status = Insights.doseStatus(state, med.id, today, time);
            if (status === 'taken') continue;
            this._fired.add(key);
            this.notify(`💊 Time for ${med.name}`, `${med.dosage} — scheduled for ${U.fmtTime(time)}${lead ? ` (we're hitting you up ${lead} min early)` : ''}`);
            App.updateBell();
          }
        }
      }
    }

    /* 2) hydration nudges (9:00–21:00 window) */
    if (settings.water !== false) {
      const every = (settings.waterEveryMin ?? 120) * 60000;
      const hour = new Date().getHours();
      if (hour >= 9 && hour < 21 && Date.now() - this._lastWaterPing >= every) {
        this._lastWaterPing = Date.now();
        const waterToday = U.sum(U.onDate(state.vitals, 'water', today).map((v) => v.value));
        const goal = state.goals?.waterMl || 2500;
        if (waterToday < goal) {
          this.notify('💧 Hydration check', `You're at ${Math.round(waterToday)} ml of ${goal} ml — time for a glass of water.`);
          App.updateBell();
        }
      }
    }

    /* 3) appointment reminders: morning-of (8:00–8:30) and night-before (20:00–20:30) */
    if (settings.appointments !== false) {
      for (const apt of state.appointments.filter((a) => a.status === 'upcoming')) {
        const days = Math.round((new Date(apt.date) - new Date(today)) / 86400000);
        const morningKey = `apt-am|${apt.id}|${today}`;
        const eveningKey = `apt-pm|${apt.id}|${today}`;
        if (days === 0 && nowMin >= 480 && nowMin <= 510 && !this._fired.has(morningKey)) {
          this._fired.add(morningKey);
          this.notify(`📅 Today: ${apt.title}`, `${U.fmtTime(apt.time)} with ${apt.doctor}${apt.location ? ' — ' + apt.location : ''}`);
        }
        if (days === 1 && nowMin >= 1200 && nowMin <= 1230 && !this._fired.has(eveningKey)) {
          this._fired.add(eveningKey);
          this.notify(`📅 Tomorrow: ${apt.title}`, `${U.fmtTime(apt.time)} with ${apt.doctor}. Get any documents ready tonight.`);
        }
      }
    }
  },
};
