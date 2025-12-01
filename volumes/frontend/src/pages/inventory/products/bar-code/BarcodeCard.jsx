// ====================================
// BARCODE CARD COMPONENT
// ====================================

import { useState, useRef, useEffect } from "react";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";

const BarcodeCard = ({ barcode, onViewDetails }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const qrCanvasRef = useRef(null);

  const {
    barcodeValue,
    productCode,
    productName,
    variantName,
    variantSku,
    barcodeType,
    isPrimary,
    source,
    qrConfig,
  } = barcode;

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

  const getTypeChipStyle = (type) => {
    if (type === "QR") {
      return "border-green-400 bg-green-50 text-green-700";
    }
    if (type === "CODE128") {
      return "border-orange-400 bg-orange-50 text-orange-700";
    }
    return "border-blue-400 bg-blue-50 text-blue-700";
  };

  const productLabel = productCode
    ? `${productCode} — ${productName}`
    : productName;
  const variantLabel = variantName
    ? ` · ${variantName} ${variantSku ? `(${variantSku})` : "(sin SKU)"}`
    : "";

  // Superponer logo en canvas QR - con delay para asegurar renderizado
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
          console.error('Error loading QR logo');
        };
        img.src = qrConfig.logo;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [barcodeType, qrConfig]);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let canvas;
      
      if (barcodeType === "QR") {
        canvas = qrCanvasRef.current;
      } else {
        canvas = document.querySelector(`#barcode-wrapper-${barcode.id} canvas`);
      }
      
      if (canvas) {
        const link = document.createElement('a');
        link.download = `barcode-${barcodeType}-${productCode || barcode.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        alert("No se pudo exportar el código. Intenta nuevamente.");
      }
      
      setTimeout(() => setIsExporting(false), 500);
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al exportar el código");
      setIsExporting(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    
    setTimeout(() => {
      console.info("Publicando código:", {
        id: barcode.id,
        type: barcodeType,
        value: barcodeValue,
        productId: barcode.productId,
        variantId: barcode.variantId,
        isPrimary,
        qrConfig,
      });
      
      alert(`✅ Código ${barcodeType} publicado correctamente\n\nProducto: ${productName}\nValor: ${barcodeValue}`);
      setIsPublishing(false);
    }, 1000);
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(barcode);
    }
  };

  const renderBarcodeVisual = () => {
    if (barcodeType === "QR") {
      const qrSize = qrConfig?.size || 200;
      
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 rounded-lg border border-gray-300 bg-white">
            <QRCodeCanvas 
              ref={qrCanvasRef}
              value={barcodeValue} 
              size={qrSize}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="text-xs text-gray-500 text-center max-w-[200px] truncate">
            {barcodeValue}
          </div>
          <div className="text-xs text-gray-400">
            Tamaño: {qrSize}px {qrConfig?.logo && "· Con logo"}
          </div>
        </div>
      );
    }

    const barcodeFormat = barcodeType === "EAN13" ? "EAN13" :
                          barcodeType === "EAN8" ? "EAN8" :
                          barcodeType === "UPCA" ? "UPC" :
                          barcodeType === "UPCE" ? "UPC" :
                          "CODE128";

    return (
      <div className="flex items-center justify-center p-3 rounded-lg border border-gray-300 bg-white">
        <div id={`barcode-wrapper-${barcode.id}`}>
          <Barcode
            value={barcodeValue}
            format={barcodeFormat}
            width={1.5}
            height={60}
            displayValue={true}
            fontSize={12}
            margin={5}
          />
        </div>
      </div>
    );
  };

  return (
    <article className="grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-3 p-3 rounded-lg border border-gray-300 bg-gray-50">
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold text-gray-800">
          {barcodeValue}
        </div>
        <div className="text-xs text-gray-600">
          {productLabel || "Producto no identificado"}
          {variantLabel}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-1">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${getTypeChipStyle(
              barcodeType
            )}`}
          >
            {getTypeLabel(barcodeType)}
          </span>

          {isPrimary && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-yellow-400 bg-yellow-50 text-yellow-700">
              Principal
            </span>
          )}

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-gray-300 bg-gray-100 text-gray-600">
            {source === "catalog" ? "Catálogo" : "Simulado"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center">
        {renderBarcodeVisual()}
      </div>

      <div className="flex flex-col gap-2 justify-center min-w-[110px]">
        <button
          onClick={handleViewDetails}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-xs font-medium transition-all duration-150 hover:bg-blue-100 hover:border-blue-400 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Ver Detalle</span>
        </button>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium transition-all duration-150 hover:bg-gray-50 hover:border-gray-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Exportando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Exportar</span>
            </>
          )}
        </button>

        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-transparent bg-gradient-to-br from-green-500 to-green-600 text-white text-xs font-medium transition-all duration-150 hover:from-green-600 hover:to-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Publicando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Publicar</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};

export default BarcodeCard;