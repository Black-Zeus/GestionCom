// ====================================
// BARCODE MANAGER (PÁGINA PRINCIPAL)
// ====================================

import { useState, useEffect } from "react";
import BarcodeForm from "./BarcodeForm";
import BarcodeList from "./BarcodeList";
import BarcodeTypesPanel from "./BarcodeTypesPanel";
import BarcodeDetailModal from "./BarcodeDetailModal";
import ModalManager from "@/components/ui/modal/ModalManager";
import mockData from "./data.json";

const BarCodeManager = () => {
  const [barcodeState, setBarcodeState] = useState([]);

  const products = mockData.products;
  const activeProducts = products.filter((p) => p.is_active);
  const variants = mockData.product_variants;
  const barcodes = mockData.product_barcodes;

  useEffect(() => {
    initializeBarcodeState();
  }, []);

  const initializeBarcodeState = () => {
    const catalogBarcodes = barcodes.map((bc) => {
      const variant = variants.find((v) => v.id === bc.product_variant_id);
      const product = variant
        ? products.find((p) => p.id === variant.product_id)
        : null;

      return {
        id: `CAT-${bc.id}`,
        source: "catalog",
        productId: product?.id ?? null,
        productCode: product?.product_code ?? "",
        productName: product?.product_name ?? "",
        variantId: variant?.id ?? null,
        variantSku: variant?.variant_sku ?? "",
        variantName: variant?.variant_name ?? "",
        barcodeType: bc.barcode_type,
        barcodeValue: bc.barcode_value,
        isPrimary: !!bc.is_primary,
      };
    });

    setBarcodeState(catalogBarcodes);
  };

  const handleAddBarcode = (newBarcode) => {
    setBarcodeState((prev) => [newBarcode, ...prev]);
  };

  const handleClearAll = () => {
    if (barcodeState.length === 0) {
      ModalManager.info({
        title: "Lista vacía",
        message: "No hay códigos para limpiar.",
      });
      return;
    }

    ModalManager.confirm({
      title: "Limpiar Lista de Códigos",
      message: "¿Estás seguro de limpiar toda la lista de códigos? Esta acción no se puede deshacer.",
      confirmText: "Limpiar",
      cancelText: "Cancelar",
      onConfirm: () => {
        setBarcodeState([]);
        ModalManager.success({
          title: "Lista Limpiada",
          message: "Todos los códigos han sido eliminados de la lista.",
        });
      },
    });
  };

  const handleViewDetails = (barcode) => {
    ModalManager.custom({
      title: "Detalle del Código de Barras",
      size: "4xl",
      showCloseButton: true,
      content: (
        <BarcodeDetailModal
          barcode={barcode}
          products={products}
          variants={variants}
        />
      ),
    });
  };

  return (
    <div className="w-[90%] mx-auto my-6">
      <header className="flex justify-between items-end gap-4 mb-5">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800 tracking-wide mb-1">
            Códigos de Barra y QR
          </h1>
          <p className="text-sm text-gray-500">
            Simulador de códigos EAN/UPC y QR para productos y variantes del catálogo.
          </p>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        <BarcodeForm
          products={activeProducts}
          variants={variants}
          onAddBarcode={handleAddBarcode}
        />

        <BarcodeList
          barcodes={barcodeState}
          onClearAll={handleClearAll}
          onViewDetails={handleViewDetails}
        />
      </main>

      <BarcodeTypesPanel />
    </div>
  );
};

export default BarCodeManager;