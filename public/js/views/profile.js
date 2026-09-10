/* HIT-ME-UP — Profile & goals view */
'use strict';

const ProfileView = {
  id: 'profile',
  title: 'Profile',
  navIcon: 'user',
  navLabel: 'Profile & Goals',

  async render(root, state) {
    const p = state.profile || {};
    const g = state.goals || {};
    const conditions = (p.conditions || []).join(', ');
    const allergies = (p.allergies || []).join(', ');

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Profile &amp; Goals</h2>
          <p class="sub">Your data, your device. Everything is stored on your own server.</p>
        </div>
        <div class="head-actions">
          <button class="btn" id="exportBtn">${icon('download', 15)} Export data (JSON)</button>
          <button class="btn danger" id="resetBtn">${icon('refresh', 15)} Reset to demo data</button>
        </div>
      </div>

      <div class="grid cols-2 mb-16">
        <div class="card">
          <div class="card-title"><h3>${icon('user')} Personal information</h3></div>
          <form id="profileForm">
            <div class="form-grid">
              <div class="field"><label>Full name</label><input name="name" value="${U.esc(p.name || '')}"></div>
              <div class="field"><label>Age</label><input name="age" type="number" min="1" max="120" value="${p.age || ''}"></div>
              <div class="field"><label>Sex</label>
                <select name="sex">
                  ${['', 'female', 'male', 'other', 'prefer not to say'].map((s) => `<option value="${s}" ${p.sex === s ? 'selected' : ''}>${s || '—'}</option>`).join('')}
                </select>
              </div>
              <div class="field"><label>Height (cm)</label><input name="heightCm" type="number" min="50" max="250" value="${p.heightCm || ''}"></div>
              <div class="field"><label>Target weight (kg)</label><input name="targetWeightKg" type="number" min="20" max="300" step="0.1" value="${p.targetWeightKg || ''}"></div>
              <div class="field"><label>Blood type</label>
                <select name="bloodType">
                  ${['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => `<option value="${b}" ${p.bloodType === b ? 'selected' : ''}>${b || '—'}</option>`).join('')}
                </select>
              </div>
              <div class="full field"><label>Conditions <span class="hint">(comma-separated)</span></label><input name="conditions" placeholder="e.g. Hypertension, Asthma" value="${U.esc(conditions)}"></div>
              <div class="full field"><label>Allergies <span class="hint">(comma-separated)</span></label><input name="allergies" placeholder="e.g. Penicillin, Peanuts" value="${U.esc(allergies)}"></div>
              <div class="field"><label>Emergency contact</label><input name="ecName" placeholder="Name" value="${U.esc(p.emergencyContact?.name || '')}"></div>
              <div class="field"><label>Emergency phone</label><input name="ecPhone" placeholder="+1 555 0100" value="${U.esc(p.emergencyContact?.phone || '')}"></div>
              <div class="full field"><label>Primary care provider</label><input name="doctor" placeholder="Doctor / clinic" value="${U.esc(p.doctor || '')}"></div>
            </div>
            <div class="mt-16"><button class="btn primary" type="submit">${icon('check', 14)} Save profile</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title"><h3>${icon('target')} Daily & weekly goals</h3></div>
          <form id="goalsForm">
            <div class="form-grid">
              <div class="field"><label>Steps / day</label><input name="steps" type="number" min="1000" max="50000" step="500" value="${g.steps ?? 10000}"></div>
              <div class="field"><label>Water / day (ml)</label><input name="waterMl" type="number" min="500" max="6000" step="250" value="${g.waterMl ?? 2500}"></div>
              <div class="field"><label>Sleep / night (h)</label><input name="sleepH" type="number" min="4" max="12" step="0.5" value="${g.sleepH ?? 8}"></div>
              <div class="field"><label>Calories in / day</label><input name="caloriesIn" type="number" min="800" max="5000" step="50" value="${g.caloriesIn ?? 2200}"></div>
              <div class="field"><label>Calories burned / day</label><input name="caloriesOut" type="number" min="100" max="3000" step="50" value="${g.caloriesOut ?? 600}"></div>
              <div class="field"><label>Workouts / week</label><input name="workoutsPerWeek" type="number" min="1" max="14" value="${g.workoutsPerWeek ?? 4}"></div>
            </div>
            <div class="mt-16"><button class="btn primary" type="submit">${icon('check', 14)} Save goals</button></div>
          </form>

          <hr class="divider">
          <div class="card-title"><h3>${icon('info')} About your data</h3></div>
          <dl class="kv">
            <dt>Storage</dt><dd>Local JSON file on this server (<span class="mono">data/db.json</span>)</dd>
            <dt>Entries</dt><dd>${state.vitals.length} vitals · ${state.doses.length} dose logs · ${state.meals.length} meals · ${state.workouts.length} workouts</dd>
            <dt>Privacy</dt><dd>No third-party analytics, no cloud sync — it never leaves your machine.</dd>
          </dl>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>${icon('heart')} Emergency card</h3><span class="tag rose">Shows critical info at a glance</span></div>
        <div class="grid cols-4">
          <div><div class="stat-label">Blood type</div><div class="stat-value" style="font-size:22px">${U.esc(p.bloodType || '—')}</div></div>
          <div><div class="stat-label">Conditions</div><div class="small muted mt-8">${conditions ? U.esc(conditions) : 'None recorded'}</div></div>
          <div><div class="stat-label">Allergies</div><div class="small muted mt-8">${allergies ? U.esc(allergies) : 'None recorded'}</div></div>
          <div><div class="stat-label">Emergency contact</div><div class="small muted mt-8">${p.emergencyContact?.name ? `${U.esc(p.emergencyContact.name)} (${U.esc(p.emergencyContact.relation || '')}) · ${U.esc(p.emergencyContact.phone)}` : '—'}</div></div>
        </div>
      </div>
    `;

    root.querySelector('#profileForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const splitList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
      try {
        await API.saveProfile({
          name: fd.get('name').trim(),
          age: parseInt(fd.get('age'), 10) || null,
          sex: fd.get('sex'),
          heightCm: parseFloat(fd.get('heightCm')) || null,
          targetWeightKg: parseFloat(fd.get('targetWeightKg')) || null,
          bloodType: fd.get('bloodType'),
          conditions: splitList(fd.get('conditions')),
          allergies: splitList(fd.get('allergies')),
          emergencyContact: {
            ...p.emergencyContact,
            name: fd.get('ecName').trim(),
            phone: fd.get('ecPhone').trim(),
          },
          doctor: fd.get('doctor').trim(),
        });
        toast('Profile saved', 'Looking sharp.', 'success');
        await App.refresh();
      } catch (err) { toast('Failed', err.message, 'error'); }
    };

    root.querySelector('#goalsForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const num = (v) => parseFloat(v) || 0;
      try {
        await API.saveGoals({
          steps: num(fd.get('steps')),
          waterMl: num(fd.get('waterMl')),
          sleepH: num(fd.get('sleepH')),
          caloriesIn: num(fd.get('caloriesIn')),
          caloriesOut: num(fd.get('caloriesOut')),
          workoutsPerWeek: num(fd.get('workoutsPerWeek')),
        });
        toast('Goals saved', 'The dashboard just got smarter.', 'success');
        await App.refresh();
      } catch (err) { toast('Failed', err.message, 'error'); }
    };

    root.querySelector('#exportBtn').onclick = async () => {
      try {
        const data = await API.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `hit-me-up-export-${U.todayISO()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Export ready', 'Your full health record was downloaded.', 'success');
      } catch (e) { toast('Export failed', e.message, 'error'); }
    };

    root.querySelector('#resetBtn').onclick = async () => {
      if (!confirm('Reset everything to the demo dataset? Your current data will be replaced.')) return;
      try {
        await API.resetDemo();
        toast('Reset complete', 'Fresh demo data loaded.', 'success');
        await App.refresh();
      } catch (e) { toast('Failed', e.message, 'error'); }
    };
  },
};
