// Referencia al tbody y modales
const tbodyInventario = document.getElementById('inventory-tbody');
const formRegistro = document.getElementById('form-nuevo-producto');
// ¡NUEVO! Referencias para abrir/cerrar el modal
const btnRegistrarProducto =  document.getElementById('btn-registrar-producto');
const modalRegistro = document.getElementById('modal-registro');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

let idProductoEditando = null;

// ¡NUEVO! Lógica para ABRIR el modal al hacer clic en "+ Registrar Producto"
if (btnRegistrarProducto && modalRegistro) {
        btnRegistrarProducto.addEventListener('click', () => {

            idProductoEditando = null;

            formRegistro.reset();

            modalRegistro.style.display = 'flex';

        });
}

// ¡NUEVO! Lógica para CERRAR el modal desde el botón "Cancelar"
if (btnCerrarModal && modalRegistro) {
    btnCerrarModal.addEventListener('click', () => {
        modalRegistro.style.display = 'none';
    });
}

// Función principal para cargar la tabla
async function cargarTablaInventario() {
    // Mostramos un mensaje de carga mientras Supabase responde
    tbodyInventario.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Cargando catálogo...</td></tr>';
    
    const productos = await obtenerProductos();
    
    if (!productos) {
        tbodyInventario.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar los datos.</td></tr>';
        return;
    }

    // Limpiamos el tbody
    tbodyInventario.innerHTML = '';

    const esJefa = typeof usuarioActual === 'object' && usuarioActual?.rol === 'JEFA';

    productos.forEach(prod => {
        const sku = `IS-${prod.id.toString().padStart(3, '0')}-PR`;
        const nombreCategoria = prod.categorias ? prod.categorias.nombre : 'Sin categoría';
        
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td style="color: #2563eb; font-weight: 500;">${sku}</td>
            <td>
                <div style="font-weight: 600;">${prod.nombre}</div>
                <div style="font-size: 0.85em; color: gray;">${nombreCategoria}</div>
            </td>
            <td>Almacén Central</td> 
            <td>
                <span style="font-weight: bold;">${prod.stock}</span> Und.
            </td>
            <td><strong>S/ ${prod.precio.toFixed(2)}</strong></td>
            <td style="text-align: center; white-space: nowrap;">
                ${esJefa ? `
                <button class="btn-editar" data-id="${prod.id}" style="padding: 6px 10px; margin-right: 5px; background-color: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="ri-edit-line"></i> Editar
                </button>
                <button class="btn-eliminar" data-id="${prod.id}" style="padding: 6px 10px; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="ri-delete-bin-line"></i> Eliminar
                </button>
                ` : '<span style="color:var(--text-muted);font-size:12px;">Solo lectura</span>'}
            </td>
        `;
        
        tbodyInventario.appendChild(tr);
    });

    activarBotonesCRUD();
}

function activarBotonesCRUD() {
    // ---- LÓGICA PARA ELIMINAR ----
    const botonesEliminar = document.querySelectorAll('.btn-eliminar');
    
    botonesEliminar.forEach(boton => {
        boton.addEventListener('click', async (e) => {
            const idProducto = e.currentTarget.getAttribute('data-id');
            
            if (confirm(`¿Estás seguro de que deseas eliminar el producto #${idProducto}?`)) {
                const exito = await eliminarProducto(idProducto);
                if (exito) {
                    cargarTablaInventario(); 
                } else {
                    alert('Hubo un problema al eliminar.');
                }
            }
        });
    });

    // ---- LÓGICA PARA EDITAR ----
    const botonesEditar = document.querySelectorAll('.btn-editar');

    botonesEditar.forEach(boton => {

        boton.addEventListener('click', async (e) => {

            const idProducto = e.currentTarget.getAttribute('data-id');

            const producto = await obtenerProductoPorId(idProducto);

            if (!producto) {
                alert('No se pudo cargar el producto');
                return;
            }

            idProductoEditando = idProducto;

            document.getElementById('input-nombre').value =
                producto.nombre;

            document.getElementById('input-precio').value =
                producto.precio;

            document.getElementById('input-stock').value =
                producto.stock;

            document.getElementById('select-categoria').value =
                producto.categoria_id;

            modalRegistro.style.display = 'flex';
        });

    });
}

// Llamamos a la carga inicial cuando la página arranca
document.addEventListener('DOMContentLoaded', () => {
    cargarTablaInventario();
});

// --- FUNCIONES DE SUPABASE ---

async function obtenerProductos() {
  const { data, error } = await supabaseclient
    .from('productos')
    .select(`
      id,
      nombre,
      precio,
      stock,
      categorias ( id, nombre )
    `)
    .order('id', { ascending: false });

  if (error) {
    console.error('Error al obtener productos:', error);
    return null;
  }
  return data;
}

async function crearProducto(nuevoProducto) {
  if (typeof usuarioActual !== 'object' || usuarioActual?.rol !== 'JEFA') {
    alert('Acceso denegado. Solo Jefatura puede crear productos.');
    return null;
  }
  const { data, error } = await supabaseclient
    .from('productos')
    .insert([nuevoProducto])
    .select();

  if (error) {
    console.error('Error al crear producto:', error);
    return null;
  }
  return data[0];
}

async function actualizarProducto(idProducto, datosAActualizar) {
  if (typeof usuarioActual !== 'object' || usuarioActual?.rol !== 'JEFA') {
    alert('Acceso denegado. Solo Jefatura puede editar productos.');
    return null;
  }
  const { data, error } = await supabaseclient
    .from('productos')
    .update(datosAActualizar)
    .eq('id', idProducto)
    .select();

  if (error) {
    console.error('Error al actualizar producto:', error);
    return null;
  }
  return data[0];
}

async function eliminarProducto(idProducto) {
  if (typeof usuarioActual !== 'object' || usuarioActual?.rol !== 'JEFA') {
    alert('Acceso denegado. Solo Jefatura puede eliminar productos.');
    return false;
  }
  const { error } = await supabaseclient
    .from('productos')
    .delete()
    .eq('id', idProducto);

  if (error) {
    console.error('Error al eliminar producto:', error);
    return false; 
  }
  return true; 
}

// --- SUBMIT DEL FORMULARIO ---

if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const nuevoProducto = {
            nombre: document.getElementById('input-nombre').value,
            categoria_id: parseInt(document.getElementById('select-categoria').value),
            precio: parseFloat(document.getElementById('input-precio').value),
            stock: parseInt(document.getElementById('input-stock').value)
        };

        console.log('Guardando en base de datos...', nuevoProducto);
        let resultado;

            if (idProductoEditando) {

                resultado = await actualizarProducto(
                    idProductoEditando,
                    nuevoProducto
                );

            } else {

                resultado = await crearProducto(
                    nuevoProducto
                );

            }

        if (resultado) {

            idProductoEditando = null;

            formRegistro.reset();

            modalRegistro.style.display = 'none';

            cargarTablaInventario();
        } else {
            alert('Hubo un error al registrar el producto.');
        }
    });
}

// FUNC EDITAR

async function obtenerProductoPorId(idProducto) {

    const { data, error } = await supabaseclient
        .from('productos')
        .select('*')
        .eq('id', idProducto)
        .single();

    if (error) {
        console.error('Error al obtener producto:', error);
        return null;
    }

    return data;
}



function buscarInventario(texto) {

    const filas =
        document.querySelectorAll(
            '#inventory-tbody tr'
        );

    filas.forEach(fila => {

        const contenido =
            fila.textContent.toLowerCase();

        fila.style.display =
            contenido.includes(texto)
                ? ''
                : 'none';
    });
}