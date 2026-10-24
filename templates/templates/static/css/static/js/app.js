const user = Session.requireAuth();
if (!user) throw new Error('No auth');

const params = new URLSearchParams(location.search);
const view = params.get('view') || 'home';

// Rutas adaptadas para Flask (sin .html)
const menus = {
  admin: [
    { key: 'home', label: '🏠 Inicio', href: '/dashboard' },
    { key: 'pacientes', label: '👥 Pacientes', href: '/dashboard?view=pacientes' },
    { key: 'psicologos', label: '🧑‍⚕️ Psicólogos', href: '/dashboard?view=psicologos' },
    { key: 'citas', label: '📅 Citas', href: '/dashboard?view=citas' },
    { key: 'seguimiento', label: '📝 Seguimiento', href: '/dashboard?view=seguimiento' },
    { key: 'reportes', label: '📊 Reportes', href: '/dashboard?view=reportes' }
  ],
  psicologo: [
    { key: 'home', label: '🏠 Inicio', href: '/dashboard' },
    { key: 'pacientes', label: '👥 Mis Pacientes', href: '/dashboard?view=pacientes' },
    { key: 'citas', label: '📅 Mis Citas', href: '/dashboard?view=citas' },
    { key: 'seguimiento', label: '📝 Seguimiento', href: '/dashboard?view=seguimiento' }
  ],
  paciente: [
    { key: 'home', label: '🏠 Inicio', href: '/dashboard' },
    { key: 'citas', label: '📅 Mis Citas', href: '/dashboard?view=citas' }
  ]
};

document.getElementById('navMenu').innerHTML = menus[user.rol]
  .map(m => `<a href="${m.href}" class="${m.key === view ? 'active' : ''}">${m.label}</a>`).join('');

document.getElementById('userName').textContent = user.nombre;
document.getElementById('userRole').textContent = user.rol.toUpperCase();
document.getElementById('avatar').textContent = user.nombre[0].toUpperCase();
document.getElementById('logoutBtn').onclick = () => { Session.clear(); window.location.href = '/'; };

const $ = (id) => document.getElementById(id);

// Variable global para guardar los usuarios y no pedirlos a cada rato
let allUsers = [];

async function getUserName(id) {
  if (allUsers.length === 0) {
    allUsers = await DB.getUsers();
  }
  const u = allUsers.find(x => x.id === id);
  return u ? u.nombre : '—';
}

async function render() {
  const titles = { home: 'Panel Principal', pacientes: 'Pacientes', psicologos: 'Psicólogos', citas: 'Citas', seguimiento: 'Seguimiento', reportes: 'Reportes' };
  $('pageTitle').textContent = titles[view] || 'Panel';
  $('statsGrid').innerHTML = '';
  $('mainCard').innerHTML = '<p>Cargando datos...</p>';

  // Cargar usuarios primero para que los nombres aparezcan en las tablas
  allUsers = await DB.getUsers();

  if (view === 'home') await renderHome();
  else if (view === 'pacientes') await renderPacientes();
  else if (view === 'psicologos') await renderPsicologos();
  else if (view === 'citas') await renderCitas();
  else if (view === 'seguimiento') await renderSeguimiento();
  else if (view === 'reportes') await renderReportes();
}

async function getCitasVisibles() {
  let citas = await DB.getCitas();
  if (user.rol === 'psicologo') citas = citas.filter(c => c.psicologoId === user.id);
  if (user.rol === 'paciente') citas = citas.filter(c => c.pacienteId === user.id);
  return citas;
}

async function renderHome() {
  const citas = await getCitasVisibles();
  const stats = [
    { label: 'Citas totales', value: citas.length },
    { label: 'Confirmadas', value: citas.filter(c => c.estado === 'confirmada').length },
    { label: 'Pendientes', value: citas.filter(c => c.estado === 'pendiente').length },
    { label: 'Canceladas', value: citas.filter(c => c.estado === 'cancelada').length }
  ];
  if (user.rol === 'admin') {
    stats.push({ label: 'Pacientes', value: allUsers.filter(u => u.rol === 'paciente').length });
    stats.push({ label: 'Psicólogos', value: allUsers.filter(u => u.rol === 'psicologo').length });
  }
  $('statsGrid').innerHTML = stats.map(s => `<div class="stat-card"><h3>${s.label}</h3><div class="value">${s.value}</div></div>`).join('');

  const proximas = citas.filter(c => c.estado !== 'cancelada').slice(0, 5);
  
  let tabla = '<p>No hay citas registradas.</p>';
  if (proximas.length > 0) {
    const filas = await Promise.all(proximas.map(async c => {
      const pNom = await getUserName(c.pacienteId);
      const psiNom = await getUserName(c.psicologoId);
      return `<tr>
        <td>${pNom}</td><td>${psiNom}</td><td>${c.fecha}</td><td>${c.hora}</td><td>${c.motivo}</td>
        <td><span class="badge ${c.estado}">${c.estado}</span></td>
        <td>
          <button class="btn-sm btn-edit" onclick="editarCita(${c.id})">Editar</button>
          ${c.estado !== 'cancelada' ? `<button class="btn-sm btn-delete" onclick="cancelarCita(${c.id})">Cancelar</button>` : ''}
        </td>
      </tr>`;
    }));
    tabla = `<table><thead><tr><th>Paciente</th><th>Psicólogo</th><th>Fecha</th><th>Hora</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${filas.join('')}</tbody></table>`;
  }

  $('mainCard').innerHTML = `
    <div class="card-header">
      <h3>Próximas citas</h3>
      <button class="btn-new" onclick="openCitaModal()">+ Nueva Cita</button>
    </div>
    ${tabla}`;
}

