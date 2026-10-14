const API = {
  async req(path, opts = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) throw new Error((data && (data.error || (data.errors && data.errors.map(x=>x.msg).join(', ')))) || ('HTTP ' + res.status));
    return data;
  },
  get: (p) => API.req(p),
  post: (p, b) => API.req(p, { method: 'POST', body: b }),
  put: (p, b) => API.req(p, { method: 'PUT', body: b }),
  patch: (p, b) => API.req(p, { method: 'PATCH', body: b }),
  del: (p) => API.req(p, { method: 'DELETE' }),
};
window.API = API;