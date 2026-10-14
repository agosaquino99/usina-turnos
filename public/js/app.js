let me = null;
let rooms = [];
const roomBySlug = (slug) => rooms.find(r => r.slug === slug);

function msg(el, text, ok = true) {
  const e = document.getElementById(el);
  if (!e) return;
  e.className = 'msg ' + (ok ? 'ok' : 'err');
  e.textContent = text;
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('nav button[data-tab="' + name + '"]');
  if (btn) btn.classList.add('active');
  if (name === 'mine') loadMine();
  if (name === 'reunion') { loadUpcomingRes(); }
  if (name === 'general') { loadEvents(); loadUpcomingEvt(); }
  if (name === 'admin') loadUsers();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    me = await API.get('/auth/me');
  } catch (e) {
    location.href = '/login.html';
    return;
  }
  document.getElementById('welcome').textContent = 'Hola, ' + me.name;
  const rb = document.getElementById('roleBadge');
  rb.textContent = me.role;
  if (me.role === 'admin') rb.classList.add('admin');
  if (me.role === 'admin') {
    document.getElementById('adminTab').classList.remove('hidden');
    document.getElementById('evtAdminCard').classList.remove('hidden');
  }
  rooms = await API.get('/rooms');
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('resDate').value = today;
  document.getElementById('availDate').value = today;
  document.getElementById('evtFilterDate').value = '';
  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });
  loadUpcomingRes();
  loadUpcomingEvt();
});

async function logout() {
  try { await API.post('/auth/logout'); } catch (e) {}
  location.href = '/login.html';
}
window.logout = logout;

async function createReservation() {
  const roomId = roomBySlug('reunion').id;
  const date = document.getElementById('resDate').value;
  const startTime = document.getElementById('resStart').value;
  const endTime = document.getElementById('resEnd').value;
  const purpose = document.getElementById('resPurpose').value;
  try {
    const r = await API.post('/reservations', { roomId, date, startTime, endTime, purpose });
    let text = 'Reserva creada correctamente.';
    if (r.email) text += ' ' + (r.email.ok ? r.email.message : r.email.message);
    msg('resMsg', text, true);
    await loadUpcomingRes();
  } catch (e) {
    msg('resMsg', e.message, false);
  }
}
window.createReservation = createReservation;

async function loadAvailability() {
  const roomId = roomBySlug('reunion').id;
  const date = document.getElementById('availDate').value;
  try {
    const rows = await API.get('/reservations/availability?roomId=' + roomId + '&date=' + date);
    const tbody = document.querySelector('#availTable tbody');
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.start_time}</td><td>${r.end_time}</td><td>${r.purpose}</td><td>${r.user_name}</td>`;
      tbody.appendChild(tr);
    });
    msg('availMsg', rows.length ? 'Reservas para ' + date : 'Sin reservas para ' + date, true);
  } catch (e) { msg('availMsg', e.message, false); }
}
window.loadAvailability = loadAvailability;

async function loadUpcomingRes() {
  try {
    const rows = await API.get('/reservations/upcoming?limit=10');
    const tbody = document.querySelector('#upcomingResTable tbody');
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.reservation_date}</td><td>${r.start_time}</td><td>${r.end_time}</td><td>${r.room_name}</td><td>${r.purpose}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {}
}
window.loadUpcomingRes = loadUpcomingRes;

async function loadEvents() {
  const date = document.getElementById('evtFilterDate').value;
  let url = '/events';
  if (date) url += '?date=' + date;
  try {
    const rows = await API.get(url);
    const tbody = document.querySelector('#eventsTable tbody');
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.event_date}</td><td>${r.start_time}</td><td>${r.end_time}</td><td>${r.title}</td><td>${r.description || ''}</td>`;
      tbody.appendChild(tr);
    });
    msg('evtMsg', rows.length ? 'Eventos encontrados' : 'Sin eventos', true);
  } catch (e) { msg('evtMsg', e.message, false); }
}
window.loadEvents = loadEvents;

async function loadUpcomingEvt() {
  try {
    const rows = await API.get('/events/upcoming?limit=10');
    const tbody = document.querySelector('#upcomingEvtTable tbody');
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.event_date}</td><td>${r.start_time}</td><td>${r.end_time}</td><td>${r.title}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {}
}
window.loadUpcomingEvt = loadUpcomingEvt;

async function createEvent() {
  const roomId = roomBySlug('general').id;
  const date = document.getElementById('evtDate').value;
  const startTime = document.getElementById('evtStart').value;
  const endTime = document.getElementById('evtEnd').value;
  const title = document.getElementById('evtTitle').value;
  const description = document.getElementById('evtDesc').value;
  try {
    await API.post('/events', { roomId, title, description, date, startTime, endTime });
    msg('evtRegMsg', 'Evento registrado.', true);
    await loadEvents();
    await loadUpcomingEvt();
  } catch (e) {
    msg('evtRegMsg', e.message, false);
  }
}
window.createEvent = createEvent;

async function loadMine() {
  try {
    const rows = await API.get('/reservations');
    const tbody = document.querySelector('#mineTable tbody');
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const canCancel = r.status === 'confirmed';
      tr.innerHTML = `<td>${r.reservation_date}</td><td>${r.start_time}</td><td>${r.end_time}</td><td>${r.room_name}</td><td>${r.purpose}</td><td>${r.status}</td>
        <td>${canCancel ? `<button class="danger" onclick="cancelRes(${r.id})">Cancelar</button>` : ''}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) { msg('mineMsg', e.message, false); }
}
window.loadMine = loadMine;

async function cancelRes(id) {
  if (!confirm('Cancelar reserva?')) return;
  try {
    await API.patch('/reservations/' + id + '/cancel');
    msg('mineMsg', 'Reserva cancelada.', true);
    await loadMine();
    await loadUpcomingRes();
  } catch (e) { msg('mineMsg', e.message, false); }
}
window.cancelRes = cancelRes;

async function loadUsers() {
  try {
    const rows = await API.get('/users');
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    rows.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.name}</td><td>${u.email}</td><td>${u.role}</td>
        <td><button class="danger" onclick="deleteUser(${u.id})">Eliminar</button></td>`;
      tbody.appendChild(tr);
    });
  } catch (e) { msg('adminMsg', e.message, false); }
}
window.loadUsers = loadUsers;

async function createUser() {
  try {
    await API.post('/users', {
      name: document.getElementById('uName').value,
      email: document.getElementById('uEmail').value,
      password: document.getElementById('uPass').value,
      role: document.getElementById('uRole').value,
    });
    msg('adminMsg', 'Usuario creado.', true);
    document.getElementById('uName').value = '';
    document.getElementById('uEmail').value = '';
    document.getElementById('uPass').value = '';
    await loadUsers();
  } catch (e) { msg('adminMsg', e.message, false); }
}
window.createUser = createUser;

async function deleteUser(id) {
  if (!confirm('Eliminar usuario?')) return;
  try {
    await API.del('/users/' + id);
    msg('adminMsg', 'Usuario eliminado.', true);
    await loadUsers();
  } catch (e) { msg('adminMsg', e.message, false); }
}
window.deleteUser = deleteUser;