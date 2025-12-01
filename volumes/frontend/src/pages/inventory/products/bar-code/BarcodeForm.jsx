// ====================================
// BARCODE FORM COMPONENT
// ====================================

import { useState, useEffect } from "react";
import QRConfigModal from "./QRConfigModal";
import ModalManager from "@/components/ui/modal/ModalManager";

// Tipos de código de barras estrictamente numéricos
const NUMERIC_BARCODE_TYPES = ["EAN13", "EAN8", "UPCA", "UPCE"];

const BarcodeForm = ({ products, variants, onAddBarcode }) => {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [barcodeType, setBarcodeType] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [availableVariants, setAvailableVariants] = useState([]);

  // QR Config
  const [qrConfig, setQrConfig] = useState({ size: 200, logo: "" });

  useEffect(() => {
    if (selectedProductId) {
      const productVariants = variants.filter(
        (v) => v.product_id === parseInt(selectedProductId) && v.is_active
      );
      setAvailableVariants(productVariants);
      setSelectedVariantId("");
    } else {
      setAvailableVariants([]);
      setSelectedVariantId("");
    }
  }, [selectedProductId, variants]);

  useEffect(() => {
    if (!barcodeType || !selectedProductId) return;

    const product = products.find((p) => p.id === parseInt(selectedProductId));
    const variant = selectedVariantId
      ? variants.find((v) => v.id === parseInt(selectedVariantId))
      : null;

    if (barcodeType === "QR") {
      const identifier = variant?.variant_sku || product?.product_code || "";
      setBarcodeValue(`https://aplicacion.cl/findme?product=${identifier}`);
    } else {
      const code = variant?.variant_sku || product?.product_code || "";
      setBarcodeValue(code);
    }
  }, [barcodeType, selectedProductId, selectedVariantId, products, variants]);

  const handleQRConfigSave = (config) => {
    setQrConfig(config);
    ModalManager.closeAll();
  };

  const handleOpenQRConfig = () => {
    ModalManager.custom({
      title: "Configuración de QR",
      size: "large",
      showCloseButton: true,
      content: (
        <QRConfigModal
          onSave={handleQRConfigSave}
          initialConfig={qrConfig}
        />
      ),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedValue = barcodeValue.trim();

    if (!selectedProductId || !barcodeType || !trimmedValue) {
      alert("Producto, tipo de código y valor son obligatorios.");
      return;
    }

    // Validación específica: tipos numéricos solo aceptan dígitos
    if (
      NUMERIC_BARCODE_TYPES.includes(barcodeType) &&
      !/^\d+$/.test(trimmedValue)
    ) {
      alert("Para el tipo de código seleccionado, el valor debe contener solo dígitos (0-9).");
      return;
    }

    const product = products.find((p) => p.id === parseInt(selectedProductId));
    const variant = selectedVariantId
      ? variants.find((v) => v.id === parseInt(selectedVariantId))
      : null;

    const newBarcode = {
      id: `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: "simulated",
      productId: product?.id ?? null,
      productCode: product?.product_code ?? "",
      productName: product?.product_name ?? "",
      variantId: variant?.id ?? null,
      variantSku: variant?.variant_sku ?? "",
      variantName: variant?.variant_name ?? "",
      barcodeType,
      barcodeValue: trimmedValue,
      isPrimary,
      qrConfig: barcodeType === "QR" ? qrConfig : null,
    };

    onAddBarcode(newBarcode);
    handleReset();
  };

  const handleReset = () => {
    setSelectedProductId("");
    setSelectedVariantId("");
    setBarcodeType("");
    setBarcodeValue("");
    setIsPrimary(false);
    setAvailableVariants([]);
    setQrConfig({ size: 200, logo: "" });
  };

  const isQRType = barcodeType === "QR";

  return (
    <>
      <section className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Configuración de código</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-select" className="text-xs font-medium text-gray-700">Producto</label>
            <select
              id="product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm outline-none transition-all duration-150 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              required
            >
              <option value="">Selecciona un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="variant-select" className="text-xs font-medium text-gray-700">Variante</label>
            <select
              id="variant-select"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm outline-none transition-all duration-150 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Sin variante / SKU base</option>
              {availableVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.variant_sku ? `${v.variant_sku} — ${v.variant_name}` : v.variant_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Se muestran solo variantes activas asociadas al producto.</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="barcode-type" className="text-xs font-medium text-gray-700">Tipo de código</label>
              <select
                id="barcode-type"
                value={barcodeType}
                onChange={(e) => setBarcodeType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm outline-none transition-all duration-150 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                required
              >
                <option value="">Selecciona tipo…</option>
                <optgroup label="EAN / UPC / Code 128">
                  <option value="EAN13">EAN-13</option>
                  <option value="EAN8">EAN-8</option>
                  <option value="UPCA">UPC-A</option>
                  <option value="UPCE">UPC-E</option>
                  <option value="CODE128">Code 128</option>
                </optgroup>
                <optgroup label="2D">
                  <option value="QR">QR estándar</option>
                </optgroup>
              </select>
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-700">Marcadores</span>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  id="is-primary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
                />
                <span>Código principal de la variante</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="barcode-value" className="text-xs font-medium text-gray-700">Valor</label>
            <input
              id="barcode-value"
              type="text"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              placeholder={isQRType ? "https://aplicacion.cl/findme?product=..." : "Código del producto/variante"}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm outline-none transition-all duration-150 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              required
            />
            <p className="text-xs text-gray-500">
              {isQRType ? "Valor auto-generado con ruta de aplicación" : "Valor auto-completado con código del producto/variante seleccionado"}
            </p>
          </div>

          <div className="p-4 min-h-[140px]">
            {/* Botón de configuración QR */}
            {isQRType && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Configuración del QR
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Tamaño: <span className="font-medium">{qrConfig.size}px</span>
                      {qrConfig.logo && " · Con logo personalizado"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenQRConfig}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-600 bg-white text-green-700 text-xs font-medium transition-all duration-150 hover:bg-green-50 active:scale-95 whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Configurar
                  </button>
                </div>
                {qrConfig.logo && (
                  <div className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-green-300">
                    <img
                      src={qrConfig.logo}
                      alt="Logo QR"
                      className="w-10 h-10 object-contain border border-green-200 rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">✓ Logo configurado</p>
                      <p className="text-xs text-gray-500 truncate">Se mostrará al centro del código QR</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white transition-all duration-100 hover:from-blue-600 hover:to-blue-700 active:scale-95"
            >
              Agregar código
            </button>
            <button
              type="reset"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm bg-transparent text-gray-600 transition-all duration-100 hover:bg-gray-50 active:scale-95"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section >
    </>
  );
};

export default BarcodeForm;
