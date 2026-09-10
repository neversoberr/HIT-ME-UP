/* HIT-ME-UP — Medications view: schedule, adherence, CRUD */
'use strict';

const MedicationsView = {
  id: 'medications',
  title: 'Medications',
  navIcon: 'pill',
  navLabel: 'Medications',

  async render(root, state) {
    const today = U.todayISO();
    const nowMin = U.minutesNow();
    const adh7 = Insights.adherence(state, 7);
    const adh30 = Insights.adherence(state, 30);
    const activeMeds = state.medications.filter((m) => m.active);
    const inactiveMeds = state.medications.filter((m) => !m.active);

    /* today's full timeline */
    const doses = [];
    for (const med of activeMeds) for (const time of med.times) doses.push({ med, time });
    doses.sort((a, b) => a.time.localeCompare(b.time));

    const timelineHTML = doses.length ? `<div class="timeline">${doses.map(({ med, time }) => {
      const status = Insights.doseStatus(state, med.id, today, time);
      const tMin = U.timeToMinutes(time);
      const due = !status && tMin <= nowMin + 45;
      return `
        <div class="tl-item ${status === 'taken' ? 'taken' : ''} ${due ? 'due' : ''}">
          <span class="tl-time">${U.fmtTime(time)}</span>
          <span class="pill-ico" style="background:${med.color}22;color:${med.color}">${icon('pill', 16)}</span>
          <div>
            <div class="med-name">${U.esc(med.name)} <span class="faint small">· ${U.esc(med.dosage)} ${U.esc(med.form || '')}</span></div>
            <div class="med-sub">${status === 'taken' ? 'Taken ✓' : status === 'skipped' ? 'Skipped' : status === 'missed' ? 'Missed' : due ? 'Due now' : 'Scheduled'}</div>
          </div>
          <div class="tl-actions">
            ${status !== 'taken'
              ? `<button class="tl-check" data-take="${med.id}" data-time="${time}" title="Mark taken">${icon('check', 14)}</button>
                 <button class="tl-check" data-skip="${med.id}" data-time="${time}" title="Skip" style="color:var(--amber)">${icon('skip', 12)}</button>`
              : `<button class="tl-check on" data-untake="${med.id}" data-time="${time}" title="Undo">${icon('x', 12)}</button>`}
          </div>
        </div>`;
    }).join('')}</div>` : `<div class="empty">${icon('inbox')}<p>No active medications.</p><button class="btn primary sm" id="addMedEmpty">Add medication</button></div>`;

    const medCard = (med) => `
      <div class="med-card ${med.active ? '' : 'inactive'}">
        <div class="stripe" style="background:${med.color || 'var(--accent)'}"></div>
        <div class="med-head">
          <div style="min-width:0">
            <h4>${U.esc(med.name)}</h4>
            <div class="small muted">${U.esc(med.dosage)} · ${U.esc(med.form || 'tablet')} · ${U.esc(med.frequency || 'daily')}</div>
          </div>
          <span class="right tag ${med.active ? 'teal' : 'slate'}">${med.active ? 'Active' : 'Paused'}</span>
        </div>
        <div class="med-times">${(med.times || []).map((t) => `<span class="tag slate">${icon('clock', 11)} ${U.fmtTime(t)}</span>`).join('')}</div>
        ${med.instructions ? `<div class="small faint mb-12">💡 ${U.esc(med.instructions)}</div>` : ''}
        <div class="row" style="gap:6px">
          <button class="btn sm" data-edit="${med.id}">${icon('edit', 13)} Edit</button>
          <button class="btn sm" data-toggle="${med.id}">${med.active ? 'Pause' : 'Resume'}</button>
          <button class="btn sm danger right" data-del="${med.id}">${icon('trash', 13)}</button>
        </div>
      </div>`;

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Medications</h2>
          <p class="sub">Never miss a dose — HIT-ME-UP will ping you when it's time.</p>
        </div>
        <div class="head-actions">
          <button class="btn primary" id="addMedBtn">${icon('plus', 15)} Add medication</button>
        </div>
      </div>

      <div class="grid cols-3 mb-16">
        <div class="card stat-card">
          <div class="row" style="gap:16px">
            ${ringSVG(adh7.pct, 108, 10, adh7.pct >= 85 ? '#4ade80' : adh7.pct >= 65 ? '#fbbf24' : '#fb7185')}
            <div>
              <div class="stat-label">7-day adherence</div>
              <div class="stat-value">${adh7.pct}<small>%</small></div>
              <div class="stat-foot">${adh7.taken}/${adh7.expected} doses taken</div>
            </div>
          </div>
        </div>
        <div class="card stat-card">
          <div class="row" style="gap:16px">
            ${ringSVG(adh30.pct, 108, 10, adh30.pct >= 85 ? '#4ade80' : adh30.pct >= 65 ? '#fbbf24' : '#fb7185')}
            <div>
              <div class="stat-label">30-day adherence</div>
              <div class="stat-value">${adh30.pct}<small>%</small></div>
              <div class="stat-foot">${adh30.taken}/${adh30.expected} doses taken</div>
            </div>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Today</span><span class="stat-icon" style="background:rgba(167,139,250,.15);color:var(--violet)">${icon('pill', 17)}</span></div>
          <div class="stat-value">${doses.filter((d) => Insights.doseStatus(state, d.med.id, today, d.time) === 'taken').length}<small>/ ${doses.length} taken</small></div>
          <div>
            <div class="bar violet"><i style="width:${doses.length ? (doses.filter((d) => Insights.doseStatus(state, d.med.id, today, d.time) === 'taken').length / doses.length) * 100 : 0}%"></i></div>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="card-title"><h3>${icon('clock')} Today's schedule</h3><span class="tag teal">${U.fmtDateLong(today)}</span></div>
        ${timelineHTML}
      </div>

      <div class="card">
        <div class="card-title"><h3>${icon('pill')} Your cabinet</h3><span class="tag slate">${activeMeds.length} active · ${inactiveMeds.length} paused</span></div>
        ${state.medications.length ? `<div class="med-grid">${activeMeds.map(medCard).join('')}${inactiveMeds.map(medCard).join('')}</div>` : `<div class="empty"><p>Your cabinet is empty.</p></div>`}
      </div>
    `;

    /* interactions */
    const addBtn = root.querySelector('#addMedBtn') || root.querySelector('#addMedEmpty');
    if (addBtn) addBtn.onclick = () => this.openMedModal();

    root.querySelectorAll('[data-take]').forEach((b) => b.onclick = () => this.setDose(b.dataset.take, b.dataset.time, 'taken'));
    root.querySelectorAll('[data-skip]').forEach((b) => b.onclick = () => this.setDose(b.dataset.skip, b.dataset.time, 'skipped'));
    root.querySelectorAll('[data-untake]').forEach((b) => b.onclick = () => this.setDose(b.dataset.untake, b.dataset.time, 'skipped'));

    root.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => {
        const med = state.medications.find((m) => m.id === b.dataset.edit);
        if (med) this.openMedModal(med);
      };
    });
    root.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = async () => {
        const med = state.medications.find((m) => m.id === b.dataset.toggle);
        try {
          await API.update('medications', med.id, { active: !med.active });
          toast(med.active ? 'Medication paused' : 'Medication resumed', med.name, 'success');
          await App.refresh();
        } catch (e) { toast('Failed', e.message, 'error'); }
      };
    });
    root.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const med = state.medications.find((m) => m.id === b.dataset.del);
        if (!confirm(`Delete ${med.name} and its dose history?`)) return;
        try {
          await API.remove('medications', med.id);
          toast('Medication deleted', med.name, 'success');
          await App.refresh();
        } catch (e) { toast('Failed', e.message, 'error'); }
      };
    });
  },

  async setDose(medId, time, status) {
    try {
      await API.logDose(medId, U.todayISO(), time, status);
      if (status === 'taken') toast('Dose logged', 'Taken as scheduled. Keep it up!', 'success');
      await App.refresh();
    } catch (e) { toast('Failed', e.message, 'error'); }
  },

  openMedModal(med = null) {
    const times = (med?.times || ['08:00']).join(', ');
    openModal({
      title: med ? `Edit ${med.name}` : 'Add medication',
      body: `
        <div class="form-grid">
          <div class="field"><label>Name *</label><input name="name" required placeholder="e.g. Lisinopril" value="${U.esc(med?.name || '')}"></div>
          <div class="field"><label>Dosage *</label><input name="dosage" required placeholder="e.g. 10 mg" value="${U.esc(med?.dosage || '')}"></div>
          <div class="field"><label>Form</label>
            <select name="form">
              ${['tablet', 'capsule', 'liquid', 'injection', 'inhaler', 'topical', 'other'].map((f) => `<option ${med?.form === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Frequency</label>
            <select name="frequency">
              ${['daily', 'twice daily', 'weekly', 'as needed'].map((f) => `<option ${med?.frequency === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
          <div class="field full"><label>Times (24h, comma-separated) *</label>
            <input name="times" required placeholder="08:00, 20:00" value="${U.esc(times)}" pattern="^\\s*([01]\\d|2[0-3]):[0-5]\\d\\s*(,\\s*([01]\\d|2[0-3]):[0-5]\\d\\s*)*$">
            <span class="hint">Example: 08:00, 14:30, 22:00</span>
          </div>
          <div class="field"><label>Color</label><input name="color" type="color" value="${med?.color || '#2dd4bf'}"></div>
          <div class="field"><label>Status</label><select name="active"><option value="true" ${med?.active !== false ? 'selected' : ''}>Active</option><option value="false" ${med?.active === false ? 'selected' : ''}>Paused</option></select></div>
          <div class="full field"><label>Instructions</label><textarea name="instructions" placeholder="e.g. Take with food…">${U.esc(med?.instructions || '')}</textarea></div>
        </div>`,
      submitLabel: med ? 'Save changes' : 'Add medication',
      onSubmit: async (fd) => {
        const times = fd.get('times').split(',').map((t) => t.trim()).filter(Boolean);
        if (!times.length) throw new Error('Add at least one time (HH:MM)');
        const payload = {
          name: fd.get('name').trim(),
          dosage: fd.get('dosage').trim(),
          form: fd.get('form'),
          frequency: fd.get('frequency'),
          times,
          color: fd.get('color'),
          active: fd.get('active') === 'true',
          instructions: fd.get('instructions').trim(),
        };
        if (med) await API.update('medications', med.id, payload);
        else await API.add('medications', payload);
        toast(med ? 'Medication updated' : 'Medication added', payload.name, 'success');
        await App.refresh();
      },
    });
  },
};
