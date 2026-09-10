/* HIT-ME-UP — Dashboard view + shared Insights engine */
'use strict';

/* ------------------------------------------------------------------ */
/* Insights engine — health score & derived stats                      */
/* ------------------------------------------------------------------ */

const Insights = {
  /* Expected doses for a date: active meds × scheduled times */
  expectedDoses(state, date) {
    const out = [];
    for (const med of state.medications.filter((m) => m.active)) {
      for (const time of med.times) out.push({ med, time });
    }
    return out;
  },

  doseStatus(state, medId, date, time) {
    const d = state.doses.find((x) => x.medicationId === medId && x.date === date && x.time === time);
    return d ? d.status : null;
  },

  adherence(state, days = 7) {
    let expected = 0, taken = 0;
    const today = U.todayISO();
    for (let i = 0; i < days; i++) {
      const date = U.isoOffset(-i);
      for (const med of state.medications.filter((m) => m.active)) {
        for (const time of med.times) {
          // skip today's not-yet-due slots — they don't count against you yet
          if (date === today && U.timeToMinutes(time) > U.minutesNow()) continue;
          expected++;
          if (this.doseStatus(state, med.id, date, time) === 'taken') taken++;
        }
      }
    }
    return { expected, taken, pct: expected ? Math.round((taken / expected) * 100) : 100 };
  },

  avgMetric(state, type, days = 7) {
    const from = U.isoOffset(-(days - 1));
    const list = state.vitals.filter((v) => v.type === type && v.date >= from);
    return U.avg(list.map((v) => v.value));
  },

  avgMetric2(state, type, days = 7) {
    const from = U.isoOffset(-(days - 1));
    const list = state.vitals.filter((v) => v.type === type && v.date >= from && v.value2 != null);
    return U.avg(list.map((v) => v.value2));
  },

  workoutsThisWeek(state) {
    const from = U.isoOffset(-6);
    return state.workouts.filter((w) => w.date >= from);
  },

  healthScore(state) {
    const parts = [];
    const goals = state.goals || {};

    // 1) Medication adherence — 30 pts
    const adh = this.adherence(state, 7).pct;
    parts.push({ label: 'Medication adherence', pts: (Math.min(adh, 100) / 100) * 30, max: 30, detail: `${adh}% this week` });

    // 2) Sleep — 15 pts
    const sleep = this.avgMetric(state, 'sleep', 7);
    if (sleep > 0) parts.push({ label: 'Sleep', pts: Math.min(sleep / (goals.sleepH || 8), 1) * 15, max: 15, detail: `${sleep.toFixed(1)} h avg` });

    // 3) Steps — 15 pts
    const steps = this.avgMetric(state, 'steps', 7);
    if (steps > 0) parts.push({ label: 'Activity', pts: Math.min(steps / (goals.steps || 10000), 1) * 15, max: 15, detail: `${Math.round(steps).toLocaleString()} steps avg` });

    // 4) Hydration — 10 pts
    const water = this.avgMetric(state, 'water', 7);
    if (water > 0) parts.push({ label: 'Hydration', pts: Math.min(water / (goals.waterMl || 2500), 1) * 10, max: 10, detail: `${Math.round(water)} ml avg` });

    // 5) Training consistency — 15 pts
    const wk = this.workoutsThisWeek(state).length;
    parts.push({ label: 'Training', pts: Math.min(wk / (goals.workoutsPerWeek || 4), 1) * 15, max: 15, detail: `${wk}/${goals.workoutsPerWeek || 4} sessions` });

    // 6) Blood pressure — 15 pts
    const sys = this.avgMetric(state, 'blood_pressure', 7);
    const dia = this.avgMetric2(state, 'blood_pressure', 7);
    if (sys > 0) {
      let bpScore = 1;
      if (sys > 130) bpScore = Math.max(0, 1 - (sys - 130) / 25);
      if (dia > 85) bpScore = Math.min(bpScore, Math.max(0, 1 - (dia - 85) / 20));
      parts.push({ label: 'Blood pressure', pts: bpScore * 15, max: 15, detail: `${Math.round(sys)}/${Math.round(dia)} mmHg` });
    }

    const total = Math.round(U.sum(parts.map((p) => p.pts)));
    return { total, parts, adherence: adh };
  },

  scoreWord(n) {
    if (n >= 85) return { word: 'Excellent', color: 'var(--green)' };
    if (n >= 70) return { word: 'On track', color: 'var(--accent)' };
    if (n >= 55) return { word: 'Needs work', color: 'var(--amber)' };
    return { word: 'At risk', color: 'var(--rose)' };
  },

  nextAppointment(state) {
    const today = U.todayISO();
    return state.appointments
      .filter((a) => a.status === 'upcoming' && a.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] || null;
  },

  medsDueNow(state) {
    const now = U.minutesNow();
    const today = U.todayISO();
    const out = [];
    for (const med of state.medications.filter((m) => m.active)) {
      for (const time of med.times) {
        const t = U.timeToMinutes(time);
        const status = Insights.doseStatus(state, med.id, today, time);
        if (status === 'taken') continue;
        if (t <= now + 30) out.push({ med, time, overdue: t < now - 15, soon: t - now <= 30 && t - now >= -15 });
      }
    }
    return out.sort((a, b) => a.time.localeCompare(b.time));
  },
};

