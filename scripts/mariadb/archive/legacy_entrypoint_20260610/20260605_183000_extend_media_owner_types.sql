-- Extiende media_assets para soportar logos/banners de clientes y proveedores.

ALTER TABLE media_assets
MODIFY owner_type ENUM('USER','COMPANY','CUSTOMER','SUPPLIER','PRODUCT') NOT NULL;
