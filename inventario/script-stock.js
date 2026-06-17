// --- MÓDULO DE GESTIÓN DE STOCK Y PROVEEDORES (solo JEFA) ---

// ============================================================
// MOVIMIENTOS DE STOCK
// ============================================================
async function cargarMovimientosStock() {
    const tbody = document.getElementById('stock-movimientos-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data, error } = await supabaseclient
        .from('movimientos_stock')
        .select('*, productos(nombre)')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">Error al cargar movimientos</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No hay movimientos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(m => {
        const clase = m.tipo === 'entrada' ? 'badge-success' : m.tipo === 'salida' ? 'badge-danger' : 'badge-warning';
        const icono = m.tipo === 'entrada' ? 'ri-arrow-down-line' : m.tipo === 'salida' ? 'ri-arrow-up-line' : 'ri-exchange-line';
        return `
            <tr>
                <td>#${m.id}</td>
                <td>${m.productos?.nombre || 'ID: ' + m.producto_id}</td>
                <td><span class="badge ${clase}"><i class="${icono}"></i> ${m.tipo.toUpperCase()}</span></td>
                <td><strong>${m.cantidad}</strong></td>
                <td style="font-size:12px;color:var(--text-muted);">${m.motivo || '-'}</td>
                <td>${new Date(m.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
            </tr>
        `;
    }).join('');
}

async function registrarMovimientoStock() {
    const productoId = parseInt(document.getElementById('mov-producto-id').value);
    const tipo = document.getElementById('mov-tipo').value;
    const cantidad = parseInt(document.getElementById('mov-cantidad').value);
    const motivo = document.getElementById('mov-motivo').value.trim();

    if (!productoId || !cantidad || cantidad <= 0) {
        alert('Completa todos los campos correctamente.');
        return;
    }

    // Obtener stock actual
    const { data: prod, error: errProd } = await supabaseclient
        .from('productos')
        .select('stock, nombre')
        .eq('id', productoId)
        .single();

    if (errProd || !prod) {
        alert('Producto no encontrado.');
        return;
    }

    const stockAnterior = prod.stock;
    let stockNuevo;

    if (tipo === 'entrada') {
        stockNuevo = stockAnterior + cantidad;
    } else if (tipo === 'salida') {
        if (cantidad > stockAnterior) {
            alert(`Stock insuficiente. Solo hay ${stockAnterior} unidades de "${prod.nombre}".`);
            return;
        }
        stockNuevo = stockAnterior - cantidad;
    } else {
        stockNuevo = cantidad;
    }

    const usuarioId = typeof usuarioActual === 'object' && usuarioActual?.id ? usuarioActual.id : null;

    const { error: errMov } = await supabaseclient
        .from('movimientos_stock')
        .insert([{
            producto_id: productoId,
            tipo: tipo,
            cantidad: cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: motivo || null,
            usuario_id: usuarioId
        }]);

    if (errMov) {
        console.error(errMov);
        alert('Error al registrar movimiento.');
        return;
    }

    // Actualizar stock del producto
    const { error: errUpd } = await supabaseclient
        .from('productos')
        .update({ stock: stockNuevo })
        .eq('id', productoId);

    if (errUpd) {
        console.error(errUpd);
        alert('Error al actualizar stock del producto.');
        return;
    }

    alert(`✅ Movimiento registrado: "${prod.nombre}" ahora tiene ${stockNuevo} unidades.`);
    document.getElementById('form-movimiento-stock').reset();
    document.getElementById('modal-movimiento-stock').style.display = 'none';
    cargarMovimientosStock();
    cargarProveedores();
}

async function cargarSelectorProductos() {
    const { data, error } = await supabaseclient
        .from('productos')
        .select('id, nombre')
        .order('nombre');

    if (error) return;

    const selects = document.querySelectorAll('.select-producto-stock');
    selects.forEach(sel => {
        sel.innerHTML = '<option value="">Seleccionar producto...</option>' +
            data.map(p => `<option value="${p.id}">#${p.id} - ${p.nombre}</option>`).join('');
    });
}

// ============================================================
// PROVEEDORES
// ============================================================
let proveedorEditandoId = null;

async function cargarProveedores() {
    const tbody = document.getElementById('proveedores-tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data, error } = await supabaseclient
        .from('proveedores')
        .select('*')
        .order('nombre');

    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error al cargar proveedores</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">No hay proveedores registrados</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(p => `
        <tr>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.ruc || '-'}</td>
            <td>${p.telefono || '-'}</td>
            <td>${p.email || '-'}</td>
            <td style="text-align:center;white-space:nowrap;">
                <button class="btn-editar" data-id="${p.id}" style="padding:6px 10px;margin-right:5px;background:#f59e0b;color:white;border:none;border-radius:4px;cursor:pointer;" onclick="editarProveedor(${p.id})">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="btn-eliminar" data-id="${p.id}" style="padding:6px 10px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;" onclick="eliminarProveedor(${p.id})">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function abrirModalProveedor() {
    proveedorEditandoId = null;
    document.getElementById('form-proveedor').reset();
    document.getElementById('modal-proveedor-titulo').textContent = 'Nuevo Proveedor';
    document.getElementById('modal-proveedor').style.display = 'flex';
}

async function editarProveedor(id) {
    proveedorEditandoId = id;
    const { data, error } = await supabaseclient
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        alert('Error al cargar proveedor');
        return;
    }

    document.getElementById('prov-nombre').value = data.nombre;
    document.getElementById('prov-ruc').value = data.ruc || '';
    document.getElementById('prov-telefono').value = data.telefono || '';
    document.getElementById('prov-email').value = data.email || '';
    document.getElementById('prov-direccion').value = data.direccion || '';
    document.getElementById('modal-proveedor-titulo').textContent = 'Editar Proveedor';
    document.getElementById('modal-proveedor').style.display = 'flex';
}

async function guardarProveedor() {
    const datos = {
        nombre: document.getElementById('prov-nombre').value.trim(),
        ruc: document.getElementById('prov-ruc').value.trim() || null,
        telefono: document.getElementById('prov-telefono').value.trim() || null,
        email: document.getElementById('prov-email').value.trim() || null,
        direccion: document.getElementById('prov-direccion').value.trim() || null
    };

    if (!datos.nombre) {
        alert('El nombre del proveedor es obligatorio.');
        return;
    }

    let resultado;
    if (proveedorEditandoId) {
        resultado = await supabaseclient
            .from('proveedores')
            .update(datos)
            .eq('id', proveedorEditandoId);
    } else {
        resultado = await supabaseclient
            .from('proveedores')
            .insert([datos]);
    }

    if (resultado.error) {
        console.error(resultado.error);
        alert('Error al guardar proveedor.');
        return;
    }

    document.getElementById('modal-proveedor').style.display = 'none';
    cargarProveedores();
}

async function eliminarProveedor(id) {
    if (!confirm('¿Eliminar este proveedor?')) return;

    const { error } = await supabaseclient
        .from('proveedores')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(error);
        alert('Error al eliminar proveedor.');
        return;
    }

    cargarProveedores();
}

// ============================================================
// CARGA INICIAL
// ============================================================
async function cargarGestionStock() {
    cargarMovimientosStock();
    cargarProveedores();
    cargarSelectorProductos();
}