async function renderCitas() {
  const citas = await getCitasVisibles();
  let tabla = '<p>No hay citas registradas.</p>';
  
  if (citas.length > 0) {
    const filas = await Promise.all(citas.map(async c => {
      const pNom = await getUserName(c.pacienteId);
      const psiNom = await getUserName(c.psicologoId);
      return `<tr>
        <td>${pNom}</td><td>${psiNom}</td><td>${c.fecha}</td><td>${c.hora}</td><td>${c.motivo}</td>
        <td><span class="badge ${c.estado}">${c.estado}</span></td>
        <td>
          <button class="btn-sm btn-edit" onclick="editarCita(${c.id})">Editar</button>
          ${c.estado !== 'cancelada' ? `<button class="btn-sm btn-delete" onclick="cancelarCita(${c.id})">Cancelar</button>` : ''}
          ${user.rol === 'admin' ? `<button class="btn-sm btn-delete" onclick="eliminarCita(${c.id})">Eliminar</button>` : ''}
        </td>
      </tr>`;
    }));
    tabla = `<table><thead><tr><th>Paciente</th><th>Psicólogo</th><th>Fecha</th><th>Hora</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${filas.join('')}</tbody></table>`;
  }

  $('mainCard').innerHTML = `
    <div class="card-header">
      <h3>Todas las citas</h3>
      <button class="btn-new" onclick="openCitaModal()">+ Nueva Cita</button>
    </div>
    ${tabla}`;
}

