// ============ Capa de datos vía Flask API ============
const API = '/api';

const DB = {
  async getUsers() {
    const res = await fetch(`${API}/users`);
    return await res.json();
  },
  async getUserById(id) {
    const users = await DB.getUsers();
    return users.find(u => u.id === id);
  },
  async addUser(user) {
    const res = await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return await res.json();
  },
  async updateUser(id, data) {
    const res = await fetch(`${API}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  async deleteUser(id) {
    await fetch(`${API}/users/${id}`, { method: 'DELETE' });
  },

  async getCitas() {
    const res = await fetch(`${API}/citas`);
    return await res.json();
  },
  async addCita(cita) {
  const res = await fetch(`${API}/citas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cita)
  });
  const texto = await res.text(); // Leemos como texto primero
  try {
    return JSON.parse(texto); // Intentamos convertirlo a JSON
  } catch (e) {
    console.error("ERROR REAL DEL SERVIDOR:", texto); // Lo mostramos en consola
    return { ok: false, error: "Error 500: Revisa la consola o la ventana negra" };
  }
},
  async updateCita(id, data) {
    const res = await fetch(`${API}/citas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  async deleteCita(id) {
    await fetch(`${API}/citas/${id}`, { method: 'DELETE' });
  },

  async getSeguimientos() {
    const res = await fetch(`${API}/seguimientos`);
    return await res.json();
  },
  async addSeguimiento(seg) {
    const res = await fetch(`${API}/seguimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seg)
    });
    return await res.json();
  }
};

const Session = {
  set: (user) => localStorage.setItem('tm_session', JSON.stringify(user)),
  get: () => JSON.parse(localStorage.getItem('tm_session') || 'null'),
  clear: () => localStorage.removeItem('tm_session'),
  requireAuth(roles = []) {
    const u = Session.get();
    if (!u) { window.location.href = '/'; return null; }
    if (roles.length && !roles.includes(u.rol)) { window.location.href = '/dashboard'; return null; }
    return u;
  }
};
