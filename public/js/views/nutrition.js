/* HIT-ME-UP — Nutrition view: calories, macros, hydration */
'use strict';

const MEAL_ORDER = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };

const NutritionView = {
  id: 'nutrition',
  title: 'Nutrition',
  navIcon: 'apple',
  navLabel: 'Nutrition',
  date: null,

  async render(root, state) {
    const date = this.date || U.todayISO();
    const goals = state.goals || {};
    const meals = state.meals.filter((m) => m.date === date).sort((a, b) => (MEAL_ORDER[a.type] ?? 9) - (MEAL_ORDER[b.type] ?? 9));
    const cal = U.sum(meals.map((m) => m.calories));
    const protein = U.sum(meals.map((m) => m.protein || 0));
    const carbs = U.sum(meals.map((m) => m.carbs || 0));
    const fat = U.sum(meals.map((m) => m.fat || 0));

    const waterEntries = U.onDate(state.vitals, 'water', date);
    const waterToday = U.sum(waterEntries.map((v) => v.value));
    const waterGoal = goals.waterMl || 2500;
    const glasses = Math.round(waterGoal / 250);
    const fullGlasses = Math.min(glasses, Math.floor(waterToday / 250));

    const pctCal = goals.caloriesIn ? Math.round((cal / goals.caloriesIn) * 100) : 0;
    const over = cal > (goals.caloriesIn || 2200);

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Nutrition &amp; Hydration</h2>
          <p class="sub">Fuel the machine. ${date === U.todayISO() ? 'Today' : U.fmtDateLong(date)}.</p>
        </div>
        <div class="head-actions">
          <input type="date" id="nutritionDate" value="${date}" max="${U.todayISO()}" style="width:auto">
          <button class="btn primary" id="addMealBtn">${icon('plus', 15)} Log a meal</button>
        </div>
      </div>

      <div class="grid cols-3 mb-16">
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Calories in</span><span class="stat-icon" style="background:rgba(74,222,128,.14);color:var(--green)">${icon('apple', 17)}</span></div>
          <div class="stat-value">${cal.toLocaleString()}<small>/ ${(goals.caloriesIn || 2200).toLocaleString()} kcal</small></div>
          <div>
            <div class="bar ${over ? 'rose' : ''}"><i style="width:${Math.min(pctCal, 100)}%"></i></div>
            <div class="stat-foot mt-8">${pctCal}% of budget${over ? ` · ${cal - (goals.caloriesIn || 2200)} over` : ''}</div>
          </div>
        </div>

        <div class="card stat-card">
          <div class="card-title" style="margin-bottom:8px"><h3 style="font-size:13px">${icon('flame')} Macros</h3></div>
          <div class="row" style="gap:14px">
            <div class="chart-box" style="height:120px;width:120px;flex-shrink:0"><canvas id="macroChart"></canvas></div>
            <div style="flex:1">
              <div class="row spread small mb-8"><span style="color:var(--sky)">Protein</span><b>${protein} g</b></div>
              <div class="row spread small mb-8"><span style="color:var(--amber)">Carbs</span><b>${carbs} g</b></div>
              <div class="row spread small mb-8"><span style="color:var(--rose)">Fat</span><b>${fat} g</b></div>
              <hr class="divider" style="margin:8px 0">
              <div class="row spread small"><span class="faint">Est. total</span><b>${protein * 4 + carbs * 4 + fat * 9} kcal</b></div>
            </div>
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Hydration</span><span class="stat-icon" style="background:rgba(56,189,248,.14);color:var(--sky)">${icon('drop', 17)}</span></div>
          <div class="stat-value">${waterToday.toLocaleString()}<small>/ ${waterGoal.toLocaleString()} ml</small></div>
          <div class="water-glasses mt-8" id="waterGlasses">
            ${Array.from({ length: glasses }, (_, i) => `<span class="glass ${i < fullGlasses ? 'full' : ''}" data-glass="${i}" title="${(i + 1) * 250} ml"></span>`).join('')}
          </div>
          <div class="stat-foot mt-8">Tap a glass to log 250 ml — ${waterGoal - waterToday > 0 ? `${Math.ceil((waterGoal - waterToday) / 250)} to go` : 'goal hit! 🎉'}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>${icon('apple')} Meals — ${date === U.todayISO() ? 'today' : U.fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</h3><span class="tag slate">${meals.length} logged</span></div>
        ${meals.length ? meals.map((m) => `
          <div class="meal-row">
            <span class="meal-emoji">${MEAL_TYPES[m.type]?.emoji || '🍽️'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600">${U.esc(m.name)}</div>
              <div class="small faint">${MEAL_TYPES[m.type]?.label || m.type} · P ${m.protein || 0}g · C ${m.carbs || 0}g · F ${m.fat || 0}g</div>
            </div>
            <b class="mono">${m.calories} kcal</b>
            <button class="icon-btn" style="width:32px;height:32px" data-del="${m.id}" title="Delete">${icon('trash', 13)}</button>
          </div>`).join('') : `<div class="empty">${icon('inbox')}<p>No meals logged for this day.</p></div>`}
      </div>
    `;

    /* macros donut */
    if (typeof Chart !== 'undefined') {
      ChartRegistry.create('macroChart', {
        type: 'doughnut',
        data: {
          labels: ['Protein', 'Carbs', 'Fat'],
          datasets: [{ data: [protein, carbs, fat], backgroundColor: ['rgba(56,189,248,.85)', 'rgba(251,191,36,.85)', 'rgba(251,113,133,.85)'], borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '70%',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed} g` } } },
        },
      });
    }

    /* interactions */
    document.getElementById('nutritionDate').onchange = (e) => {
      this.date = e.target.value || U.todayISO();
      App.rerender();
    };
    document.getElementById('addMealBtn').onclick = () => this.openMealModal(date);

    root.querySelectorAll('[data-glass]').forEach((g) => {
      g.onclick = async () => {
        const target = (parseInt(g.dataset.glass, 10) + 1) * 250;
        const current = waterToday;
        if (target <= current) return; // can't unlog by tapping a lower glass
        const toAdd = target - current; // fill up to the tapped glass
        try {
          await API.add('vitals', { type: 'water', date, value: toAdd, note: `${toAdd / 250} glass(es) of water` });
          toast('Hydration logged', `+${toAdd} ml`, 'success', 1600);
          await App.refresh();
        } catch (e) { toast('Failed', e.message, 'error'); }
      };
    });

    root.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      try { await API.remove('meals', b.dataset.del); toast('Meal removed', '', 'success', 1800); await App.refresh(); } catch (e) { toast('Failed', e.message, 'error'); }
    });
  },

  openMealModal(date) {
    openModal({
      title: 'Log a meal',
      body: `
        <div class="form-grid">
          <div class="field"><label>Meal</label>
            <select name="type">${Object.entries(MEAL_TYPES).map(([k, m]) => `<option value="${k}">${m.emoji} ${m.label}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Date</label><input name="date" type="date" value="${date}" max="${U.todayISO()}"></div>
          <div class="full field"><label>What did you eat? *</label><input name="name" required placeholder="e.g. Grilled chicken salad"></div>
          <div class="field"><label>Calories *</label><input name="calories" type="number" required min="0" max="4000" placeholder="500"></div>
          <div class="field"><label>Protein (g)</label><input name="protein" type="number" min="0" max="300" placeholder="30"></div>
          <div class="field"><label>Carbs (g)</label><input name="carbs" type="number" min="0" max="500" placeholder="40"></div>
          <div class="field"><label>Fat (g)</label><input name="fat" type="number" min="0" max="300" placeholder="15"></div>
        </div>`,
      submitLabel: 'Add meal',
      onSubmit: async (fd) => {
        const num = (v) => parseInt(v, 10) || 0;
        await API.add('meals', {
          date: fd.get('date'),
          type: fd.get('type'),
          name: fd.get('name').trim(),
          calories: num(fd.get('calories')),
          protein: num(fd.get('protein')),
          carbs: num(fd.get('carbs')),
          fat: num(fd.get('fat')),
        });
        toast('Meal logged', fd.get('name'), 'success');
        this.date = fd.get('date');
        await App.refresh();
      },
    });
  },
};
