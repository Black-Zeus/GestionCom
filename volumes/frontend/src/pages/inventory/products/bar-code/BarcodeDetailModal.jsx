// ====================================
// BARCODE DETAIL MODAL COMPONENT
// ====================================

import React, { useRef, useEffect } from "react";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";

const BarcodeDetailModal = ({ barcode, products, variants }) => {
  const qrCanvasRef = useRef(null);

  if (!barcode) return null;

  const {
    barcodeValue,
    barcodeType,
    isPrimary,
    source,
    qrConfig,
    productId,
    variantId,
  } = barcode;

  // Obtener información completa del producto
  const fullProduct = products.find(p => p.id === productId);
  const fullVariant = variantId ? variants.find(v => v.id === variantId) : null;

  const getTypeLabel = (type) => {
    const labels = {
      EAN13: "EAN-13",
      EAN8: "EAN-8",
      UPCA: "UPC-A",
      UPCE: "UPC-E",
      CODE128: "Code 128",
      QR: "QR estándar",
    };
    return labels[type] || type;
  };

  // Superponer logo en canvas QR - con delay
  useEffect(() => {
    if (barcodeType === "QR" && qrConfig?.logo && qrCanvasRef.current) {
      const timer = setTimeout(() => {
        const canvas = qrCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const logoSize = canvas.width * 0.25;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;
          
          // Fondo blanco para el logo
          ctx.fillStyle = 'white';
          ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
          
          // Dibujar logo
          ctx.drawImage(img, x, y, logoSize, logoSize);
        };
        img.onerror = () => {
          console.error('Error loading QR logo in detail modal');
        };
        img.src = qrConfig.logo;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [barcodeType, qrConfig]);

  const renderBarcodeVisual = () => {
    if (barcodeType === "QR") {
      const qrSize = qrConfig?.size || 200;
      
      return (
        <div className="flex flex-col items-center gap-2">
          <QRCodeCanvas 
            ref={qrCanvasRef}
            value={barcodeValue} 
            size={qrSize}
            level="H"
            includeMargin={true}
          />
        </div>
      );
    }

    const barcodeFormat = barcodeType === "EAN13" ? "EAN13" :
                          barcodeType === "EAN8" ? "EAN8" :
                          barcodeType === "UPCA" ? "UPC" :
                          barcodeType === "UPCE" ? "UPC" :
                          "CODE128";

    return (
      <div className="flex items-center justify-center">
        <Barcode
          value={barcodeValue}
          format={barcodeFormat}
          width={1.5}
          height={80}
          displayValue={true}
          fontSize={12}
          margin={5}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Información del Código - NUEVA ESTRUCTURA */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border-2 border-gray-200">
        <h3 className="text-base font-bold text-gray-800 mb-4">
          📊 Información del Código
        </h3>
        
        {/* Grid de 3 columnas: Visual | Datos superiores | Datos inferiores */}
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
          {/* Columna 1: Visual del código */}
          <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-300 flex items-center justify-center">
            {renderBarcodeVisual()}
          </div>

          {/* Columnas 2 y 3: Grid 2x2 con los 4 campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Tipo de Código</p>
              <p className="text-sm font-bold text-gray-800">{getTypeLabel(barcodeType)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Código Principal</p>
              <p className="text-sm font-bold text-gray-800">{isPrimary ? "✅ Sí" : "❌ No"}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Origen</p>
              <p className="text-sm font-bold text-gray-800">
                {source === "catalog" ? "📦 Catálogo" : "🔧 Simulado"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Valor del Código</p>
              <p className="text-sm font-mono font-bold text-gray-800 break-all">{barcodeValue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Información COMPLETA del Producto */}
      {fullProduct && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
          <h3 className="text-base font-bold text-gray-800 mb-4">
            📦 Información Completa del Producto
          </h3>
          
          {/* Información Básica */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-blue-300 pb-2">Información Básica</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Nombre del Producto</p>
                <p className="text-sm font-bold text-gray-800">{fullProduct.product_name}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Código de Producto</p>
                <p className="text-sm font-mono font-bold text-blue-600">{fullProduct.product_code}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Marca</p>
                <p className="text-sm font-bold text-gray-800">{fullProduct.brand || "—"}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Modelo</p>
                <p className="text-sm font-bold text-gray-800">{fullProduct.model || "—"}</p>
              </div>
            </div>
          </div>

          {/* Descripción */}
          {fullProduct.product_description && (
            <div className="mb-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Descripción</p>
                <p className="text-sm text-gray-700">{fullProduct.product_description}</p>
              </div>
            </div>
          )}

          {/* Características del Producto */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-blue-300 pb-2">Características</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500 mb-1">Tiene Variantes</p>
                <p className="text-lg">{fullProduct.has_variants ? "✅" : "❌"}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500 mb-1">Control de Lotes</p>
                <p className="text-lg">{fullProduct.has_batch_control ? "✅" : "❌"}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500 mb-1">Fecha de Vencimiento</p>
                <p className="text-lg">{fullProduct.has_expiry_date ? "✅" : "❌"}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500 mb-1">N° de Serie</p>
                <p className="text-lg">{fullProduct.has_serial_numbers ? "✅" : "❌"}</p>
              </div>
            </div>
          </div>

          {/* IDs del Sistema */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-blue-300 pb-2">Identificadores del Sistema</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">ID de Producto</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fullProduct.id}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">ID de Categoría</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fullProduct.category_id}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Estado</p>
                <p className="text-sm font-bold text-gray-800">
                  {fullProduct.is_active ? "🟢 Activo" : "🔴 Inactivo"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información COMPLETA de la Variante */}
      {fullVariant && (
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200">
          <h3 className="text-base font-bold text-gray-800 mb-4">
            🏷️ Información Completa de la Variante
          </h3>
          
          {/* Información Básica de Variante */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-purple-300 pb-2">Datos de la Variante</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Nombre de Variante</p>
                <p className="text-sm font-bold text-gray-800">{fullVariant.variant_name}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">SKU de Variante</p>
                <p className="text-sm font-mono font-bold text-purple-600">{fullVariant.variant_sku || "—"}</p>
              </div>
            </div>
          </div>

          {/* Descripción de Variante */}
          {fullVariant.variant_description && (
            <div className="mb-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Descripción de Variante</p>
                <p className="text-sm text-gray-700">{fullVariant.variant_description}</p>
              </div>
            </div>
          )}

          {/* Propiedades de Variante */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-purple-300 pb-2">Propiedades</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">ID de Variante</p>
                <p className="text-sm font-mono font-bold text-gray-800">{fullVariant.id}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Variante por Defecto</p>
                <p className="text-sm font-bold text-gray-800">
                  {fullVariant.is_default_variant ? "✅ Sí" : "❌ No"}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Estado</p>
                <p className="text-sm font-bold text-gray-800">
                  {fullVariant.is_active ? "🟢 Activo" : "🔴 Inactivo"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuración QR (si existe) */}
      {barcodeType === "QR" && qrConfig && (
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200">
          <h3 className="text-base font-bold text-gray-800 mb-4">
            ⚙️ Configuración del QR
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Tamaño del QR</p>
              <p className="text-2xl font-bold text-green-600">{qrConfig.size}px</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Logo Central</p>
              <p className="text-2xl font-bold text-green-600">
                {qrConfig.logo ? "✅ Sí" : "❌ No"}
              </p>
            </div>
          </div>
          {qrConfig.logo && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Preview del Logo</p>
              <div className="flex justify-center bg-white rounded-lg p-4 shadow-sm">
                <img
                  src={qrConfig.logo}
                  alt="Logo QR"
                  className="w-32 h-32 object-contain border-2 border-green-300 rounded-lg p-2"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeDetailModal;