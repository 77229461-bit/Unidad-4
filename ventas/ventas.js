let carrito = [];

function agregarAlCarrito() {}

function eliminarDelCarrito() {}

function actualizarTotales() {}

function processPayment() {}

function cargarProductosPOS() {}

async function cargarProductosPOS() {

    const { data, error } = await supabaseclient
        .from('productos')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    const catalogo = document.getElementById('pos-catalogue');

    catalogo.innerHTML = data.map(producto => `
        <div class="product-card"
             onclick="agregarAlCarrito(${producto.id})">

            <div class="product-img-placeholder">
                <i class="ri-box-3-line"></i>
            </div>

            <h4>${producto.nombre}</h4>

            <p>S/ ${producto.precio}</p>

            <small>Stock: ${producto.stock}</small>

        </div>
    `).join('');
    
}

async function agregarAlCarrito(id) {

    const { data } = await supabaseclient
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

    carrito.push(data);

    renderCarrito();

    actualizarTotales();
}

function renderCarrito() {

    const contenedor =
        document.getElementById('cart-container');

    if (carrito.length === 0) {

        contenedor.innerHTML = `
            <div class="empty-cart">
                <i class="ri-shopping-cart-line"></i>
                <p>El carrito está vacío</p>
            </div>
        `;

        return;
    }

    contenedor.innerHTML = carrito.map((item, index) => `
        <div class="cart-item">

            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${item.nombre}
                </div>

                <div class="cart-item-price">
                    S/ ${item.precio}
                </div>
            </div>

            <button
                class="btn-remove"
                onclick="eliminarDelCarrito(${index})">

                <i class="ri-delete-bin-line"></i>

            </button>

        </div>
    `).join('');
}

function eliminarDelCarrito(index) {

    carrito.splice(index, 1);

    renderCarrito();

    actualizarTotales();
}

function actualizarTotales() {

    const subtotal = carrito.reduce(
        (sum, item) => sum + Number(item.precio),
        0
    );

    const igv = subtotal * 0.18;

    const total = subtotal + igv;

    document.getElementById('txt-subtotal').textContent =
        `S/ ${subtotal.toFixed(2)}`;

    document.getElementById('txt-tax').textContent =
        `S/ ${igv.toFixed(2)}`;

    document.getElementById('txt-total').textContent =
        `S/ ${total.toFixed(2)}`;
}

async function processPayment() {

    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    const total = carrito.reduce(
        (sum, item) => sum + Number(item.precio),
        0
    );

    // Registrar venta
    const { data: venta, error: errorVenta } =
        await supabaseclient
            .from('ventas')
            .insert([
                {
                    cliente_id: 1,
                    total: total
                }
            ])
            .select()
            .single();

    if (errorVenta) {
        console.error(errorVenta);
        alert('Error al registrar venta');
        return;
    }

    // Registrar detalle de venta
    const detalles = carrito.map(item => ({
        venta_id: venta.id,
        producto_id: item.id,
        cantidad: 1,
        precio_unitario: item.precio,
        subtotal: item.precio
    }));

    const { error: errorDetalle } =
        await supabaseclient
            .from('detalle_venta')
            .insert(detalles);

    if (errorDetalle) {
        console.error(errorDetalle);
        alert('Error al registrar detalle');
        return;
    }

    // Generar factura
    const { data: facturasExistentes } = await supabaseclient
        .from('facturas')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1);

    const facturaNumero = (facturasExistentes && facturasExistentes.length > 0 ? facturasExistentes[0].numero : 0) + 1;

    const usuarioId = typeof usuarioActual === 'object' && usuarioActual?.id ? usuarioActual.id : null;

    const { error: errorInsFact } = await supabaseclient
        .from('facturas')
        .insert([{
            venta_id: venta.id,
            serie: 'F001',
            numero: facturaNumero,
            total: total,
            usuario_id: usuarioId
        }]);

    if (errorInsFact) {
        console.error('Error al generar factura:', errorInsFact);
    }

    // Actualizar stock
    for (const item of carrito) {

        const nuevoStock = item.stock - 1;

        await supabaseclient
            .from('productos')
            .update({
                stock: nuevoStock
            })
            .eq('id', item.id);
    }

    alert(`✅ Venta #${venta.id} registrada. Factura F001-${String(facturaNumero).padStart(4, '0')} generada.`);

    carrito = [];

    renderCarrito();
    actualizarTotales();

    await cargarProductosPOS();
    await cargarDashboard();
}


function buscarProductosPOS(texto) {

    const cards =
        document.querySelectorAll('.product-card');

    cards.forEach(card => {

        const nombre =
            card.querySelector('h4')
                .textContent
                .toLowerCase();

        card.style.display =
            nombre.includes(texto)
                ? ''
                : 'none';
    });
}