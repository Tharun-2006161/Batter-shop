// API Helper
const API = {
  base: '/api',
  token: localStorage.getItem('token'),

  setToken(t) { this.token = t; localStorage.setItem('token', t); },
  clearToken() { this.token = null; localStorage.removeItem('token'); localStorage.removeItem('user'); },
  getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  setUser(u) { localStorage.setItem('user', JSON.stringify(u)); },

  async request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  },

  get(p) { return this.request('GET', p); },
  post(p, b) { return this.request('POST', p, b); },
  put(p, b) { return this.request('PUT', p, b); }
};
