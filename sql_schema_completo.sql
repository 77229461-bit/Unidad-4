-- ============================================================
-- SCRIPT COMPLETO - IntegraSys ERP
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    correo      VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    nombre      VARCHAR(255) NOT NULL,
    rol         VARCHAR(20) NOT NULL DEFAULT 'CAJERA' CHECK (rol IN ('JEFA', 'CAJERA')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABLA: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(255) NOT NULL,
    documento   VARCHAR(50),
    telefono    VARCHAR(20),
    email       VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABLA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TABLA: productos
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(255) NOT NULL,
    precio        NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    categoria_id  INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock);

-- ============================================================
-- 5. TABLA: ventas
-- ============================================================
CREATE TABLE IF NOT EXISTS ventas (
    id            SERIAL PRIMARY KEY,
    cliente_id    INTEGER NOT NULL DEFAULT 1 REFERENCES clientes(id) ON DELETE RESTRICT,
    total         NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at);

-- ============================================================
-- 6. TABLA: detalle_venta
-- ============================================================
CREATE TABLE IF NOT EXISTS detalle_venta (
    id              SERIAL PRIMARY KEY,
    venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad        INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal        NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta_id ON detalle_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto_id ON detalle_venta(producto_id);

-- ============================================================
-- 7. TABLA: facturas (NUEVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS facturas (
    id              SERIAL PRIMARY KEY,
    venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    serie           VARCHAR(4) NOT NULL DEFAULT 'F001',
    numero          INTEGER NOT NULL,
    ruc             VARCHAR(11) NOT NULL DEFAULT '20600000000',
    razon_social    VARCHAR(255) NOT NULL DEFAULT 'CLIENTE VARIOS',
    total           NUMERIC(10,2) NOT NULL,
    usuario_id      INTEGER REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_venta_id ON facturas(venta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_created_at ON facturas(created_at);

-- Secuencia para numeración automática de facturas
CREATE SEQUENCE IF NOT EXISTS seq_factura_numero START 1;

-- ============================================================
-- 8. TABLA: movimientos_stock (NUEVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos_stock (
    id              SERIAL PRIMARY KEY,
    producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad        INTEGER NOT NULL,
    stock_anterior  INTEGER NOT NULL DEFAULT 0,
    stock_nuevo     INTEGER NOT NULL DEFAULT 0,
    motivo          VARCHAR(255),
    usuario_id      INTEGER REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto_id ON movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON movimientos_stock(created_at);

-- ============================================================
-- 9. TABLA: proveedores (NUEVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS proveedores (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(255) NOT NULL,
    ruc             VARCHAR(11) UNIQUE,
    telefono        VARCHAR(20),
    email           VARCHAR(255),
    direccion       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. SEED DATA
-- ============================================================

-- Usuarios de prueba
INSERT INTO usuarios (correo, password, nombre, rol) VALUES
    ('jefa@sistema.com', 'Jefa123', 'María García', 'JEFA'),
    ('cajera@sistema.com', 'Cajera123', 'Lucía Pérez', 'CAJERA')
ON CONFLICT (correo) DO NOTHING;

-- Cliente por defecto
INSERT INTO clientes (id, nombre, documento) VALUES (1, 'Cliente Mostrador', 'Varios')
ON CONFLICT (id) DO NOTHING;

-- Categorías
INSERT INTO categorias (id, nombre) VALUES
    (1, 'Electrónico'),
    (2, 'Electrodomésticos'),
    (3, 'Tecnología'),
    (4, 'Accesorios')
ON CONFLICT (id) DO NOTHING;

-- Productos de ejemplo
INSERT INTO productos (id, nombre, precio, stock, categoria_id) VALUES
    (1, 'Laptop HP ProBook', 2499.00, 15, 1),
    (2, 'Monitor 24" LG', 599.00, 8, 1),
    (3, 'Teclado Mecánico Redragon', 189.00, 25, 4),
    (4, 'Mouse Inalámbrico Logitech', 79.00, 30, 4),
    (5, 'Impresora Multifuncional Epson', 899.00, 5, 2),
    (6, 'Disco SSD 1TB Kingston', 249.00, 12, 1),
    (7, 'Router WiFi 6 TP-Link', 329.00, 10, 1),
    (8, 'Cargador USB-C 65W', 59.00, 50, 4),
    (9, 'Audífonos Bluetooth Sony', 449.00, 7, 4),
    (10, 'Webcam HD 1080p', 129.00, 20, 4)
ON CONFLICT (id) DO NOTHING;

-- Proveedores de ejemplo
INSERT INTO proveedores (nombre, ruc, telefono, email, direccion) VALUES
    ('Distribuidora Tecnológica SAC', '20123456789', '987654321', 'ventas@ditec.com', 'Av. Principal 123, Lima'),
    ('Importaciones Globales EIRL', '20456789012', '976543210', 'info@importglobal.com', 'Jr. Comercio 456, Lima'),
    ('Suministros Industriales SA', '20789012345', '965432109', 'pedidos@suminsa.com', 'Calle Industria 789, Arequipa')
ON CONFLICT (ruc) DO NOTHING;

-- Ajustar secuencia de facturas
SELECT setval('seq_factura_numero', COALESCE((SELECT MAX(numero) + 1 FROM facturas), 1));
