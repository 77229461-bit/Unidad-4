const CHAT_KEY = 'integraSys_chat_history';

let chatHistory = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');

function toggleChat() {
    const panel = document.getElementById('chat-panel');
    const btn = document.getElementById('chat-fab');
    panel.classList.toggle('open');
    btn.classList.toggle('open');
    if (panel.classList.contains('open')) {
        document.getElementById('chat-input').focus();
    }
}

function getSaludo() {
    const h = new Date().getHours();
    if (h < 12) return '¡Buenos días';
    if (h < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
}

async function iniciarChat() {
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = '';

    if (chatHistory.length === 0) {
        const saludo = getSaludo();
        const nombre = typeof usuarioActual === 'object' && usuarioActual?.nombre ? usuarioActual.nombre : 'usuario';
        agregarMensajeBot(`${saludo}, ${nombre}! Soy el asistente virtual de <strong>IntegraSys ERP</strong>. Puedes preguntarme sobre productos, ventas, stock y más. Escribe <strong>ayuda</strong> para ver lo que sé hacer.`);
        chatHistory.push({ role: 'assistant', text: `Saludo a ${nombre}` });
        guardarHistorial();
    } else {
        chatHistory.forEach(m => {
            if (m.role === 'user') agregarMensajeUsuario(m.text, false);
            else agregarMensajeBot(m.text, false);
        });
        scrollChat();
    }
}

function agregarMensajeUsuario(texto, guardar = true) {
    const messages = document.getElementById('chat-messages');
    messages.innerHTML += `
        <div class="chat-msg user">
            <div class="chat-bubble user">${texto}</div>
        </div>`;
    if (guardar) {
        chatHistory.push({ role: 'user', text: texto });
        guardarHistorial();
    }
    scrollChat();
}

function agregarMensajeBot(texto, guardar = true) {
    const messages = document.getElementById('chat-messages');
    messages.innerHTML += `
        <div class="chat-msg bot">
            <div class="chat-avatar-bot"><i class="ri-robot-line"></i></div>
            <div class="chat-bubble bot">${texto}</div>
        </div>`;
    if (guardar) {
        chatHistory.push({ role: 'assistant', text: texto.replace(/<[^>]*>/g, '') });
        guardarHistorial();
    }
    scrollChat();
}

function mostrarTyping() {
    const messages = document.getElementById('chat-messages');
    messages.innerHTML += `
        <div class="chat-msg bot" id="chat-typing">
            <div class="chat-avatar-bot"><i class="ri-robot-line"></i></div>
            <div class="chat-bubble bot typing">
                <span></span><span></span><span></span>
            </div>
        </div>`;
    scrollChat();
}

function ocultarTyping() {
    const el = document.getElementById('chat-typing');
    if (el) el.remove();
}

function scrollChat() {
    const messages = document.getElementById('chat-messages');
    messages.scrollTop = messages.scrollHeight;
}

function guardarHistorial() {
    const max = 50;
    if (chatHistory.length > max) chatHistory = chatHistory.slice(-max);
    localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory));
}

function limpiarChat() {
    chatHistory = [];
    localStorage.removeItem(CHAT_KEY);
    document.getElementById('chat-messages').innerHTML = '';
    iniciarChat();
}

function handleChatKey(e) {
    if (e.key === 'Enter') enviarMensaje();
}

async function enviarMensaje() {
    const input = document.getElementById('chat-input');
    const texto = input.value.trim();
    if (!texto) return;

    input.value = '';
    agregarMensajeUsuario(texto);
    mostrarTyping();

    const respuesta = await procesarConsulta(texto.toLowerCase());

    setTimeout(() => {
        ocultarTyping();
        agregarMensajeBot(respuesta);
    }, 500 + Math.random() * 500);
}

