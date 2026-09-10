/* HIT-ME-UP — application shell: router, navigation, state */
'use strict';

const App = {
  state: null,
  views: [
    DashboardView, VitalsView, MedicationsView, AppointmentsView,
    WorkoutsView, NutritionView, RemindersView, ProfileView,
  ],

  async boot() {
    this.buildNav();
    this.bindChrome();

    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('beforeunload', () => Reminders.stop());

    try {
      await this.refresh();
      this.route();
      Reminders.start();
    } catch (e) {
      document.getElementById('view').innerHTML = `
        <div class="empty" style="padding:80px 0">
          ${icon('x', 42)}
          <h2 style="font-family:var(--font-display)">Can't reach the HIT-ME-UP server</h2>
          <p class="muted">${U.esc(e.message)} — is <span class="mono">node server.js</span> running?</p>
        </div>`;
    }
  },

  buildNav() {
    const nav = document.getElementById('nav');
    const groups = {
      Overview: ['dashboard'],
      Track: ['vitals', 'medications', 'appointments'],
      Train: ['workouts', 'nutrition'],
      Engage: ['reminders', 'profile'],
    };
    let html = '';
    for (const [label, ids] of Object.entries(groups)) {
      html += `<div class="nav-label">${label}</div>`;
      for (const id of ids) {
        const v = this.views.find((x) => x.id === id);
        html += `<a class="nav-item" href="#/${id}" data-view="${id}">${icon(v.navIcon)}<span>${U.esc(v.navLabel)}</span><span class="count-pill hidden" id="navCount-${id}"></span></a>`;
      }
    }
    nav.innerHTML = html;
  },

  bindChrome() {
    document.getElementById('menuBtn').onclick = () => {
      document.getElementById('sidebar').classList.toggle('open');
    };
    document.getElementById('bellBtn').onclick = () => { location.hash = '/reminders'; };
    document.getElementById('pageDate').textContent =
      new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target.id !== 'menuBtn') {
        sidebar.classList.remove('open');
      }
    });
  },

  async refresh() {
    this.state = await API.getState();
    this.renderChrome();
    this.updateBell();
  },

  renderChrome() {
    const p = this.state.profile || {};
    document.getElementById('userName').textContent = p.name || 'Guest';
    document.getElementById('avatar').textContent = U.initials(p.name);
    const score = this.state ? Insights.healthScore(this.state).total : 0;
    document.getElementById('userSub').textContent = `Health score ${score}/100`;
  },

  updateBell() {
    const due = this.state ? Insights.medsDueNow(this.state).length : 0;
    const dot = document.getElementById('bellDot');
    if (dot) dot.hidden = due === 0;
    /* nav count badges */
    const counts = { medications: due };
    for (const [id, n] of Object.entries(counts)) {
      const el = document.getElementById('navCount-' + id);
      if (el) { el.textContent = n > 0 ? n : ''; el.classList.toggle('hidden', !(n > 0)); }
    }
  },

  currentView() {
    const hash = (location.hash || '#/dashboard').replace(/^#\//, '').split('?')[0];
    return this.views.find((v) => v.id === hash) || DashboardView;
  },

  async route() {
    const view = this.currentView();
    const root = document.getElementById('view');

    document.querySelectorAll('.nav-item').forEach((a) => {
      a.classList.toggle('active', a.dataset.view === view.id);
    });
    document.getElementById('pageTitle').textContent = view.title;
    document.getElementById('sidebar').classList.remove('open');

    ChartRegistry.destroyAll();
    if (this._rafCancel) cancelAnimationFrame(this._rafCancel);

    try {
      await view.render(root, this.state);
      root.scrollTop = 0;
      window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="empty" style="padding:60px 0">${icon('x', 40)}<h3>Something went wrong rendering this page</h3><p class="muted">${U.esc(e.message)}</p><button class="btn" onclick="location.reload()">Reload app</button></div>`;
    }
  },

  rerender() { return this.route(); },
};

App.boot();
