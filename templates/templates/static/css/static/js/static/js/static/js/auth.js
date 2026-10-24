document.addEventListener('DOMContentLoaded', () => {
  if (Session.get()) { window.location.href = '/dashboard'; return; }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');

  // (Aquí van los eventos de showRegister y backToLogin que ya tenías)

  // --- LOGIN (Ojo con la palabra async) ---
  loginForm.addEventListener('submit', async (e) => { 
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Ojo aquí: await DB.getUsers()
    const users = await DB.getUsers(); 
    
    const user = users.find(u => u.email === email && u.password === password && u.activo);

    if (!user) {
      loginError.textContent = 'Credenciales incorrectas o usuario inactivo';
      return;
    }
    Session.set(user);
    window.location.href = '/dashboard';
  });
});