async function procesarConsulta(texto) {
    if (texto.includes('ayuda') || texto.includes('comandos') || texto.includes('qué puedes') || texto.includes('que sabes') || texto.includes('hacer')) {
        return `
            <strong>🤖 Comandos disponibles:</strong><br><br>
            📦 <strong>productos</strong> — Ver todos los productos<br>
            📦 <strong>producto [nombre]</strong> — Buscar un producto específico<br>
            ⚠️ <strong>stock bajo</strong> — Productos con stock ≤ 5<br>
            📂 <strong>categorias</strong> — Ver categorías disponibles<br>
            💰 <strong>ventas hoy</strong> — Ventas del día<br>
            📊 <strong>ventas semana</strong> — Ventas de la semana<br>
            📈 <strong>total ventas</strong> — Ingresos totales<br>
            🏆 <strong>producto más vendido</strong> — Producto top en ventas<br>
            🧹 <strong>limpiar</strong> — Limpiar conversación<br>
            ❓ <strong>ayuda</strong> — Mostrar esta ayuda
        `;
    }

    if (texto.includes('limpiar') || texto.includes('borrar')) {
        limpiarChat();
        return '🗑️ Conversación limpiada. ¿Necesitas algo más?';
    }

    if (texto.includes('categoria') || texto.includes('categorías') || texto.includes('categorias')) {
        return await consultarCategorias();
    }

    if ((texto.includes('producto') && (texto.includes('más vendido') || texto.includes('mas vendido') || texto.includes('top'))) || texto.includes('más vendido')) {
        return await consultarProductoTop();
    }

    if (texto.includes('producto')) {
        const partes = texto.split('producto');
        if (partes.length > 1 && partes[1].trim().length > 1) {
            return await consultarProducto(partes[1].trim());
        }
        return await consultarProductos();
    }

    if (texto.includes('stock bajo') || texto.includes('stock crítico') || texto.includes('stock critico') || texto.includes('riesgo') || texto.includes('sin stock')) {
        return await consultarStockBajo();
    }

    if ((texto.includes('ventas') && texto.includes('hoy')) || texto.includes('ventas del día') || texto.includes('ventas del dia')) {
        return await consultarVentasHoy();
    }

    if ((texto.includes('ventas') && (texto.includes('semana') || texto.includes('semanal') || texto.includes('semanal'))) || texto.includes('ventas de la semana')) {
        return await consultarVentasSemana();
    }

    if (texto.includes('total ventas') || texto.includes('ingresos totales') || texto.includes('todas las ventas') || (texto.includes('ventas') && texto.includes('total'))) {
        return await consultarTotalVentas();
    }

    if (texto.includes('hola') || texto.includes('buenos días') || texto.includes('buenas tardes') || texto.includes('buenas noches') || texto.includes('buen dia')) {
        const nombre = typeof usuarioActual === 'object' && usuarioActual?.nombre ? usuarioActual.nombre : 'usuario';
        return `${getSaludo()}, ${nombre}! 👋 ¿En qué puedo ayudarte?`;
    }

    if (texto.includes('gracias') || texto.includes('thanks') || texto.includes('graci')) {
        return '¡De nada! 😊 Estoy aquí para ayudarte con el sistema.';
    }

    return `
        No entendí tu consulta. 🤔<br><br>
        Puedes preguntarme sobre <strong>productos</strong>, <strong>ventas</strong>, <strong>stock</strong> o escribe <strong>ayuda</strong> para ver todos los comandos disponibles.
    `;
}

// --- CONSULTAS A SUPABASE ---

async function consultarProductos() {
    const { data, error } = await supabaseclient
        .from('productos')
        .select('id, nombre, precio, stock, categoria_id')
        .order('id', { ascending: false });

    if (error) return '❌ Error al consultar productos.';
    if (!data || data.length === 0) return '📦 No hay productos registrados.';

    let texto = `<strong>📦 Productos (${data.length}):</strong><br><br>`;
    data.slice(0, 10).forEach(p => {
        texto += `🔹 <strong>#${p.id}</strong> ${p.nombre} — S/ ${Number(p.precio).toFixed(2)} — Stock: ${p.stock}<br>`;
    });
    if (data.length > 10) texto += `<br>... y ${data.length - 10} producto(s) más.`;
    return texto;
}

async function consultarProducto(nombre) {
    const { data, error } = await supabaseclient
        .from('productos')
        .select('*')
        .ilike('nombre', `%${nombre}%`);

    if (error) return '❌ Error al buscar el producto.';
    if (!data || data.length === 0) return `🔍 No encontré ningún producto con "${nombre}".`;

    let texto = `<strong>🔍 Resultados para "${nombre}":</strong><br><br>`;
    data.forEach(p => {
        const estado = p.stock <= 5 ? '⚠️ Stock crítico' : p.stock <= 20 ? '⚡ Stock bajo' : '✅ Stock OK';
        texto += `🔹 <strong>${p.nombre}</strong> — S/ ${Number(p.precio).toFixed(2)} — ${p.stock} und. ${estado}<br>`;
    });
    return texto;
}