/* ------------------------------------------------------------------ */
/* Dashboard view                                                      */
/* ------------------------------------------------------------------ */

const DashboardView = {
  id: 'dashboard',
  title: 'Dashboard',
  navIcon: 'dashboard',
  navLabel: 'Dashboard',

  async render(root, state) {
    const p = state.profile || {};
    const goals = state.goals || {};
    const today = U.todayISO();
    const score = Insights.healthScore(state);
    const sw = Insights.scoreWord(score.total);

    const stepsToday = U.sum(U.onDate(state.vitals, 'steps', today).map((v) => v.value));
    const waterToday = U.sum(U.onDate(state.vitals, 'water', today).map((v) => v.value));
    const sleepLast = U.latest(state.vitals, 'sleep')?.value ?? 0;
    const mealsToday = state.meals.filter((m) => m.date === today);
    const calIn = U.sum(mealsToday.map((m) => m.calories));
    const calOut = U.sum(state.workouts.filter((w) => w.date === today).map((w) => w.calories));
    const dueMeds = Insights.medsDueNow(state);
    const nextApt = Insights.nextAppointment(state);

    /* --- today's med timeline (up to 6) --- */
    const todaysDoses = [];
    for (const med of state.medications.filter((m) => m.active)) {
      for (const time of med.times) todaysDoses.push({ med, time });
    }
    todaysDoses.sort((a, b) => a.time.localeCompare(b.time));
    const nowMin = U.minutesNow();
    const tlHTML = todaysDoses.length ? `<div class="timeline">${todaysDoses.map(({ med, time }) => {
      const status = Insights.doseStatus(state, med.id, today, time);
      const tMin = U.timeToMinutes(time);
      const due = !status && tMin <= nowMin + 45;
      return `
        <div class="tl-item ${status === 'taken' ? 'taken' : ''} ${due ? 'due' : ''}">
          <span class="tl-time">${U.fmtTime(time)}</span>
          <span class="pill-ico" style="background:${med.color}22;color:${med.color}">${icon('pill', 16)}</span>
          <div>
            <div class="med-name">${U.esc(med.name)} <span class="faint small">· ${U.esc(med.dosage)}</span></div>
            <div class="med-sub">${status === 'taken' ? 'Taken ✓' : status === 'skipped' ? 'Skipped' : due ? 'Due now' : 'Scheduled'}</div>
          </div>
          <div class="tl-actions">
            ${status !== 'taken' ? `<button class="tl-check" data-take="${med.id}" data-time="${time}" title="Mark taken">${icon('check', 14)}</button>` : `<button class="tl-check on" data-untake="${med.id}" data-time="${time}" title="Undo">${icon('x', 12)}</button>`}
          </div>
        </div>`;
    }).join('')}</div>` : `<div class="empty"><p>No active medications. Enjoy the clean slate 💚</p></div>`;

    /* --- weight + BP chart data (30d) --- */
    const weightList = U.lastNDays(state.vitals, 'weight', 30);
    const bpList = U.lastNDays(state.vitals, 'blood_pressure', 30);

    /* --- workouts this week by day --- */
    const weekLabels = [];
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = U.isoOffset(-i);
      weekLabels.push(new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }));
      weekData.push(U.sum(state.workouts.filter((w) => w.date === date).map((w) => w.calories)));
    }

    /* --- insights feed --- */
    const feed = [];
    if (dueMeds.length) {
      feed.push({ icon: 'pill', color: 'var(--rose)', bg: 'rgba(251,113,133,.12)', text: `<b>${dueMeds.length} medication${dueMeds.length > 1 ? 's' : ''} due</b> — ${U.esc(dueMeds[0].med.name)} at ${U.fmtTime(dueMeds[0].time)}`, sub: 'Today' });
    }
    if (score.adherence < 90 && score.adherence > 0) {
      feed.push({ icon: 'target', color: 'var(--amber)', bg: 'rgba(251,191,36,.12)', text: `Adherence is <b>${score.adherence}%</b> this week — a missed dose knocks your score down.`, sub: 'Last 7 days' });
    }
    const wTrend = U.trendArrow(weightList);
    if (weightList.length && p.targetWeightKg) {
      const latestW = weightList[weightList.length - 1].value;
      const toGo = latestW - p.targetWeightKg;
      feed.push({ icon: 'scale', color: 'var(--accent)', bg: 'rgba(45,212,191,.12)', text: toGo > 0 ? `You're <b>${toGo.toFixed(1)} kg</b> from your target weight of ${p.targetWeightKg} kg.` : `Target weight reached — ${U.esc(p.name.split(' ')[0])}, you're crushing it.`, sub: `Trend: ${wTrend.label}` });
    }
    if (waterToday && goals.waterMl && waterToday < goals.waterMl * 0.6) {
      feed.push({ icon: 'drop', color: 'var(--sky)', bg: 'rgba(56,189,248,.12)', text: `Hydration is at <b>${Math.round(waterToday)} ml</b> — ${goals.waterMl - waterToday > 0 ? Math.round((goals.waterMl - waterToday) / 250) + ' more glasses' : ''} to hit today's goal.`, sub: 'Today' });
    }
    if (nextApt) {
      const days = Math.round((new Date(nextApt.date) - new Date(today)) / 86400000);
      feed.push({ icon: 'calendar', color: 'var(--violet)', bg: 'rgba(167,139,250,.12)', text: days === 0 ? `<b>${U.esc(nextApt.title)}</b> is today at ${U.fmtTime(nextApt.time)}.` : `<b>${U.esc(nextApt.title)}</b> in ${days} day${days !== 1 ? 's' : ''} with ${U.esc(nextApt.doctor)}.`, sub: 'Upcoming' });
    }

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${U.greeting()}, ${U.esc((p.name || 'friend').split(' ')[0])} 👋</h2>
          <p class="sub">Here's your health at a glance for ${U.fmtDateLong(today)}.</p>
        </div>
        <div class="head-actions">
          <a class="btn" href="#/vitals">${icon('pulse', 15)} Log vitals</a>
          <a class="btn primary" href="#/workouts">${icon('bolt', 15)} Start HIT session</a>
        </div>
      </div>

      <div class="grid cols-4 mb-16">
        <div class="card stat-card" style="grid-row:span 1">
          <div class="stat-top">
            <span class="stat-label">Health Score</span>
            <span class="stat-icon" style="background:rgba(45,212,191,.14);color:var(--accent)">${icon('heart', 18)}</span>
          </div>
          <div class="row" style="gap:16px">
            ${ringSVG(score.total, 118, 10, score.total >= 70 ? '#2dd4bf' : score.total >= 55 ? '#fbbf24' : '#fb7185')}
            <div>
              <div style="font-family:var(--font-display);font-size:30px;font-weight:800;color:${sw.color}">${score.total}<small style="font-size:14px;color:var(--text-dim)">/100</small></div>
              <div class="small" style="color:${sw.color};font-weight:700">${sw.word}</div>
              <div class="small faint mt-8">Adherence ${score.adherence}%</div>
            </div>
          </div>
        </div>

        ${this.statCard('steps', 'Steps', stepsToday.toLocaleString(), 'steps', goals.steps, stepsToday / (goals.steps || 1), '#38bdf8')}
        ${this.statCard('drop', 'Water', Math.round(waterToday).toLocaleString(), 'ml', goals.waterMl, waterToday / (goals.waterMl || 1), '#22d3ee')}
        ${this.statCard('moon', 'Sleep', sleepLast.toFixed(1), 'h', goals.sleepH, sleepLast / (goals.sleepH || 8), '#a78bfa')}
        ${this.statCard('flame', 'Calories in', calIn.toLocaleString(), 'kcal', goals.caloriesIn, calIn / (goals.caloriesIn || 2200), calIn / (goals.caloriesIn || 2200) > 1.05 ? 'amber' : '#4ade80', true)}
        ${this.statCard('run', 'Burned', calOut.toLocaleString(), 'kcal', goals.caloriesOut, calOut / (goals.caloriesOut || 600), '#f97316', true)}
        ${this.statCard('pill', 'Meds taken', `${Insights.adherence(state, 1).taken}/${Insights.adherence(state, 1).expected}`, 'doses today', null, Insights.adherence(state, 1).expected ? Insights.adherence(state, 1).taken / Insights.adherence(state, 1).expected : 1, '#a78bfa')}
      </div>

      <div class="grid halves mb-16">
        <div class="card">
          <div class="card-title">
            <h3>${icon('pill')} Today's medications</h3>
            <a class="link" href="#/medications">Manage →</a>
          </div>
          ${tlHTML}
        </div>

        <div class="card">
          <div class="card-title"><h3>${icon('bell')} Hit-you-up feed</h3><a class="link" href="#/reminders">Reminders →</a></div>
          <div class="feed">
            ${feed.length ? feed.map((f) => `
              <div class="feed-item">
                <span class="feed-ico" style="background:${f.bg};color:${f.color}">${icon(f.icon, 15)}</span>
                <div><p>${f.text}</p><small>${f.sub}</small></div>
              </div>`).join('') : `<div class="empty"><p>All quiet — nothing needs your attention right now.</p></div>`}
          </div>
        </div>
      </div>

      <div class="grid cols-3 mb-16">
        <div class="card">
          <div class="card-title"><h3>${icon('scale')} Weight — 30 days</h3><span class="tag teal">${wTrend.label}</span></div>
          <div class="chart-box"><canvas id="dashWeightChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title"><h3>${icon('heart')} Blood pressure — 30 days</h3><span class="tag rose">${Math.round(U.avg(bpList.map((v) => v.value)))}/${Math.round(U.avg(bpList.map((v) => v.value2)))} avg</span></div>
          <div class="chart-box"><canvas id="dashBpChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title"><h3>${icon('flame')} Training load — 7 days</h3><span class="tag amber">${Insights.workoutsThisWeek(state).length} sessions</span></div>
          <div class="chart-box"><canvas id="dashWeekChart"></canvas></div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-title"><h3>${icon('stethoscope')} Next appointment</h3><a class="link" href="#/appointments">All →</a></div>
          ${nextApt ? `
            <div class="apt-card">
              <div class="apt-date"><b>${new Date(nextApt.date + 'T00:00:00').getDate()}</b><span>${new Date(nextApt.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })}</span></div>
              <div style="min-width:0">
                <h4 style="margin:0 0 3px">${U.esc(nextApt.title)}</h4>
                <div class="small muted">${U.esc(nextApt.doctor)} · ${U.esc(nextApt.specialty || '')}</div>
                <div class="small faint mt-8">${icon('clock', 12)} ${U.fmtTime(nextApt.time)} &nbsp; ${icon('location', 12)} ${U.esc(nextApt.location)}</div>
                ${nextApt.notes ? `<div class="small faint mt-8">📝 ${U.esc(nextApt.notes)}</div>` : ''}
              </div>
            </div>` : `<div class="empty"><p>No upcoming appointments.</p><a class="btn sm" href="#/appointments">Book one</a></div>`}
        </div>

        <div class="card">
          <div class="card-title"><h3>${icon('target')} Score breakdown</h3></div>
          ${score.parts.map((part) => `
            <div class="mb-12">
              <div class="row spread small mb-8">
                <span>${U.esc(part.label)} <span class="faint">· ${U.esc(part.detail)}</span></span>
                <b>${Math.round(part.pts)}/${part.max}</b>
              </div>
              <div class="bar"><i style="width:${(part.pts / part.max) * 100}%"></i></div>
            </div>`).join('')}
        </div>
      </div>
    `;

    /* --- charts --- */
    if (weightList.length) {
      ChartRegistry.create('dashWeightChart', {
        type: 'line',
        data: {
          labels: weightList.map((v) => U.fmtDate(v.date)),
          datasets: [{
            data: weightList.map((v) => v.value),
            borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,.12)',
            fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} kg` } } },
          scales: { x: CHART_GRID, y: { ...CHART_GRID, ticks: { maxTicksLimit: 5, callback: (v) => v + ' kg' } } },
        },
      });
    }

    if (bpList.length) {
      ChartRegistry.create('dashBpChart', {
        type: 'line',
        data: {
          labels: bpList.map((v) => U.fmtDate(v.date)),
          datasets: [
            { label: 'Systolic', data: bpList.map((v) => v.value), borderColor: '#fb7185', tension: 0.35, pointRadius: 0, borderWidth: 2 },
            { label: 'Diastolic', data: bpList.map((v) => v.value2), borderColor: '#a78bfa', tension: 0.35, pointRadius: 0, borderWidth: 2 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } } },
          scales: { x: CHART_GRID, y: { ...CHART_GRID, ticks: { maxTicksLimit: 5 } } },
        },
      });
    }

    ChartRegistry.create('dashWeekChart', {
      type: 'bar',
      data: {
        labels: weekLabels,
        datasets: [{ data: weekData, backgroundColor: weekData.map((d) => (d ? 'rgba(249,115,22,.75)' : 'rgba(148,163,184,.15)')), borderRadius: 6, maxBarThickness: 26 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} kcal` } } },
        scales: { x: CHART_GRID, y: { ...CHART_GRID, ticks: { maxTicksLimit: 5, callback: (v) => v + '' } } },
      },
    });

    /* --- interactions --- */
    root.querySelectorAll('[data-take]').forEach((btn) => {
      btn.onclick = async () => {
        try {
          await API.logDose(btn.dataset.take, today, btn.dataset.time, 'taken');
          toast('Dose logged', 'Nice — keep the streak going.', 'success');
          await App.refresh();
        } catch (e) { toast('Failed', e.message, 'error'); }
      };
    });
    root.querySelectorAll('[data-untake]').forEach((btn) => {
      btn.onclick = async () => {
        try {
          await API.logDose(btn.dataset.untake, today, btn.dataset.time, 'skipped');
          await App.refresh();
        } catch (e) { toast('Failed', e.message, 'error'); }
      };
    });
  },

  statCard(iconName, label, value, unit, goal, ratio, color, over = false) {
    const pct = Math.round(Math.min(ratio, 1.5) * 100);
    const barCls = ratio > 1.05 && over ? 'amber' : '';
    const goalTxt = goal ? ` of ${typeof goal === 'number' && goal >= 1000 ? goal.toLocaleString() : goal} ${unit}` : '';
    return `
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-label">${label}</span>
          <span class="stat-icon" style="background:${color}22;color:${color}">${icon(iconName, 17)}</span>
        </div>
        <div class="stat-value">${value}<small>${unit}</small></div>
        <div>
          <div class="bar ${barCls}"><i style="width:${Math.min(pct, 100)}%"></i></div>
          <div class="stat-foot mt-8">${pct}% of goal${goalTxt}</div>
        </div>
      </div>`;
  },
};
