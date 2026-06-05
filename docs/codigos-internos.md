# Codigos internos

## Regla general

Los codigos internos de mantenedores no deben ser ingresados por usuarios. El frontend debe tratarlos como datos de solo lectura: pueden mostrarse en listados y, si aportan trazabilidad, en formularios de edicion deshabilitados.

En altas de mantenedores, el codigo lo genera siempre el backend dentro de la transaccion de creacion. Esto evita colisiones, formatos inconsistentes y dependencia de criterio manual.

## Patrones vigentes

- Bodegas: `BOD_0001`, `TIE_0001`, `OUT_0001`, segun tipo de ubicacion.
- Cajas POS: `POS_0001`.
- Fondos de caja chica: `PCF_000001`. Se usa ancho inicial de seis digitos porque puede crecer con usuarios o puntos de operacion.
- Categorias de caja chica: `PCC_0001`.
- Metodos de pago nuevos: `PAY_0001`. Los codigos semanticos base como `CASH`, `DEBIT` o `TRANSFER` se mantienen como catalogo funcional seed.
- Unidades de medida nuevas: `UM_0001`. Las unidades estandar como `UNIT`, `KG`, `LT` o `MT` se mantienen como catalogo funcional seed.
- Categorias de productos: `CAT_0001`.
- Grupos, atributos y valores de atributos nuevos: `ATG_0001`, `ATT_0001`, `ATV_0001`. Los codigos seed como `COLOR` o `SIZE` se mantienen como catalogo funcional seed.
- Series de documentos: `SER_0001`. Los tipos de documento seed mantienen codigos funcionales como `SALE_INVOICE`.
- Roles custom: `ROLE_0001`.

## Excepciones

Los codigos funcionales del sistema no se renombran ni se generan como mantenedores de negocio. Ejemplos: `USER_READ`, `ADMIN`, `SUPER_ADMIN`, `PETTY_CASH_APPROVE`, codigos de menu y permisos. Esos valores forman parte del contrato de autorizacion, seeds y logica interna.

Para transacciones o eventos delicados se debe preferir UUIDv4 o folios transaccionales especificos del dominio. No usar secuencias visibles como identificador unico de seguridad.

## Implementacion

- La generacion debe vivir en backend.
- Los endpoints de creacion no deben requerir campos `*_code`.
- Los endpoints de actualizacion no deben permitir modificar codigos.
- Las migraciones que corrijan codigos existentes deben ser idempotentes y preservar relaciones por `id`.
