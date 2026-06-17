// --- UTILIDADES DE FECHAS ---
function inicioDelDia() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function inicioDeSemana() {
    const d = new Date();
    const dia = d.getDay();
    const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function formatearFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function formatearHora(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit'
    });
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// --- REPORTE: VENTAS DIARIAS ---
async function cargarReporteDiario() {
    const contenedor = document.getElementById('reporte-diario-tbody');
    contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data: ventas, error } = await supabaseclient
        .from('ventas')
        .select(`
            id, total, created_at,
            detalle_venta ( producto_id, cantidad, precio_unitario, subtotal )
        `)
        .gte('created_at', inicioDelDia())
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error al cargar reporte diario</td></tr>';
        return;
    }

    if (!ventas || ventas.length === 0) {
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">No hay ventas registradas hoy</td></tr>';
        document.getElementById('diario-total').textContent = 'S/ 0.00';
        document.getElementById('diario-cantidad').textContent = '0';
        return;
    }

    const totalDia = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    document.getElementById('diario-total').textContent = `S/ ${totalDia.toFixed(2)}`;
    document.getElementById('diario-cantidad').textContent = ventas.length;

    contenedor.innerHTML = ventas.map(v => `
        <tr>
            <td>#${v.id}</td>
            <td>${formatearFecha(v.created_at)} ${formatearHora(v.created_at)}</td>
            <td>${v.detalle_venta ? v.detalle_venta.length : 0} producto(s)</td>
            <td><strong>S/ ${Number(v.total).toFixed(2)}</strong></td>
            <td><span class="badge badge-success">Completado</span></td>
        </tr>
    `).join('');
}

