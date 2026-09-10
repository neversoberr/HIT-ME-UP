/* HIT-ME-UP — Appointments view */
'use strict';

const AppointmentsView = {
  id: 'appointments',
  title: 'Appointments',
  navIcon: 'calendar',
  navLabel: 'Appointments',

  async render(root, state) {
    const today = U.todayISO();
    const sorted = [...state.appointments].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const upcoming = sorted.filter((a) => a.status === 'upcoming').reverse();
    const past = sorted.filter((a) => a.status !== 'upcoming');

    const aptHTML = (a, isPast) => {
      const d = new Date(a.date + 'T00:00:00');
      const days = Math.round((d - new Date(today + 'T00:00:00')) / 86400000);
      const statusTag = a.status === 'completed' ? '<span class="tag green">Completed</span>' : a.status === 'cancelled' ? '<span class="tag rose">Cancelled</span>' : days === 0 ? '<span class="tag amber">Today</span>' : days === 1 ? '<span class="tag teal">Tomorrow</span>' : `<span class="tag slate">${days} days</span>`;
      return `
        <div class="apt-card ${isPast ? 'past' : ''} mb-12">
          <div class="apt-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString(undefined, { month: 'short' })}</span></div>
          <div style="min-width:0;flex:1">
            <div class="row wrap" style="gap:8px"><h4 style="margin:0;font-size:14.5px">${U.esc(a.title)}</h4>${statusTag}</div>
            <div class="small muted mt-8">${icon('stethoscope', 12)} ${U.esc(a.doctor)}${a.specialty ? ' · ' + U.esc(a.specialty) : ''}</div>
            <div class="small faint mt-8">${icon('clock', 12)} ${U.fmtTime(a.time)} · ${U.fmtDateLong(a.date)}</div>
            ${a.location ? `<div class="small faint">${icon('location', 12)} ${U.esc(a.location)}</div>` : ''}
            ${a.notes ? `<div class="small faint mt-8">📝 ${U.esc(a.notes)}</div>` : ''}
          </div>
          ${a.status === 'upcoming' ? `
          <div class="row" style="gap:6px;align-items:flex-start">
            <button class="btn sm" data-done="${a.id}" title="Mark completed">${icon('check', 13)}</button>
            <button class="btn sm danger" data-cancel="${a.id}" title="Cancel">${icon('x', 13)}</button>
          </div>` : `
          <div class="row" style="gap:6px;align-items:flex-start">
            <button class="btn sm" data-rebook="${a.id}" title="Rebook">${icon('refresh', 13)}</button>
            <button class="btn sm danger" data-del="${a.id}" title="Delete">${icon('trash', 13)}</button>
          </div>`}
        </div>`;
    };

    root.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Appointments</h2>
          <p class="sub">Keep your care team on schedule — we'll nudge you the day before.</p>
        </div>
        <div class="head-actions">
          <button class="btn primary" id="addAptBtn">${icon('plus', 15)} New appointment</button>
        </div>
      </div>

      <div class="grid cols-3 mb-16">
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Upcoming</span><span class="stat-icon" style="background:rgba(45,212,191,.14);color:var(--accent)">${icon('calendar', 17)}</span></div>
          <div class="stat-value">${upcoming.length}</div>
          <div class="stat-foot">${upcoming[0] ? `Next: ${U.fmtDate(upcoming[0].date)} — ${U.esc(upcoming[0].doctor)}` : 'Nothing booked'}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">Completed</span><span class="stat-icon" style="background:rgba(74,222,128,.14);color:var(--green)">${icon('check', 17)}</span></div>
          <div class="stat-value">${state.appointments.filter((a) => a.status === 'completed').length}</div>
          <div class="stat-foot">Lifetime visits logged</div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-label">This month</span><span class="stat-icon" style="background:rgba(167,139,250,.14);color:var(--violet)">${icon('stethoscope', 17)}</span></div>
          <div class="stat-value">${state.appointments.filter((a) => a.date.slice(0, 7) === today.slice(0, 7)).length}</div>
          <div class="stat-foot">Appointments in ${new Date().toLocaleDateString(undefined, { month: 'long' })}</div>
        </div>
      </div>

      <div class="grid halves">
        <div class="card">
          <div class="card-title"><h3>${icon('calendar')} Upcoming</h3></div>
          ${upcoming.length ? upcoming.map((a) => aptHTML(a, false)).join('') : `<div class="empty">${icon('inbox')}<p>No upcoming appointments.</p><button class="btn primary sm" id="addAptEmpty">Book one</button></div>`}
        </div>
        <div class="card">
          <div class="card-title"><h3>${icon('clock')} History</h3></div>
          ${past.length ? past.map((a) => aptHTML(a, true)).join('') : `<div class="empty"><p>No past appointments yet.</p></div>`}
        </div>
      </div>
    `;

    const add = root.querySelector('#addAptBtn') || root.querySelector('#addAptEmpty');
    if (add) add.onclick = () => this.openAptModal();

    root.querySelectorAll('[data-done]').forEach((b) => b.onclick = async () => {
      try { await API.update('appointments', b.dataset.done, { status: 'completed' }); toast('Marked completed', '', 'success', 2000); await App.refresh(); } catch (e) { toast('Failed', e.message, 'error'); }
    });
    root.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = async () => {
      try { await API.update('appointments', b.dataset.cancel, { status: 'cancelled' }); toast('Appointment cancelled', '', 'warn'); await App.refresh(); } catch (e) { toast('Failed', e.message, 'error'); }
    });
    root.querySelectorAll('[data-rebook]').forEach((b) => b.onclick = () => {
      const a = state.appointments.find((x) => x.id === b.dataset.rebook);
      if (a) this.openAptModal({ ...a, date: U.isoOffset(30), status: 'upcoming' }, true);
    });
    root.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      if (!confirm('Delete this appointment?')) return;
      try { await API.remove('appointments', b.dataset.del); toast('Deleted', '', 'success', 2000); await App.refresh(); } catch (e) { toast('Failed', e.message, 'error'); }
    });
  },

  openAptModal(a = {}, isNew = false) {
    openModal({
      title: isNew || !a.id ? 'New appointment' : 'Edit appointment',
      body: `
        <div class="form-grid">
          <div class="full field"><label>Title *</label><input name="title" required placeholder="e.g. Cardiology consult" value="${U.esc(a.title || '')}"></div>
          <div class="field"><label>Doctor *</label><input name="doctor" required placeholder="e.g. Dr. Priya Nair" value="${U.esc(a.doctor || '')}"></div>
          <div class="field"><label>Specialty</label><input name="specialty" placeholder="e.g. Cardiology" value="${U.esc(a.specialty || '')}"></div>
          <div class="field"><label>Date *</label><input name="date" type="date" required value="${a.date || U.isoOffset(7)}"></div>
          <div class="field"><label>Time *</label><input name="time" type="time" required value="${a.time || '10:00'}"></div>
          <div class="full field"><label>Location</label><input name="location" placeholder="Clinic / video link" value="${U.esc(a.location || '')}"></div>
          <div class="full field"><label>Notes</label><textarea name="notes" placeholder="Questions to ask, documents to bring…">${U.esc(a.notes || '')}</textarea></div>
        </div>`,
      submitLabel: a.id && !isNew ? 'Save changes' : 'Book appointment',
      onSubmit: async (fd) => {
        const payload = {
          title: fd.get('title').trim(),
          doctor: fd.get('doctor').trim(),
          specialty: fd.get('specialty').trim(),
          date: fd.get('date'),
          time: fd.get('time'),
          location: fd.get('location').trim(),
          notes: fd.get('notes').trim(),
          status: 'upcoming',
        };
        if (a.id && !isNew) await API.update('appointments', a.id, payload);
        else await API.add('appointments', payload);
        toast('Appointment booked', `${payload.title} — ${U.fmtDate(payload.date)}`, 'success');
        await App.refresh();
      },
    });
  },
};
