document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await API.get('/auth/me');
    if (me) location.href = '/app.html';
  } catch (e) {}
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg');
    msg.className = 'msg';
    msg.textContent = '';
    const fd = new FormData(e.target);
    try {
      await API.post('/auth/login', { email: fd.get('email'), password: fd.get('password') });
      location.href = '/app.html';
    } catch (err) {
      msg.className = 'msg err';
      msg.textContent = err.message;
    }
  });
});