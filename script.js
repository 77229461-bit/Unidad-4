// CONFIGURACIÓN DE SUPABASE (Comentada para que siga funcionando con datos locales por ahora)

const supabaseUrl = 'https://isibglprrslfhquhnqhj.supabase.co';
const supabaseKey = 'sb_publishable_IUpdwBEQj6jj-DYNttW6HA_9Ljw0XVf';
const supabaseclient = supabase.createClient(supabaseUrl, supabaseKey);


// --- DATOS LOCALES SIMULADOS ---
const DB = {
    products: [],
    cart: []
};

// --- RUTAS Y VISTAS ---
function switchView(target) {
    if (target === 'login') {
        document.getElementById('view-login').classList.add('active');
        document.getElementById('erp-app').classList.remove('active');
        return;
    } else {
        document.getElementById('view-login').classList.remove('active');
        document.getElementById('erp-app').classList.add('active');
    }

    document.querySelectorAll('.subview').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.menu-nav button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`subview-${target}`).style.display = 'block';
    document.getElementById(`nav-${target}`).classList.add('active');

    if(target === 'inventario') cargarTablaInventario();
    if(target === 'ventas')     cargarProductosPOS();
    if(target === 'reportes')   cargarReportes();
    if(target === 'stock')      cargarGestionStock();
    if(target === 'facturas')   cargarFacturas();
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    await login(correo, password);

    initChart();
});

// --- INVENTARIO ---
function renderInventory() {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = '';

    DB.products.forEach(p => {
        const pct = (p.stock / p.max) * 100;
        const colorClass = pct < 15 ? 'bg-danger' : 'bg-success';
        
        tbody.innerHTML += `
            <tr>
                <td><span style="font-family: monospace; font-weight:600; color: var(--primary-blue);">${p.sku}</span></td>
                <td><strong style="color: var(--text-main);">${p.name}</strong><br><small style="color:var(--text-muted)">${p.category}</small></td>
                <td><i class="ri-map-pin-line" style="color:var(--text-muted)"></i> ${p.location}</td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar ${colorClass}" style="width: ${pct}%"></div>
                    </div>
                    <strong>${p.stock}</strong> <span style="color:var(--text-muted); font-size: 12px;">/ ${p.max}</span>
                </td>
                <td><strong>S/ ${p.price.toFixed(2)}</strong></td>
            </tr>
        `;
    });
}

async function cargarProductosPOS() {

    const productos = await obtenerProductos();

    DB.products = productos.map(p => ({
        sku: `IS-${p.id}`,
        name: p.nombre,
        price: p.precio,
        stock: p.stock,
        category: p.categorias?.nombre || '',
        icon: 'ri-box-3-line'
    }));

    renderPOS();
}
// --- POS (PUNTO DE VENTA) ---
function renderPOS() {
    const catalogue = document.getElementById('pos-catalogue');
    catalogue.innerHTML = '';

    DB.products.forEach(p => {
        catalogue.innerHTML += `
            <div class="product-card" onclick="addToCart('${p.sku}')">
                <div class="product-img-placeholder"><i class="${p.icon}"></i></div>
                <div style="font-size: 14px; font-weight:600; margin-bottom:4px; color: var(--text-main);">${p.name}</div>
                <div style="color: var(--primary-blue); font-weight:700; font-size: 16px;">S/ ${p.price.toFixed(2)}</div>
                <div style="font-size: 12px; color:var(--text-muted); margin-top:8px;">
                    <i class="ri-archive-line"></i> Stock: ${p.stock}
                </div>
            </div>
        `;
    });
}

// Agregar al carrito
function addToCart(sku) {
    const prod = DB.products.find(p => p.sku === sku);
    if(prod && prod.stock > 0) {
        DB.cart.push({ ...prod, cartId: Date.now() + Math.random() }); // ID único para el carrito
        prod.stock--; 
        updateCartUI();
        renderPOS(); // Actualiza el stock visual en las tarjetas
    } else {
        alert("Sin stock disponible para este producto.");
    }
}

// Eliminar del carrito
function removeFromCart(index) {
    const item = DB.cart[index];
    const prod = DB.products.find(p => p.sku === item.sku);
    if(prod) prod.stock++; // Devuelve el stock al inventario
    
    DB.cart.splice(index, 1);
    updateCartUI();
    renderPOS();
}

// Actualizar interfaz del carrito
function updateCartUI() {
    const container = document.getElementById('cart-container');
    container.innerHTML = '';
    
    if (DB.cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="ri-shopping-cart-2-line"></i>
                <p>El carrito está vacío</p>
            </div>`;
        document.getElementById('txt-subtotal').innerText = `S/ 0.00`;
        document.getElementById('txt-tax').innerText = `S/ 0.00`;
        document.getElementById('txt-total').innerText = `S/ 0.00`;
        return;
    }

    let subtotal = 0;
    DB.cart.forEach((item, index) => {
        subtotal += item.price;
        container.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">S/ ${item.price.toFixed(2)}</div>
                </div>
                <div style="display:flex; align-items:center; gap: 15px;">
                    <strong style="color: var(--text-main);">S/ ${item.price.toFixed(2)}</strong>
                    <button class="btn-remove" onclick="removeFromCart(${index})" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        `;
    });

    // Usando IGV peruano (18%)
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    document.getElementById('txt-subtotal').innerText = `S/ ${subtotal.toFixed(2)}`;
    document.getElementById('txt-tax').innerText = `S/ ${tax.toFixed(2)}`;
    document.getElementById('txt-total').innerText = `S/ ${total.toFixed(2)}`;
}

// Seleccionar método de pago
function selectPayment(btnElement) {
    document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
}

// Procesar Venta
function processPayment() {
    if(DB.cart.length === 0) return alert("¡Agrega productos al carrito primero!");
    
    alert("✅ ¡Venta procesada con éxito!");
    DB.cart = [];
    updateCartUI();
    renderPOS();
}

// --- GRÁFICA (CHART.JS) ---
let chartInstance = null;
function initChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Ventas Reales',
                data: [15000, 18000, 16000, 22000, 20000, 24000],
                borderColor: '#2563EB',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(37, 99, 235, 0.05)'
            },
            {
                label: 'Predicción IA',
                data: [null, null, null, null, 20000, 24000, 28000, 31000], // Línea predictiva hacia el futuro
                borderColor: '#10B981',
                borderWidth: 3,
                borderDash: [5, 5], // Línea punteada
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true } }
            },
            scales: { 
                y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#E2E8F0' } }, 
                x: { grid: { display: false } } 
            }
        }
    });
}

document
    .getElementById('global-search')
    .addEventListener('input', manejarBusqueda);

function manejarBusqueda(e) {

    const texto = e.target.value.toLowerCase();

    if (
        document.getElementById('subview-ventas')
        .style.display !== 'none'
    ) {

        buscarProductosPOS(texto);

    } else if (
        document.getElementById('subview-inventario')
        .style.display !== 'none'
    ) {

        buscarInventario(texto);
    } else if (
        document.getElementById('subview-reportes')
        .style.display !== 'none'
    ) {
        buscarReportes(texto);
    } else if (
        document.getElementById('subview-stock')
        .style.display !== 'none'
    ) {
        buscarReportes(texto);
    } else if (
        document.getElementById('subview-facturas')
        .style.display !== 'none'
    ) {
        buscarReportes(texto);
    }
}