async function renderPacientes() {
  let pacientes = allUsers.filter(u => u.rol === 'paciente');
  if (user.rol === 'psicologo') pacientes = pacientes.filter(p => p.psicologoId === user.id);

  $('statsGrid').innerHTML = `<div class="stat-card"><h3>Total Pacientes</h3><div class="value">${pacientes.length}</div></div>`;

  $('mainCard').innerHTML = `
    <div class="card-header">
      <h3>Listado de Pacientes</h3>
      ${user.rol === 'admin' ? '<button class="btn-new" onclick="openUserModal(null,\'paciente\')">+ Nuevo Paciente</button>' : ''}
    </div>
    <table>
      <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Psicólogo</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        ${pacientes.map(p => `
          <tr>
            <td>${p.nombre}</td><td>${p.email}</td><td>${p.telefono || '—'}</td>
            <td>${p.psicologoId ? (allUsers.find(x=>x.id===p.psicologoId)?.nombre || '—') : '—'}</td>
            <td><span class="badge ${p.activo ? 'activo' : 'cancelada'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>
              ${user.rol === 'admin' ? `<button class="btn-sm btn-edit" onclick="openUserModal(${p.id})">Editar</button>
              <button class="btn-sm btn-delete" onclick="toggleUsuario(${p.id})">${p.activo ? 'Desactivar' : 'Activar'}</button>` : ''}
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function renderPsicologos() {
  const psicologos = allUsers.filter(u => u.rol === 'psicologo');
  $('statsGrid').innerHTML = `<div class="stat-card"><h3>Total Psicólogos</h3><div class="value">${psicologos.length}</div></div>`;

  $('mainCard').innerHTML = `
    <div class="card-header">
      <h3>Listado de Psicólogos</h3>
      <button class="btn-new" onclick="openUserModal(null,'psicologo')">+ Nuevo Psicólogo</button>
    </div>
    <table>
      <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Especialidad</th><th>Acciones</th></tr></thead>
      <tbody>
        ${psicologos.map(p => `
          <tr>
            <td>${p.nombre}</td><td>${p.email}</td><td>${p.telefono || '—'}</td><td>${p.especialidad || '—'}</td>
            <td>
              <button class="btn-sm btn-edit" onclick="openUserModal(${p.id})">Editar</button>
              <button class="btn-sm btn-delete" onclick="eliminarUsuario(${p.id})">Eliminar</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// --- FUNCIONES DE CITAS ---
async function editarCita(id) {
  const citas = await DB.getCitas();
  const c = citas.find(x => x.id === id);
  if (c) openCitaModal(c);
}

async function cancelarCita(id) {
  if (!confirm('¿Cancelar esta cita?')) return;
  const citas = await DB.getCitas();
  const c = citas.find(x => x.id === id);
  c.estado = 'cancelada';
  await DB.updateCita(id, c);
  render();
}

async function eliminarCita(id) {
  if (!confirm('¿Eliminar definitivamente esta cita?')) return;
  await DB.deleteCita(id);
  render();
}

async function openCitaModal(cita = null) {
  $('citaModalTitle').textContent = cita ? 'Editar Cita' : 'Nueva Cita';
  $('citaId').value = cita?.id || '';
  $('citaFecha').value = cita?.fecha || '';
  $('citaHora').value = cita?.hora ? cita.hora.substring(0,5) : '';
  $('citaMotivo').value = cita?.motivo || '';
  $('citaEstado').value = cita?.estado || 'pendiente';

  const pacientes = allUsers.filter(u => u.rol === 'paciente');
  const psicologos = allUsers.filter(u => u.rol === 'psicologo');

  const pacSelect = $('citaPaciente');
  const psiSelect = $('citaPsico');

  if (user.rol === 'paciente') {
    pacSelect.innerHTML = `<option value="${user.id}">${user.nombre}</option>`;
    pacSelect.disabled = true;
  } else {
    pacSelect.disabled = false;
    pacSelect.innerHTML = '<option value="">Seleccione paciente</option>' + pacientes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    if (cita) pacSelect.value = cita.pacienteId;
  }

  if (user.rol === 'psicologo') {
    psiSelect.innerHTML = `<option value="${user.id}">${user.nombre}</option>`;
    psiSelect.disabled = true;
  } else {
    psiSelect.disabled = false;
    psiSelect.innerHTML = '<option value="">Seleccione psicólogo</option>' + psicologos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    if (cita) psiSelect.value = cita.psicologoId;
  }

  $('citaModal').classList.add('open');
}

$('cancelCitaBtn').onclick = () => $('citaModal').classList.remove('open');

$('citaForm').onsubmit = async (e) => {
  e.preventDefault();
  const id = $('citaId').value;
  const data = {
    pacienteId: Number($('citaPaciente').value),
    psicologoId: Number($('citaPsico').value),
    fecha: $('citaFecha').value,
    hora: $('citaHora').value+'00',
    motivo: $('citaMotivo').value,
    estado: $('citaEstado').value
  };
  if (id) await DB.updateCita(Number(id), data);
  else await DB.addCita(data);
  $('citaModal').classList.remove('open');
  render();
};

// --- FUNCIONES DE USUARIO ---
function openUserModal(id = null, rolDefault = 'paciente') {
  const u = id ? allUsers.find(x => x.id === id) : null;
  $('userModalTitle').textContent = u ? 'Editar Usuario' : 'Nuevo Usuario';
  $('userId').value = u?.id || '';
  $('uNombre').value = u?.nombre || '';
  $('uEmail').value = u?.email || '';
  $('uPassword').value = u?.password || '';
  $('uTelefono').value = u?.telefono || '';
  $('uRol').value = u?.rol || rolDefault;
  $('uEspecialidad').value = u?.especialidad || '';

  const psicologos = allUsers.filter(x => x.rol === 'psicologo');
  $('uPsicologoId').innerHTML = '<option value="">Sin asignar</option>' + psicologos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  if (u?.psicologoId) $('uPsicologoId').value = u.psicologoId;

  $('userModal').classList.add('open');
}

$('cancelUserBtn').onclick = () => $('userModal').classList.remove('open');

$('userForm').onsubmit = async (e) => {
  e.preventDefault();
  const id = $('userId').value;
  const data = {
    nombre: $('uNombre').value,
    email: $('uEmail').value,
    password: $('uPassword').value,
    telefono: $('uTelefono').value,
    rol: $('uRol').value,
    especialidad: $('uEspecialidad').value,
    psicologoId: $('uPsicologoId').value ? Number($('uPsicologoId').value) : null,
    activo: 1
  };
  if (id) await DB.updateUser(Number(id), data);
  else await DB.addUser(data);
  $('userModal').classList.remove('open');
  render();
};

async function toggleUsuario(id) {
  const u = allUsers.find(x => x.id === id);
  u.activo = u.activo ? 0 : 1;
  await DB.updateUser(id, u);
  render();
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  await DB.deleteUser(id);
  render();
}

// --- FUNCIONES DE SEGUIMIENTO ---
async function renderSeguimiento() {
  let seguimientos = await DB.getSeguimientos();
  if (user.rol === 'psicologo') seguimientos = seguimientos.filter(s => s.psicologoId === user.id);
  if (user.rol === 'paciente') seguimientos = seguimientos.filter(s => s.pacienteId === user.id);

  const filas = await Promise.all(seguimientos.map(async s => {
    const pNom = await getUserName(s.pacienteId);
    const psiNom = await getUserName(s.psicologoId);
    return `<tr>
      <td>${pNom}</td><td>${psiNom}</td><td>${s.fecha}</td><td>${s.observacion}</td>
      <td><span class="badge pendiente">${s.estado}</span></td>
    </tr>`;
  }));

  $('mainCard').innerHTML = `
    <div class="card-header">
      <h3>Historial de Seguimiento</h3>
      ${user.rol !== 'paciente' ? '<button class="btn-new" onclick="openSegModal()">+ Nuevo Seguimiento</button>' : ''}
    </div>
    <table>
      <thead><tr><th>Paciente</th><th>Psicólogo</th><th>Fecha</th><th>Observación</th><th>Estado</th></tr></thead>
      <tbody>${filas.length ? filas.join('') : '<tr><td colspan="5">Sin registros</td></tr>'}</tbody>
    </table>`;
}

function openSegModal() {
  const pacientes = allUsers.filter(u => u.rol === 'paciente' && (user.rol === 'admin' || u.psicologoId === user.id));
  $('sPaciente').innerHTML = '<option value="">Seleccione paciente</option>' + pacientes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  $('sFecha').value = new Date().toISOString().slice(0,10);
  $('sObservacion').value = '';
  $('segModal').classList.add('open');
}

$('cancelSegBtn').onclick = () => $('segModal').classList.remove('open');

$('segForm').onsubmit = async (e) => {
  e.preventDefault();
  const pId = Number($('sPaciente').value);
  const pObj = allUsers.find(x => x.id === pId);
  await DB.addSeguimiento({
    pacienteId: pId,
    psicologoId: user.rol === 'psicologo' ? user.id : (pObj?.psicologoId || user.id),
    fecha: $('sFecha').value,
    observacion: $('sObservacion').value,
    estado: $('sEstado').value
  });
  $('segModal').classList.remove('open');
  render();
};

// --- FUNCIONES DE REPORTES ---
async function renderReportes() {
  const citas = await DB.getCitas();
  const pacientes = allUsers.filter(u => u.rol === 'paciente');
  const psicologos = allUsers.filter(u => u.rol === 'psicologo');

  const porEstado = {
    confirmada: citas.filter(c => c.estado === 'confirmada').length,
    pendiente: citas.filter(c => c.estado === 'pendiente').length,
    cancelada: citas.filter(c => c.estado === 'cancelada').length
  };

  $('statsGrid').innerHTML = `
    <div class="stat-card"><h3>Total Citas</h3><div class="value">${citas.length}</div></div>
    <div class="stat-card"><h3>Pacientes</h3><div class="value">${pacientes.length}</div></div>
    <div class="stat-card"><h3>Psicólogos</h3><div class="value">${psicologos.length}</div></div>
    <div class="stat-card"><h3>Tasa cancelación</h3><div class="value">${citas.length ? Math.round(porEstado.cancelada / citas.length * 100) : 0}%</div></div>`;

  $('mainCard').innerHTML = `
    <h3 style="margin-bottom:15px">Citas por estado</h3>
    <table>
      <thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
      <tbody>
        <tr><td>✅ Confirmadas</td><td>${porEstado.confirmada}</td></tr>
        <tr><td>⏳ Pendientes</td><td>${porEstado.pendiente}</td></tr>
        <tr><td>❌ Canceladas</td><td>${porEstado.cancelada}</td></tr>
      </tbody>
    </table>
    <h3 style="margin:25px 0 15px">Citas por psicólogo</h3>
    <table>
      <thead><tr><th>Psicólogo</th><th>Citas</th></tr></thead>
      <tbody>
        ${psicologos.map(p => `<tr><td>${p.nombre}</td><td>${citas.filter(c => c.psicologoId === p.id).length}</td></tr>`).join('')}
      </tbody>
    </table>`;
}

// ¡Arrancar la aplicación!
render();
