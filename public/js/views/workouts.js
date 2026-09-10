/* HIT-ME-UP — Workouts: HIT Lab with interval timer + training log */
'use strict';

const WorkoutsView = {
  id: 'workouts',
  title: 'HIT Lab',
  navIcon: 'bolt',
  navLabel: 'HIT Lab',

  /* timer runtime (survives re-renders via global) */
  timer: null,

  async render(root, state) {
    const week = Insights.workoutsThisWeek(state);
    const goals = state.goals || {};
    const totalMin = U.sum(week.map((w) => w.durationMin));
    const totalCal = U.sum(week.map((w) => w.calories));
    const hiitCount = week.filter((w) => w.type === 'hiit').length;
    const history = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

    const T = this.timer || (this.timer = this.freshTimer());

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>HIT Lab <span class="tag amber">High-Intensity Training</span></h2>
          <p class="sub">The "HIT" in HIT-ME-UP — interval timer + training log in one.</p>
        </div>
        <div class="head-actions">
          <button class="btn primary" id="logWorkoutBtn">${icon('plus', 15)} Log a workout</button>
        </div>
      </div>

      <div class="grid halves mb-16">
        <div class="card timer-card">
          <div class="card-title" style="text-align:left"><h3>${icon('bolt')} Interval timer</h3>
            <span class="tag slate">beeps on</span>
          </div>

          <div class="row wrap" style="justify-content:center;gap:14px;margin-top:6px">
            ${this.cfgInput('Prep', 'prepSecs', T.cfg.prepSecs, 3, 30)}
            ${this.cfgInput('Work', 'workSecs', T.cfg.workSecs, 5, 300)}
            ${this.cfgInput('Rest', 'restSecs', T.cfg.restSecs, 0, 300)}
            ${this.cfgInput('Rounds', 'rounds', T.cfg.rounds, 1, 20)}
          </div>

          <div class="timer-phase ${T.running ? (T.phase === 'work' ? 'work' : T.phase === 'rest' ? 'rest' : 'prep') : ''}" id="timerPhase">${T.running ? this.phaseLabel(T) : 'READY'}</div>
          <div class="timer-display" id="timerDisplay" style="color:${T.running ? (T.phase === 'work' ? 'var(--accent)' : T.phase === 'rest' ? 'var(--amber)' : 'var(--violet)') : 'var(--text)'}">${this.fmtSecs(T.remaining)}</div>

          <div class="timer-rounds" id="timerRounds">
            ${Array.from({ length: T.cfg.rounds }, (_, i) => `<span class="rd ${i < T.round ? 'done' : i === T.round && T.running ? 'current' : ''}"></span>`).join('')}
          </div>

          <div class="timer-controls">
            <button class="btn primary" id="timerStartBtn" style="min-width:130px">${T.running ? `${icon('pause', 15)} Pause` : `${icon('play', 15)} ${T.done ? 'Restart' : 'Start'}`}</button>
            <button class="btn" id="timerResetBtn">${icon('refresh', 14)} Reset</button>
            <button class="btn" id="timerLogBtn" title="Log this session as a workout">${icon('plus', 14)} Log session</button>
          </div>
          <p class="small faint mt-12">Presets:
        <span class="chip" data-preset="tabata">Tabata 20/10 ×8</span>
        <span class="chip" data-preset="30-60">Sprints 30/60 ×10</span>
        <span class="chip" data-preset="emom">EMOM 60/0 ×10</span>
      </p>
        </div>

        <div class="card">
          <div class="card-title"><h3>${icon('flame')} This week</h3><span class="tag teal">${week.length}/${goals.workoutsPerWeek || 4} sessions</span></div>
          <div class="grid cols-2" style="gap:12px">
            <div class="card" style="background:var(--bg-soft);box-shadow:none">
              <div class="stat-label">Total time</div>
              <div class="stat-value">${Math.floor(totalMin / 60)}<small>h</small> ${totalMin % 60}<small>min</small></div>
            </div>
            <div class="card" style="background:var(--bg-soft);box-shadow:none">
              <div class="stat-label">Calories burned</div>
              <div class="stat-value">${totalCal.toLocaleString()}<small>kcal</small></div>
            </div>
            <div class="card" style="background:var(--bg-soft);box-shadow:none">
              <div class="stat-label">HIT sessions</div>
              <div class="stat-value">${hiitCount}</div>
            </div>
            <div class="card" style="background:var(--bg-soft);box-shadow:none">
              <div class="stat-label">Avg intensity</div>
              <div class="stat-value">${(U.avg(week.map((w) => w.intensity || 3))).toFixed(1)}<small>/5</small></div>
            </div>
          </div>
          <div class="mt-12">
            <div class="row spread small mb-8"><span>Weekly goal progress</span><b>${Math.round((week.length / (goals.workoutsPerWeek || 4)) * 100)}%</b></div>
            <div class="bar amber"><i style="width:${Math.min((week.length / (goals.workoutsPerWeek || 4)) * 100, 100)}%"></i></div>
          </div>
          <div class="chart-box sm mt-16"><canvas id="workoutTypeChart"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>${icon('dumbbell')} Training history</h3><span class="tag slate">${state.workouts.length} total sessions</span></div>
        ${history.length ? history.map((w) => {
          const meta = WORKOUT_TYPES[w.type] || WORKOUT_TYPES.cardio;
          return `
          <div class="wo-item">
            <span class="wo-ico" style="background:${meta.color}22;color:${meta.color}">${icon(meta.icon, 18)}</span>
            <div class="wo-meta" style="flex:1">
              <h4>${U.esc(w.title || meta.label)}</h4>
              <div class="small faint">${U.fmtDateLong(w.date)}${w.detail ? ' · ' + U.esc(w.detail) : ''}</div>
            </div>
            <span class="intensity" title="Intensity">${'●'.repeat(w.intensity || 3)}<span style="opacity:.25">${'●'.repeat(5 - (w.intensity || 3))}</span></span>
            <div class="center" style="width:70px"><b class="mono">${w.durationMin}</b><div class="small faint">min</div></div>
            <div class="center" style="width:80px"><b class="mono">${w.calories}</b><div class="small faint">kcal</div></div>
            <button class="icon-btn" style="width:32px;height:32px" data-del="${w.id}" title="Delete">${icon('trash', 13)}</button>
          </div>`;
        }).join('') : `<div class="empty">${icon('inbox')}<p>No workouts logged yet. Start the timer and get after it.</p></div>`}
      </div>
    `;

    /* type distribution donut */
    const counts = Object.keys(WORKOUT_TYPES).map((k) => state.workouts.filter((w) => w.type === k).length);
    if (U.sum(counts) > 0 && typeof Chart !== 'undefined') {
      ChartRegistry.create('workoutTypeChart', {
        type: 'doughnut',
        data: {
          labels: Object.values(WORKOUT_TYPES).map((m) => m.label),
          datasets: [{ data: counts, backgroundColor: Object.values(WORKOUT_TYPES).map((m) => m.color + 'cc'), borderWidth: 0, hoverOffset: 6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '68%',
          plugins: { legend: { position: 'right', labels: { boxWidth: 9, usePointStyle: true } } },
        },
      });
    }

    /* --- timer wiring --- */
    root.querySelectorAll('.timer-cfg input').forEach((inp) => {
      inp.onchange = () => {
        T.cfg[inp.name] = Math.max(+inp.min, Math.min(+inp.max, parseInt(inp.value, 10) || +inp.min));
        inp.value = T.cfg[inp.name];
        if (!T.running) this.resetTimerUI();
      };
    });
    root.querySelectorAll('[data-preset]').forEach((chip) => {
      chip.onclick = () => {
        const presets = {
          tabata: { prepSecs: 10, workSecs: 20, restSecs: 10, rounds: 8 },
          '30-60': { prepSecs: 15, workSecs: 30, restSecs: 60, rounds: 10 },
          emom: { prepSecs: 10, workSecs: 60, restSecs: 0, rounds: 10 },
        };
        Object.assign(T.cfg, presets[chip.dataset.preset]);
        this.resetTimer();
        toast('Preset loaded', chip.textContent, 'success', 1800);
      };
    });
    root.querySelector('#timerStartBtn').onclick = () => this.toggleTimer();
    root.querySelector('#timerResetBtn').onclick = () => this.resetTimer();
    root.querySelector('#timerLogBtn').onclick = () => this.logSession();
    root.querySelector('#logWorkoutBtn').onclick = () => this.openWorkoutModal();

    root.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      if (!confirm('Delete this workout?')) return;
      try { await API.remove('workouts', b.dataset.del); toast('Workout deleted', '', 'success', 1800); await App.refresh(); } catch (e) { toast('Failed', e.message, 'error'); }
    });

    this.tick(true); // sync display with any running timer
  },

  /* ---------------- interval timer engine ---------------- */

  freshTimer() {
    return {
      cfg: { prepSecs: 10, workSecs: 30, restSecs: 30, rounds: 8 },
      phase: 'idle', /* idle | prep | work | rest | done */
      round: 0,
      remaining: 10,
      running: false,
      done: false,
      intervalId: null,
      lastTick: 0,
      elapsed: 0, /* total seconds actually run, for logging */
    };
  },

  cfgInput(label, name, val, min, max) {
    return `
      <div class="timer-cfg field" style="width:96px">
        <label class="small" style="text-align:center">${label}</label>
        <input type="number" name="${name}" value="${val}" min="${min}" max="${max}" step="1" style="text-align:center;font-family:var(--font-display);font-weight:700;font-size:17px">
      </div>`;
  },

  fmtSecs(s) {
    s = Math.max(0, Math.ceil(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },

  phaseLabel(T) {
    return T.phase === 'prep' ? 'GET READY' : T.phase === 'work' ? `WORK — Round ${T.round + 1}` : T.phase === 'rest' ? `REST — Round ${T.round + 1}/${T.cfg.rounds}` : 'DONE';
  },

  beep(freq = 880, ms = 120, gain = 0.04) {
    try {
      const ctx = this._audioCtx || (this._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(ctx.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      osc.stop(ctx.currentTime + ms / 1000);
    } catch { /* audio unavailable */ }
  },

  toggleTimer() {
    const T = this.timer;
    if (T.running) {
      T.running = false;
      clearInterval(T.intervalId);
      this.updateTimerUI();
    } else {
      if (T.done || T.phase === 'idle') this.resetTimerState();
      if (T.phase === 'idle') { T.phase = 'prep'; T.remaining = T.cfg.prepSecs; T.elapsed = 0; }
      T.running = true;
      T.lastTick = performance.now();
      clearInterval(T.intervalId);
      T.intervalId = setInterval(() => this.tick(), 250);
      this.updateTimerUI();
      this.beep(660, 150);
    }
  },

  resetTimerState() {
    const T = this.timer;
    Object.assign(T, { phase: 'idle', round: 0, remaining: T.cfg.prepSecs, running: false, done: false, elapsed: 0 });
    clearInterval(T.intervalId);
  },

  resetTimer() {
    this.resetTimerState();
    this.resetTimerUI();
  },

  resetTimerUI() {
    const T = this.timer;
    const disp = document.getElementById('timerDisplay');
    const phase = document.getElementById('timerPhase');
    const rounds = document.getElementById('timerRounds');
    const btn = document.getElementById('timerStartBtn');
    if (!disp) return;
    disp.textContent = this.fmtSecs(T.cfg.prepSecs);
    disp.style.color = 'var(--text)';
    phase.textContent = 'READY';
    phase.className = 'timer-phase';
    if (rounds) rounds.innerHTML = Array.from({ length: T.cfg.rounds }, () => '<span class="rd"></span>').join('');
    if (btn) btn.innerHTML = `${icon('play', 15)} Start`;
  },

  tick(initial = false) {
    const T = this.timer;
    if (!T.running && !initial) return;
    if (T.running) {
      const now = performance.now();
      const dt = (now - T.lastTick) / 1000;
      T.lastTick = now;
      T.remaining -= dt;
      T.elapsed += dt;

      if (T.remaining <= 3.05 && T.remaining > 0 && Math.ceil(T.remaining) !== this._lastBeeped) {
        this._lastBeeped = Math.ceil(T.remaining);
        this.beep(700, 90);
      }

      if (T.remaining <= 0) this.advancePhase();
    }
    this.updateTimerUI();
  },

  advancePhase() {
    const T = this.timer;
    if (T.phase === 'prep') {
      T.phase = 'work';
      T.remaining = T.cfg.workSecs;
      this.beep(980, 250, 0.06);
    } else if (T.phase === 'work') {
      T.round++;
      if (T.round >= T.cfg.rounds) {
        /* finished! */
        T.phase = 'done';
        T.running = false;
        T.done = true;
        clearInterval(T.intervalId);
        this.beep(1180, 500, 0.07);
        setTimeout(() => this.beep(1180, 500, 0.07), 550);
        toast('Session complete! 💪', `${T.cfg.rounds} rounds — log it while it's fresh.`, 'success', 6000);
        return;
      }
      if (T.cfg.restSecs > 0) {
        T.phase = 'rest';
        T.remaining = T.cfg.restSecs;
        this.beep(520, 250, 0.05);
      } else {
        T.remaining = T.cfg.workSecs; /* EMOM-style, straight to next round */
        this.beep(980, 200, 0.06);
      }
    } else if (T.phase === 'rest') {
      T.phase = 'work';
      T.remaining = T.cfg.workSecs;
      this.beep(980, 250, 0.06);
    }
    this._lastBeeped = null;
  },

  updateTimerUI() {
    const T = this.timer;
    const disp = document.getElementById('timerDisplay');
    const phase = document.getElementById('timerPhase');
    const rounds = document.getElementById('timerRounds');
    const btn = document.getElementById('timerStartBtn');
    if (!disp || !phase) return;

    disp.textContent = this.fmtSecs(T.remaining);
    const colors = { prep: 'var(--violet)', work: 'var(--accent)', rest: 'var(--amber)', done: 'var(--green)', idle: 'var(--text)' };
    disp.style.color = colors[T.phase] || 'var(--text)';

    phase.textContent = this.phaseLabel(T);
    phase.className = `timer-phase ${T.phase}`;

    if (rounds) {
      rounds.innerHTML = Array.from({ length: T.cfg.rounds }, (_, i) =>
        `<span class="rd ${i < T.round ? 'done' : i === T.round && T.running && T.phase !== 'done' ? 'current' : ''}"></span>`).join('');
    }
    if (btn) {
      btn.innerHTML = T.running ? `${icon('pause', 15)} Pause` : `${icon('play', 15)} ${T.done ? 'Restart' : 'Start'}`;
    }
  },

  async logSession() {
    const T = this.timer;
    const minutes = Math.max(1, Math.round((T.elapsed || (T.cfg.prepSecs + T.cfg.rounds * (T.cfg.workSecs + T.cfg.restSecs))) / 60));
    this.openWorkoutModal({
      type: 'hiit',
      title: `Interval session — ${T.cfg.workSecs}s/${T.cfg.restSecs}s × ${T.cfg.rounds}`,
      detail: `${T.cfg.rounds} rounds · ${T.cfg.workSecs}s work / ${T.cfg.restSecs}s rest`,
      durationMin: minutes,
      calories: Math.round(minutes * 12),
      intensity: 4,
    });
  },

  openWorkoutModal(w = {}) {
    openModal({
      title: w.id ? 'Edit workout' : 'Log a workout',
      body: `
        <div class="form-grid">
          <div class="field"><label>Type</label>
            <select name="type">
              ${Object.entries(WORKOUT_TYPES).map(([k, m]) => `<option value="${k}" ${w.type === k ? 'selected' : ''}>${m.label}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Date *</label><input name="date" type="date" required value="${w.date || U.todayISO()}" max="${U.todayISO()}"></div>
          <div class="full field"><label>Title *</label><input name="title" required placeholder="e.g. Tabata: burpees & squats" value="${U.esc(w.title || '')}"></div>
          <div class="full field"><label>Details</label><input name="detail" placeholder="Rounds, exercises, pace…" value="${U.esc(w.detail || '')}"></div>
          <div class="field"><label>Duration (min) *</label><input name="durationMin" type="number" required min="1" max="600" value="${w.durationMin || 30}"></div>
          <div class="field"><label>Calories</label><input name="calories" type="number" min="0" max="3000" value="${w.calories || 250}"></div>
          <div class="full field"><label>Intensity: <b id="intensityVal">${w.intensity || 3}</b>/5</label>
            <input name="intensity" type="range" min="1" max="5" value="${w.intensity || 3}" oninput="document.getElementById('intensityVal').textContent=this.value">
          </div>
          <div class="full field"><label>Notes</label><textarea name="notes" placeholder="How did it feel?">${U.esc(w.notes || '')}</textarea></div>
        </div>`,
      submitLabel: 'Save workout',
      onSubmit: async (fd) => {
        const payload = {
          type: fd.get('type'),
          date: fd.get('date'),
          title: fd.get('title').trim(),
          detail: fd.get('detail').trim(),
          durationMin: parseInt(fd.get('durationMin'), 10) || 30,
          calories: parseInt(fd.get('calories'), 10) || 0,
          intensity: parseInt(fd.get('intensity'), 10) || 3,
          notes: fd.get('notes').trim(),
        };
        if (w.id) await API.update('workouts', w.id, payload);
        else await API.add('workouts', payload);
        toast('Workout logged', payload.title, 'success');
        await App.refresh();
      },
    });
  },
};
