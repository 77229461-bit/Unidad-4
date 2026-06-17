async function cargarVentas() {

    const { data, error } = await supabaseclient
        .from('ventas')
        .select('total');

    if (error) return console.error(error);

    const totalVentas = data.reduce(
        (sum, venta) => sum + Number(venta.total),
        0
    );

    document.getElementById('kpi-sales').textContent =
        `S/ ${totalVentas.toFixed(2)}`;
}

async function cargarStock() {

    const { data, error } = await supabaseclient
        .from('productos')
        .select('stock');

    if (error) return console.error(error);

    const stockTotal = data.reduce(
        (sum, producto) => sum + producto.stock,
        0
    );

    document.getElementById('kpi-stock').textContent =
        stockTotal;
}

async function cargarProductosVendidos() {

    const { data, error } = await supabaseclient
        .from('detalle_venta')
        .select('cantidad');

    if (error) return console.error(error);

    const vendidos = data.reduce(
        (sum, item) => sum + item.cantidad,
        0
    );

    document.getElementById('kpi-productos').textContent =
        vendidos;
}

async function cargarProductosRiesgo() {

    const { data, error } = await supabaseclient
        .from('productos')
        .select('*')
        .lte('stock', 5);

    if (error) return console.error(error);

    document.getElementById('kpi-riesgo').textContent =
        data.length;
}

async function cargarDashboard() {

    await cargarVentas();
    await cargarStock();
    await cargarProductosVendidos();
    await cargarProductosRiesgo();
}