// --- REPORTE: VENTAS SEMANALES ---
async function cargarReporteSemanal() {
    const contenedor = document.getElementById('reporte-semanal-tbody');
    contenedor.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data: ventas, error } = await supabaseclient
        .from('ventas')
        .select('id, total, created_at')
        .gte('created_at', inicioDeSemana())
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        contenedor.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error al cargar reporte semanal</td></tr>';
        return;
    }

    const diasSemana = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        const dia = d.getDay();
        const diff = d.getDate() - dia + (dia === 0 ? -6 : 1) + i;
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        const clave = d.toISOString().split('T')[0];
        diasSemana[clave] = { label: DIAS[i], fecha: clave, total: 0, cantidad: 0 };
    }

    if (ventas) {
        ventas.forEach(v => {
            const clave = v.created_at.split('T')[0];
            if (diasSemana[clave]) {
                diasSemana[clave].total += Number(v.total);
                diasSemana[clave].cantidad += 1;
            }
        });
    }

    const totalSemana = Object.values(diasSemana).reduce((sum, d) => sum + d.total, 0);
    const cantSemana = Object.values(diasSemana).reduce((sum, d) => sum + d.cantidad, 0);
    document.getElementById('semanal-total').textContent = `S/ ${totalSemana.toFixed(2)}`;
    document.getElementById('semanal-cantidad').textContent = cantSemana;

    const hoy = new Date().toISOString().split('T')[0];

    contenedor.innerHTML = Object.values(diasSemana).map(d => {
        const esHoy = d.fecha === hoy;
        const pct = totalSemana > 0 ? (d.total / totalSemana * 100) : 0;
        return `
            <tr class="${esHoy ? 'row-today' : ''}">
                <td><strong>${d.label}</strong> ${esHoy ? '<span class="badge badge-info">Hoy</span>' : ''}</td>
                <td>${d.cantidad} venta(s)</td>
                <td><strong>S/ ${d.total.toFixed(2)}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:6px;background:#E2E8F0;border-radius:3px;">
                            <div style="height:100%;width:${pct}%;background:var(--primary-blue);border-radius:3px;"></div>
                        </div>
                        <span style="font-size:12px;color:var(--text-muted);">${pct.toFixed(0)}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// --- REPORTE: PRODUCTOS ---
async function cargarReporteProductos() {
    const contenedor = document.getElementById('reporte-productos-tbody');
    contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data: productos, error } = await supabaseclient
        .from('productos')
        .select('*')
        .order('stock', { ascending: true });

    if (error) {
        console.error(error);
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error al cargar productos</td></tr>';
        return;
    }

    if (!productos || productos.length === 0) {
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">No hay productos registrados</td></tr>';
        document.getElementById('productos-total').textContent = '0';
        document.getElementById('productos-valor').textContent = 'S/ 0.00';
        return;
    }

    const totalProductos = productos.length;
    const valorInventario = productos.reduce((sum, p) => sum + (Number(p.precio) * p.stock), 0);
    const enRiesgo = productos.filter(p => p.stock <= 5).length;
    document.getElementById('productos-total').textContent = totalProductos;
    document.getElementById('productos-valor').textContent = `S/ ${valorInventario.toFixed(2)}`;
    document.getElementById('kpi-riesgo-reportes').textContent = enRiesgo;

    contenedor.innerHTML = productos.map(p => {
        const riesgo = p.stock <= 5;
        const normal = p.stock > 5 && p.stock <= 20;
        const bien = p.stock > 20;
        return `
            <tr>
                <td>#${p.id}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>S/ ${Number(p.precio).toFixed(2)}</td>
                <td>
                    <span style="font-weight:600;color:${riesgo ? 'var(--danger-red)' : normal ? 'var(--warning-yellow)' : 'var(--success-green)'}">
                        ${p.stock} und.
                    </span>
                </td>
                <td>
                    ${riesgo ? '<span class="badge badge-danger">Stock Crítico</span>' : ''}
                    ${normal ? '<span class="badge badge-warning">Stock Bajo</span>' : ''}
                    ${bien ? '<span class="badge badge-success">Stock OK</span>' : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// --- CARGA COMPLETA ---
async function cargarReportes() {
    const esJefa = typeof usuarioActual === 'object' && usuarioActual?.rol === 'JEFA';

    document.querySelectorAll('.jefa-only').forEach(el => {
        el.style.display = esJefa ? '' : 'none';
    });

    await Promise.all([
        cargarReporteDiario(),
        cargarReporteSemanal(),
        cargarReporteProductos()
    ]);

    if (esJefa) {
        await Promise.all([
            cargarReporteFacturas(),
            cargarReporteMovimientosStock(),
            cargarReporteVentasPeriodo()
        ]);
    }
}

function switchReportTab(btn, tab) {
    document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.report-tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`report-tab-${tab}`).classList.add('active');
}

function buscarReportes(texto) {
    const tabs = document.querySelectorAll('.report-tab-content');
    tabs.forEach(tab => {
        const filas = tab.querySelectorAll('tr');
        filas.forEach(fila => {
            const contenido = fila.textContent.toLowerCase();
            fila.style.display = contenido.includes(texto) ? '' : 'none';
        });
    });
}

// ============================================================
// REPORTES AVANZADOS (solo JEFA)
// ============================================================

async function cargarReporteFacturas() {
    const contenedor = document.getElementById('reporte-facturas-tbody');
    if (!contenedor) return;
    contenedor.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data, error } = await supabaseclient
        .from('facturas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error(error);
        contenedor.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">Error al cargar facturas</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No hay facturas emitidas</td></tr>';
        return;
    }

    const totalMonto = data.reduce((s, f) => s + Number(f.total), 0);
    const kpiTotal = document.getElementById('reporte-facturas-total');
    const kpiMonto = document.getElementById('reporte-facturas-monto');
    if (kpiTotal) kpiTotal.textContent = data.length;
    if (kpiMonto) kpiMonto.textContent = `S/ ${totalMonto.toFixed(2)}`;

    contenedor.innerHTML = data.map(f => `
        <tr>
            <td><strong>${f.serie}-${String(f.numero).padStart(4, '0')}</strong></td>
            <td>#${f.venta_id}</td>
            <td>${f.ruc}</td>
            <td>${f.razon_social}</td>
            <td><strong>S/ ${Number(f.total).toFixed(2)}</strong></td>
            <td>${new Date(f.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
        </tr>
    `).join('');
}

async function cargarReporteMovimientosStock() {
    const contenedor = document.getElementById('reporte-movimientos-tbody');
    if (!contenedor) return;
    contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data, error } = await supabaseclient
        .from('movimientos_stock')
        .select('*, productos(nombre)')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error(error);
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error al cargar movimientos</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">No hay movimientos registrados</td></tr>';
        return;
    }

    contenedor.innerHTML = data.map(m => {
        const clase = m.tipo === 'entrada' ? 'badge-success' : m.tipo === 'salida' ? 'badge-danger' : 'badge-warning';
        return `
            <tr>
                <td>${m.productos?.nombre || 'ID: ' + m.producto_id}</td>
                <td><span class="badge ${clase}">${m.tipo.toUpperCase()}</span></td>
                <td><strong>${m.cantidad}</strong></td>
                <td>${m.motivo || '-'}</td>
                <td>${new Date(m.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
            </tr>
        `;
    }).join('');
}

