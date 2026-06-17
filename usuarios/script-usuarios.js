let usuarioActual = 'null';

async function login(correo, password) {
    const { data, error } = await supabaseclient
        .from('usuarios')
        .select('*')
        .eq('correo', correo)
        .eq('password', password)
        .single();

    if (error || !data) {
        alert('Credenciales incorrectas');
        return;
    }

    usuarioActual = data;

    mostrarUsuario();
    aplicarPermisos();

    await cargarDashboard();

    if (typeof iniciarChat === 'function') iniciarChat();

    switchView('dashboard');
}

function aplicarPermisos() {
    const esJefa = usuarioActual?.rol === 'JEFA';

    document.getElementById('nav-inventario').style.display = esJefa ? 'flex' : 'none';
    document.getElementById('nav-stock').style.display = esJefa ? 'flex' : 'none';
    document.getElementById('nav-facturas').style.display = esJefa ? 'flex' : 'none';

    const registerBtn = document.getElementById('btn-registrar-producto');
    if (registerBtn) {
        registerBtn.style.display = esJefa ? 'flex' : 'none';
    }
}

function mostrarUsuario() {
    document.getElementById('nombreUsuario').textContent =
        usuarioActual.nombre;

    document.getElementById('rolUsuario').textContent =
        usuarioActual.rol === 'JEFA' ? 'Jefatura' : 'Cajera';

    const iniciales = usuarioActual.nombre
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    document.getElementById('avatarUsuario').textContent = iniciales;
}
