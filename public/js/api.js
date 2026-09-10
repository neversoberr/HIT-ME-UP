/* HIT-ME-UP — API client */
'use strict';

const API = {
  async request(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  },

  getState() { return this.request('GET', '/api/state'); },

  /* profile / goals / settings */
  saveProfile(profile) { return this.request('PATCH', '/api/profile', profile); },
  saveGoals(goals) { return this.request('PATCH', '/api/goals', goals); },
  saveSettings(settings) { return this.request('PATCH', '/api/settings', settings); },

  /* generic collections */
  add(coll, item) { return this.request('POST', `/api/${coll}`, item); },
  update(coll, id, patch) { return this.request('PATCH', `/api/${coll}/${id}`, patch); },
  remove(coll, id) { return this.request('DELETE', `/api/${coll}/${id}`); },

  /* dose logging */
  logDose(medId, date, time, status) {
    return this.request('POST', `/api/medications/${medId}/dose`, { date, time, status });
  },

  exportData() { return this.request('GET', '/api/export'); },
  resetDemo() { return this.request('POST', '/api/reset'); },
};