async function cargarReporteVentasPeriodo() {
    const contenedor = document.getElementById('reporte-periodo-tbody');
    if (!contenedor) return;
    contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data, error } = await supabaseclient
        .from('ventas')
        .select('id, total, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Error al cargar ventas</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">No hay ventas registradas</td></tr>';
        return;
    }

    const { data: detalles } = await supabaseclient
        .from('detalle_venta')
        .select('venta_id, cantidad');

    const ventasCount = {};
    if (detalles) {
        detalles.forEach(d => {
            ventasCount[d.venta_id] = (ventasCount[d.venta_id] || 0) + d.cantidad;
        });
    }

    contenedor.innerHTML = data.map(v => `
        <tr>
            <td>#${v.id}</td>
            <td>${new Date(v.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })}</td>
            <td>${ventasCount[v.id] || 0} producto(s)</td>
            <td><strong>S/ ${Number(v.total).toFixed(2)}</strong></td>
            <td><span class="badge badge-success">Completado</span></td>
        </tr>
    `).join('');
}

function switchStockTab(btn, tab) {
    document.querySelectorAll('.stock-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.stock-tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`stock-tab-${tab}`).classList.add('active');
}

function abrirModalMovimientoStock() {
    document.getElementById('form-movimiento-stock').reset();
    document.getElementById('modal-movimiento-stock').style.display = 'flex';
    cargarSelectorProductos();
}

async function cargarFacturas() {
    const tbody = document.getElementById('facturas-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Cargando...</td></tr>';

    const { data, error } = await supabaseclient
        .from('facturas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">Error al cargar facturas</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No hay facturas emitidas</td></tr>';
        document.getElementById('facturas-total').textContent = '0';
        document.getElementById('facturas-monto').textContent = 'S/ 0.00';
        document.getElementById('facturas-ultima').textContent = '-';
        return;
    }

    const totalMonto = data.reduce((s, f) => s + Number(f.total), 0);
    document.getElementById('facturas-total').textContent = data.length;
    document.getElementById('facturas-monto').textContent = `S/ ${totalMonto.toFixed(2)}`;
    document.getElementById('facturas-ultima').textContent = `${data[0].serie}-${String(data[0].numero).padStart(4, '0')}`;

    tbody.innerHTML = data.map(f => `
        <tr>
            <td><strong>${f.serie}-${String(f.numero).padStart(4, '0')}</strong></td>
            <td>#${f.venta_id}</td>
            <td>${f.ruc}</td>
            <td>${f.razon_social}</td>
            <td><strong>S/ ${Number(f.total).toFixed(2)}</strong></td>
            <td>${new Date(f.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
        </tr>
    `).join('');
}