async function consultarStockBajo() {
    const { data, error } = await supabaseclient
        .from('productos')
        .select('*')
        .lte('stock', 5)
        .order('stock', { ascending: true });

    if (error) return '❌ Error al consultar stock.';
    if (!data || data.length === 0) return '✅ Todos los productos tienen stock suficiente. ¡No hay riesgos!';

    let texto = `<strong>⚠️ Productos con stock bajo (${data.length}):</strong><br><br>`;
    data.forEach(p => {
        texto += `🔸 <strong>${p.nombre}</strong> — Solo ${p.stock} und. — S/ ${Number(p.precio).toFixed(2)}<br>`;
    });
    texto += `<br>🔴 <strong>Recomendación:</strong> Reponer stock de estos productos lo antes posible.`;
    return texto;
}

async function consultarCategorias() {
    const { data, error } = await supabaseclient
        .from('categorias')
        .select('id, nombre');

    if (error) return '❌ Error al consultar categorías.';
    if (!data || data.length === 0) return '📂 No hay categorías registradas.';

    let texto = `<strong>📂 Categorías:</strong><br><br>`;
    data.forEach(c => {
        texto += `🔹 ${c.nombre}<br>`;
    });
    return texto;
}

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
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

async function consultarVentasHoy() {
    const { data, error } = await supabaseclient
        .from('ventas')
        .select('id, total, created_at')
        .gte('created_at', inicioDelDia())
        .order('created_at', { ascending: false });

    if (error) return '❌ Error al consultar ventas.';
    if (!data || data.length === 0) return '📅 No hay ventas registradas hoy.';

    const total = data.reduce((s, v) => s + Number(v.total), 0);
    let texto = `<strong>💰 Ventas de hoy (${data.length}):</strong><br><br>`;
    data.slice(0, 5).forEach(v => {
        texto += `🔹 #${v.id} — S/ ${Number(v.total).toFixed(2)} — ${formatearFecha(v.created_at)}<br>`;
    });
    if (data.length > 5) texto += `<br>... y ${data.length - 5} venta(s) más.`;
    texto += `<br><br><strong>Total del día: S/ ${total.toFixed(2)}</strong>`;
    return texto;
}

async function consultarVentasSemana() {
    const { data, error } = await supabaseclient
        .from('ventas')
        .select('id, total, created_at')
        .gte('created_at', inicioDeSemana())
        .order('created_at', { ascending: true });

    if (error) return '❌ Error al consultar ventas.';
    if (!data || data.length === 0) return '📅 No hay ventas esta semana.';

    const total = data.reduce((s, v) => s + Number(v.total), 0);
    return `<strong>📊 Ventas de la semana:</strong><br><br>🔹 ${data.length} transacciones<br>🔹 Total: <strong>S/ ${total.toFixed(2)}</strong>`;
}

async function consultarTotalVentas() {
    const { data, error } = await supabaseclient
        .from('ventas')
        .select('total');

    if (error) return '❌ Error al consultar ventas.';
    if (!data || data.length === 0) return '📈 No hay ventas registradas aún.';

    const total = data.reduce((s, v) => s + Number(v.total), 0);
    return `<strong>📈 Ingresos totales:</strong><br><br>🔹 ${data.length} ventas realizadas<br>🔹 Total acumulado: <strong>S/ ${total.toFixed(2)}</strong>`;
}

async function consultarProductoTop() {
    const { data, error } = await supabaseclient
        .from('detalle_venta')
        .select('producto_id, cantidad');

    if (error) return '❌ Error al consultar ventas.';
    if (!data || data.length === 0) return '🏆 Aún no hay ventas para determinar el producto más vendido.';

    const conteo = {};
    data.forEach(d => {
        conteo[d.producto_id] = (conteo[d.producto_id] || 0) + d.cantidad;
    });

    const topId = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];

    const { data: prod } = await supabaseclient
        .from('productos')
        .select('nombre')
        .eq('id', topId)
        .single();

    return `🏆 <strong>Producto más vendido:</strong><br><br>🔹 ${prod?.nombre || 'ID ' + topId}<br>🔹 ${conteo[topId]} unidad(es) vendida(s)`;
}
