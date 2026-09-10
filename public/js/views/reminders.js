/* HIT-ME-UP — Reminder Center: the "hit me up" engine's control room */
'use strict';

const RemindersView = {
  id: 'reminders',
  title: 'Hit Me Up',
  navIcon: 'bell',
  navLabel: 'Hit Me Up',

  async render(root, state) {
    const settings = state.settings?.notifications || { meds: true, leadMin: 10, water: true, waterEveryMin: 120, appointments: true };
    const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';

    const today = U.todayISO();
    const nowMin = U.minutesNow();

    /* build the day's upcoming reminder schedule */
    const upcoming = [];
    for (const med of state.medications.filter((m) => m.active)) {
      for (const time of med.times) {
        const t = U.timeToMinutes(time);
        if (t < nowMin - 5) continue;
        const status = Insights.doseStatus(state, med.id, today, time);
        if (status === 'taken') continue;
        upcoming.push({ icon: 'pill', color: med.color, time, title: `${med.name} ${med.dosage}`, sub: 'Medication reminder' });
      }
    }
    if (settings.water) {
      const start = 9 * 60, end = 21 * 60;
      for (let t = start + settings.waterEveryMin; t <= end; t += settings.waterEveryMin) {
        if (t < nowMin) continue;
        upcoming.push({ icon: 'drop', color: '#38bdf8', time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, title: 'Hydration check', sub: 'Time for a glass of water' });
      }
    }
    for (const apt of state.appointments.filter((a) => a.status === 'upcoming' && a.date >= today)) {
      const daysAway = Math.round((new Date(apt.date) - new Date(today)) / 86400000);
      if (daysAway === 1) upcoming.push({ icon: 'calendar', color: '#a78bfa', time: '20:00', title: apt.title, sub: `Tomorrow at ${U.fmtTime(apt.time)} — pack any documents` });
      if (daysAway === 0) upcoming.push({ icon: 'calendar', color: '#a78bfa', time: '08:00', title: apt.title, sub: `Today at ${U.fmtTime(apt.time)} with ${apt.doctor}` });
    }
    upcoming.sort((a, b) => a.time.localeCompare(b.time));

    const permCard = perm === 'granted'
      ? `<div class="row" style="gap:12px"><span class="tag green">● Notifications enabled</span><span class="small faint">We'll pop a system notification even when this tab is in the background.</span></div>`
      : perm === 'denied'
        ? `<div class="row" style="gap:12px"><span class="tag rose">● Blocked in browser</span><span class="small faint">Re-enable notifications for hit-me-up in your browser's site settings, then reload.</span></div>`
        : `<div class="row wrap" style="gap:12px"><span class="tag amber">● Not enabled yet</span><button class="btn primary sm" id="enableNotifBtn">${icon('bell', 14)} Enable notifications</button></div>`;

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Hit Me Up — Reminder Center</h2>
          <p class="sub">The part of HIT-ME-UP that actually hits you up. Configure what pings you and when.</p>
        </div>
        <div class="head-actions">
          <button class="btn" id="testNotifBtn">${icon('bell', 15)} Send a test ping</button>
        </div>
      </div>

      <div class="grid halves mb-16">
        <div class="card">
          <div class="card-title"><h3>${icon('bell')} Notification settings</h3></div>

          <div class="mb-16">${permCard}</div>

          <div class="feed mb-16">
            <div class="feed-item" style="border:none;padding:10px 2px">
              <span class="feed-ico" style="background:rgba(45,212,191,.12);color:var(--accent)">${icon('pill', 15)}</span>
              <div style="flex:1">
                <div class="row spread"><b>Medication reminders</b>
                  <label class="switch"><input type="checkbox" id="setMeds" ${settings.meds ? 'checked' : ''}><span class="track"></span></label>
                </div>
                <div class="row mt-8" style="gap:8px">
                  <span class="small faint">Ping me</span>
                  <select id="setLead" style="width:auto;padding:4px 8px" class="small">
                    ${[0, 5, 10, 15, 30].map((m) => `<option value="${m}" ${settings.leadMin === m ? 'selected' : ''}>${m === 0 ? 'right at dose time' : m + ' min before'}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>

            <div class="feed-item" style="border:none;padding:10px 2px">
              <span class="feed-ico" style="background:rgba(56,189,248,.12);color:var(--sky)">${icon('drop', 15)}</span>
              <div style="flex:1">
                <div class="row spread"><b>Hydration nudges</b>
                  <label class="switch"><input type="checkbox" id="setWater" ${settings.water ? 'checked' : ''}><span class="track"></span></label>
                </div>
                <div class="row mt-8" style="gap:8px">
                  <span class="small faint">Every</span>
                  <select id="setWaterEvery" style="width:auto;padding:4px 8px" class="small">
                    ${[60, 90, 120, 180, 240].map((m) => `<option value="${m}" ${settings.waterEveryMin === m ? 'selected' : ''}>${m / 60} h</option>`).join('')}
                  </select>
                  <span class="small faint">between 9:00 and 21:00</span>
                </div>
              </div>
            </div>

            <div class="feed-item" style="border:none;padding:10px 2px">
              <span class="feed-ico" style="background:rgba(167,139,250,.12);color:var(--violet)">${icon('calendar', 15)}</span>
              <div style="flex:1">
                <div class="row spread"><b>Appointment reminders</b>
                  <label class="switch"><input type="checkbox" id="setApts" ${settings.appointments ? 'checked' : ''}><span class="track"></span></label>
                </div>
                <div class="small faint mt-8">Night before + morning of each appointment.</div>
              </div>
            </div>
          </div>

          <button class="btn primary" id="saveSettingsBtn">${icon('check', 15)} Save settings</button>
        </div>

        <div class="card">
          <div class="card-title"><h3>${icon('clock')} Today's ping schedule</h3><span class="tag teal">${upcoming.length} queued</span></div>
          ${upcoming.length ? `<div class="timeline">${upcoming.slice(0, 12).map((r) => `
            <div class="tl-item">
              <span class="tl-time">${U.fmtTime(r.time)}</span>
              <span class="pill-ico" style="background:${r.color}22;color:${r.color}">${icon(r.icon, 15)}</span>
              <div><div class="med-name">${U.esc(r.title)}</div><div class="med-sub">${U.esc(r.sub)}</div></div>
            </div>`).join('')}</div>` : `<div class="empty"><p>Nothing left on today's schedule. 🌙</p></div>`}
          <hr class="divider">
          <div class="small faint">${icon('info', 13)} While HIT-ME-UP is open, the engine checks every 30 seconds and pings you in-app (plus a system notification if enabled). Reload the tab after waking your device to restart the engine.</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>${icon('target')} Why reminders matter</h3></div>
        <div class="grid cols-3">
          <div>
            <h4 style="margin:0 0 6px">💊 Adherence → outcomes</h4>
            <p class="small muted">Medication adherence above 95% is associated with meaningfully better blood-pressure and glucose control. Every logged dose feeds your health score.</p>
          </div>
          <div>
            <h4 style="margin:0 0 6px">💧 Dehydration is sneaky</h4>
            <p class="small muted">Even 1–2% dehydration measurably affects focus and mood. Regular nudges keep you ahead of it without thinking.</p>
          </div>
          <div>
            <h4 style="margin:0 0 6px">📅 No-shows cost you</h4>
            <p class="small muted">Missed appointments delay care and waste clinical slots. A simple night-before ping cuts no-shows dramatically.</p>
          </div>
        </div>
      </div>
    `;

    /* interactions */
    const enableBtn = root.querySelector('#enableNotifBtn');
    if (enableBtn) enableBtn.onclick = async () => {
      const p = await Reminders.requestPermission();
      if (p === 'granted') { toast('Notifications on', 'We can hit you up now.', 'success'); App.rerender(); }
      else toast('Notifications blocked', 'Check your browser site settings.', 'warn');
    };

    root.querySelector('#testNotifBtn').onclick = () => {
      Reminders.notify('Test ping from HIT-ME-UP 💚', 'This is how your reminders will look. Stay healthy!');
      toast('Test sent', 'Check your screen (and notification tray).', 'success');
    };

    root.querySelector('#saveSettingsBtn').onclick = async () => {
      const payload = {
        notifications: {
          meds: root.querySelector('#setMeds').checked,
          leadMin: parseInt(root.querySelector('#setLead').value, 10),
          water: root.querySelector('#setWater').checked,
          waterEveryMin: parseInt(root.querySelector('#setWaterEvery').value, 10),
          appointments: root.querySelector('#setApts').checked,
        },
      };
      try {
        await API.saveSettings(payload);
        toast('Settings saved', 'The reminder engine picked them up.', 'success');
        await App.refresh();
      } catch (e) { toast('Failed', e.message, 'error'); }
    };
  },
};
