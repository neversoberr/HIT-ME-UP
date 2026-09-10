/* HIT-ME-UP — Vitals view: log & track measurements */
'use strict';

const VitalsView = {
  id: 'vitals',
  title: 'Vitals',
  navIcon: 'pulse',
  navLabel: 'Vitals',
  selectedType: 'weight',

  async render(root, state) {
    const type = this.selectedType;
    const meta = VITAL_TYPES[type];
    const all = state.vitals.filter((v) => v.type === type).sort((a, b) => b.date.localeCompare(a.date));
    const chronological = [...all].reverse();
    const last30 = chronological.filter((v) => v.date >= U.isoOffset(-29));
    const trend = U.trendArrow(chronological);
    const latest = all[0];

    const typeChips = Object.entries(VITAL_TYPES).map(([key, m]) =>
      `<button class="chip ${key === type ? 'active' : ''}" data-type="${key}">${m.label}</button>`).join('');

    const valueField = meta.dual
      ? `<div class="row" style="gap:10px">
          <div class="field" style="flex:1"><label>${meta.v1Label} *</label><input name="value" type="number" required placeholder="120" min="50" max="300" step="1"></div>
          <div class="field" style="flex:1"><label>${meta.v2Label} *</label><input name="value2" type="number" required placeholder="80" min="30" max="200" step="1"></div>
        </div>`
      : `<div class="field"><label>Value (${meta.unit}) *</label><input name="value" type="number" required placeholder="${type === 'mood' ? '1–5' : '0'}" min="0" max="${type === 'mood' ? 5 : 100000}" step="${type === 'weight' || type === 'sleep' ? '0.1' : '1'}"></div>`;

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Vitals &amp; Measurements</h2>
          <p class="sub">Track the numbers. Spot the trends before they spot you.</p>
        </div>
        <div class="head-actions">
          <button class="btn primary" id="logVitalBtn">${icon('plus', 15)} Log a measurement</button>
        </div>
      </div>

      <div class="row wrap mb-16" style="gap:8px">${typeChips}</div>

      <div class="grid cols-4 mb-16">
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Latest</span>
            <span class="stat-icon" style="background:${meta.color}22;color:${meta.color}">${icon(meta.icon, 17)}</span></div>
          <div class="stat-value">${latest ? (meta.dual ? `${latest.value}<small>/</small>${latest.value2}` : latest.value.toLocaleString()) : '—'}<small>${meta.unit}</small></div>
          <div class="stat-foot">${latest ? U.fmtDateLong(latest.date) : 'No data yet'}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">7-day avg</span></div>
          <div class="stat-value">${Insights.avgMetric(state, type, 7).toLocaleString(undefined, { maximumFractionDigits: 1 })}<small>${meta.unit}</small></div>
          <div class="stat-foot">vs 30-day ${Insights.avgMetric(state, type, 30).toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Trend</span></div>
          <div class="mt-8"><span class="trend ${trend.dir}">${trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '▶'} ${U.esc(trend.label)}</span></div>
          <div class="stat-foot">${chronological.length} entries recorded</div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Range (30d)</span></div>
          <div class="stat-value">${last30.length ? Math.min(...last30.map((v) => v.value)).toLocaleString() : '—'}<small>– ${last30.length ? Math.max(...last30.map((v) => v.value)).toLocaleString() : '—'}</small></div>
          <div class="stat-foot">min – max</div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="card-title"><h3>${icon(meta.icon)} ${meta.label} — last 30 days</h3></div>
        <div class="chart-box"><canvas id="vitalChart"></canvas></div>
      </div>

      <div class="card">
        <div class="card-title"><h3>${icon('clock')} Recent entries</h3></div>
        ${all.length ? `
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Date</th><th>Value</th><th>Note</th><th></th></tr></thead>
            <tbody>
              ${all.slice(0, 25).map((v) => `
                <tr>
                  <td>${U.fmtDateLong(v.date)}</td>
                  <td class="mono"><b>${meta.dual ? `${v.value} / ${v.value2}` : v.value.toLocaleString()} ${meta.unit}</b></td>
                  <td class="muted">${U.esc(v.note) || '<span class="faint">—</span>'}</td>
                  <td><div class="row-actions"><button class="icon-btn" style="width:32px;height:32px" data-del="${v.id}" title="Delete">${icon('trash', 14)}</button></div></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<div class="empty">${icon('inbox')}<p>No ${meta.label.toLowerCase()} entries yet.</p></div>`}
      </div>
    `;

    /* chart */
    if (last30.length) {
      const datasets = meta.dual
        ? [
            { label: VITAL_TYPES[type].v1Label, data: last30.map((v) => v.value), borderColor: meta.color, tension: 0.35, pointRadius: 0, borderWidth: 2 },
            { label: VITAL_TYPES[type].v2Label, data: last30.map((v) => v.value2), borderColor: '#a78bfa', tension: 0.35, pointRadius: 0, borderWidth: 2 },
          ]
        : [{
            data: last30.map((v) => v.value),
            borderColor: meta.color, backgroundColor: meta.color + '20',
            fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
          }];
      ChartRegistry.create('vitalChart', {
        type: 'line',
        data: { labels: last30.map((v) => U.fmtDate(v.date)), datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: meta.dual, labels: { boxWidth: 10, usePointStyle: true } } },
          scales: { x: CHART_GRID, y: { ...CHART_GRID, ticks: { maxTicksLimit: 6, callback: (v) => v + (type === 'weight' ? ' kg' : '') } } },
        },
      });
    } else {
      document.getElementById('vitalChart').parentElement.innerHTML = '<div class="empty"><p>Log a few entries to see your chart.</p></div>';
    }

    /* interactions */
    root.querySelectorAll('[data-type]').forEach((chipBtn) => {
      chipBtn.onclick = () => {
        this.selectedType = chipBtn.dataset.type;
        App.rerender();
      };
    });

    root.querySelectorAll('[data-del]').forEach((btn) => {
      btn.onclick = async () => {
        try {
          await API.remove('vitals', btn.dataset.del);
          toast('Entry deleted', '', 'success', 2000);
          await App.refresh();
        } catch (e) { toast('Failed', e.message, 'error'); }
      };
    });

    document.getElementById('logVitalBtn').onclick = () => this.openLogModal(type);
  },

  openLogModal(type, preset) {
    const meta = VITAL_TYPES[type];
    const valueField = meta.dual
      ? `<div class="row" style="gap:10px">
          <div class="field" style="flex:1"><label>${meta.v1Label} *</label><input name="value" type="number" required min="50" max="300" placeholder="120"></div>
          <div class="field" style="flex:1"><label>${meta.v2Label} *</label><input name="value2" type="number" required min="30" max="200" placeholder="80"></div>
        </div>`
      : `<div class="field"><label>Value (${meta.unit}) *</label><input name="value" type="number" required min="0" max="${type === 'mood' ? 5 : 100000}" step="${type === 'weight' || type === 'sleep' ? '0.1' : '1'}" placeholder="${type === 'mood' ? '1–5' : '0'}"></div>`;

    openModal({
      title: `Log ${meta.label.toLowerCase()}`,
      body: `
        <div class="form-grid">
          <div class="field"><label>Type</label>
            <select name="type" id="vitalTypeSel">${Object.entries(VITAL_TYPES).map(([k, m]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${m.label} (${m.unit})</option>`).join('')}</select>
          </div>
          <div class="field"><label>Date *</label><input name="date" type="date" required value="${preset?.date || U.todayISO()}" max="${U.todayISO()}"></div>
          <div class="full" id="vitalValueWrap">${valueField}</div>
          <div class="full field"><label>Note</label><input name="note" placeholder="Optional context (e.g. after workout, fasting…)"></div>
        </div>`,
      submitLabel: 'Save entry',
      onOpen: (form) => {
        form.querySelector('#vitalTypeSel').addEventListener('change', (e) => {
          const m = VITAL_TYPES[e.target.value];
          const wrap = form.querySelector('#vitalValueWrap');
          wrap.innerHTML = m.dual
            ? `<div class="row" style="gap:10px">
                <div class="field" style="flex:1"><label>${m.v1Label} *</label><input name="value" type="number" required min="50" max="300" placeholder="120"></div>
                <div class="field" style="flex:1"><label>${m.v2Label} *</label><input name="value2" type="number" required min="30" max="200" placeholder="80"></div>
              </div>`
            : `<div class="field"><label>Value (${m.unit}) *</label><input name="value" type="number" required min="0" max="${e.target.value === 'mood' ? 5 : 100000}" step="${['weight', 'sleep'].includes(e.target.value) ? '0.1' : '1'}" placeholder="${e.target.value === 'mood' ? '1–5' : '0'}"></div>`;
        });
      },
      onSubmit: async (fd) => {
        const payload = {
          type: fd.get('type'),
          date: fd.get('date'),
          value: parseFloat(fd.get('value')),
          note: fd.get('note') || '',
        };
        if (VITAL_TYPES[payload.type].dual) payload.value2 = parseFloat(fd.get('value2'));
        if (!payload.value || Number.isNaN(payload.value)) throw new Error('Please enter a valid value');
        await API.add('vitals', payload);
        this.selectedType = payload.type;
        toast('Measurement logged', `${VITAL_TYPES[payload.type].label} saved.`, 'success');
        await App.refresh();
      },
    });
  },
};
