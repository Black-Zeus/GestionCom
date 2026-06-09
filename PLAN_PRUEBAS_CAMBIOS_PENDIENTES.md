# Plan de pruebas - cambios pendientes de commit

## Alcance

Validar los cambios incluidos en este commit:

- Modales de Administracion alineados con la guia visual, sin mostrar codigos internos generados.
- Reordenamiento del modal de productos.
- Fase 1 de flags de inventario: ubicacion, lotes y vencimiento.

No incluye soporte completo de seriales. `Controla seriales` queda fuera de esta fase.

## Preparacion

1. Levantar el proyecto con Docker y confirmar contenedores saludables.
2. Aplicar la migracion incluida:
   - `scripts/mariadb/entrypoint/20260608_120000_enable_inventory_tracking_dimensions.sql`
3. Reiniciar `gestioncom-backend-api`.
4. Iniciar sesion con un usuario con permisos de administracion e inventario.
5. Confirmar que la pantalla no tenga errores 500 al abrir:
   - Administracion > Productos
   - Inventario > Movimientos de stock
   - Inventario > Transferencias
   - Inventario > Inventario fisico

## Pruebas de Administracion

### Modales

1. Abrir editar/crear en estos modulos:
   - Caja POS
   - Metodos de pago
   - Unidades de medida
   - Bodegas
   - Caja chica
   - Series/documentos
   - Configuracion tributaria
   - Mantenedores genericos
2. Verificar que no aparezca un campo `Codigo` interno generado por backend en formularios de crear/editar.
3. Guardar un registro editable y confirmar que persiste sin error.

### Producto

1. Abrir Administracion > Productos.
2. Editar un producto.
3. Confirmar orden visual:
   - Nombre en fila completa.
   - Categoria y unidad base en la misma fila.
   - Precio costo y precio base en la misma fila.
   - Marca y modelo en la misma fila.
   - Descripcion al final.
4. Guardar sin cambiar datos y confirmar exito.

## Pruebas de Inventario - Movimientos

### Producto simple

1. Seleccionar un SKU cuyo producto no controle ubicacion, lote ni vencimiento.
2. Registrar ingreso manual sin ubicacion/lote/vencimiento.
3. Confirmar que el movimiento se crea.
4. Registrar salida manual menor o igual al stock disponible.
5. Confirmar que descuenta stock.

### Producto con ubicacion

1. Seleccionar un SKU cuyo producto tenga `Controla ubicacion` activo.
2. Intentar registrar ingreso sin ubicacion interna.
3. Resultado esperado: backend rechaza con mensaje de ubicacion obligatoria.
4. Repetir seleccionando bodega, zona y ubicacion interna.
5. Resultado esperado: movimiento creado.
6. Registrar salida desde la misma ubicacion.
7. Resultado esperado: descuenta solo desde esa ubicacion.

### Producto con lote

1. Seleccionar o crear un SKU cuyo producto tenga `Controla lotes` activo.
2. Intentar registrar ingreso sin lote.
3. Resultado esperado: backend rechaza con mensaje de lote obligatorio.
4. Repetir indicando lote.
5. Resultado esperado: movimiento creado y listado muestra el lote.
6. Registrar salida con el mismo lote.
7. Resultado esperado: descuenta solo de ese lote.

### Producto con vencimiento

1. Seleccionar o crear un SKU cuyo producto tenga `Controla vencimiento` activo.
2. Intentar registrar ingreso sin lote.
3. Resultado esperado: backend rechaza.
4. Intentar registrar ingreso con lote pero sin fecha de vencimiento.
5. Resultado esperado: backend rechaza.
6. Repetir con lote y vencimiento.
7. Resultado esperado: movimiento creado y listado muestra lote/vencimiento.

## Pruebas de Inventario - Transferencias

1. Crear transferencia entre dos bodegas.
2. Agregar item simple y confirmar disponibilidad.
3. Agregar item con ubicacion/lote/vencimiento cuando aplique.
4. Confirmar que el item muestra lote/vencimiento en el detalle.
5. Despachar transferencia.
6. Confirmar que descuenta desde la combinacion exacta:
   - SKU
   - Bodega origen
   - Ubicacion origen
   - Lote
   - Vencimiento
7. Recibir transferencia.
8. Confirmar que ingresa en ubicacion pendiente conservando lote/vencimiento.
9. Ubicar stock recibido.
10. Confirmar que pasa de pendiente a ubicacion final conservando lote/vencimiento.

## Pruebas de Inventario Fisico

1. Crear inventario fisico para una bodega.
2. Agregar SKU simple y registrar cantidad.
3. Agregar SKU con ubicacion/lote/vencimiento cuando aplique.
4. Confirmar que la tabla muestra:
   - Ubicacion
   - Lote
   - Vencimiento
   - Cantidad sistema
   - Cantidad contada
5. Ejecutar flujo:
   - Iniciar
   - Registrar conteos
   - Enviar a revision
   - Aprobar
   - Contabilizar
6. Confirmar que el ajuste afecta la combinacion exacta de stock.

## Validaciones tecnicas

Ejecutar:

```powershell
docker exec gestioncom-frontend npx eslint src/pages/admin/AdminStockMovements.jsx src/pages/admin/AdminStockTransfers.jsx src/pages/admin/AdminPhysicalInventory.jsx src/services/inventory/stockMovementsService.js src/services/inventory/stockTransfersService.js src/services/inventory/physicalInventoryService.js
```

```powershell
docker exec gestioncom-backend-api python -m py_compile /app/routes/stock_movements.py /app/routes/stock_transfers.py /app/routes/physical_inventory.py /app/utils/inventory_tracking.py
```

## Criterios de aceptacion

- No hay errores 500 en las rutas de inventario afectadas.
- Las validaciones condicionales ocurren en backend, no solo en frontend.
- Ubicacion, lote y vencimiento se conservan en movimientos, transferencias e inventario fisico.
- Los modales de Administracion no muestran codigos internos generados.
- El modal de producto mantiene el orden visual solicitado.
- El arbol de trabajo queda limpio despues de commitear.
