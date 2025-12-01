// ====================================
// QR CONFIG MODAL COMPONENT
// ====================================

import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

const QRConfigModal = ({ onSave, initialConfig = {} }) => {
  const [qrSize, setQrSize] = useState(initialConfig.size || 200);
  const [qrLogo, setQrLogo] = useState(null);
  const [qrLogoPreview, setQrLogoPreview] = useState(initialConfig.logo || "");
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    setQrSize(initialConfig.size || 200);
    setQrLogoPreview(initialConfig.logo || "");
  }, [initialConfig]);

  // Superponer logo en el QR preview - con delay para asegurar que el canvas esté listo
  useEffect(() => {
    if (qrLogoPreview && qrCanvasRef.current) {
      // Esperar a que el QR se renderice completamente
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
          console.error('Error loading logo image');
        };
        img.src = qrLogoPreview;
      }, 100); // Delay de 100ms para asegurar que el canvas esté renderizado

      return () => clearTimeout(timer);
    }
  }, [qrLogoPreview, qrSize]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar los 2MB');
        return;
      }

      setQrLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => setQrLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setQrLogo(null);
    setQrLogoPreview("");
  };

  const handleSave = () => {
    onSave({
      size: qrSize,
      logo: qrLogoPreview,
    });
  };

  return (
    <div className="space-y-5">
      {/* Sección 1: Tamaño del QR (arriba, ancho completo) */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Tamaño del QR: <span className="text-green-600 font-bold">{qrSize}px</span>
        </label>
        <input
          type="range"
          min="100"
          max="400"
          step="10"
          value={qrSize}
          onChange={(e) => setQrSize(parseInt(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>100px</span>
          <span>250px</span>
          <span>400px</span>
        </div>
      </div>

      {/* Sección 2: Logo (izquierda) + Vista Previa (derecha) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Columna Izquierda: Logo Central */}
        <div className="flex flex-col">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Logo Central
          </label>
          
          {!qrLogoPreview ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all group h-[240px]">
              <svg className="w-12 h-12 text-gray-400 mb-2 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium text-gray-700 mb-1">
                Subir imagen
              </span>
              <span className="text-xs text-gray-500">
                PNG, JPG (máx. 2MB)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative border-2 border-green-300 rounded-lg p-6 bg-green-50 h-[240px] flex items-center justify-center">
              <img
                src={qrLogoPreview}
                alt="Logo preview"
                className="max-w-[140px] max-h-[140px] object-contain"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Columna Derecha: Vista Previa */}
        <div className="flex flex-col">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Vista Previa
          </label>
          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center border-2 border-gray-300 h-[240px]">
            <div className="text-center">
              <div className="inline-block bg-white rounded-lg shadow-md p-3">
                <QRCodeCanvas 
                  ref={qrCanvasRef}
                  value="https://aplicacion.cl/findme?product=PREVIEW"
                  size={Math.min(qrSize, 180)}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {qrSize}px × {qrSize}px
                {qrLogoPreview && " · Con logo"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Consejos (abajo) + Botón (abajo derecha) */}
      <div className="flex flex-col md:flex-row items-start gap-3">
        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-blue-800">
              <p className="font-semibold mb-1">Consejos para el logo:</p>
              <ul className="space-y-0.5 text-blue-700">
                <li>• Usa imágenes cuadradas para mejor resultado</li>
                <li>• Fondo transparente (PNG) es ideal</li>
                <li>• Logos simples funcionan mejor que detallados</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium flex items-center gap-2 shadow-md whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Aplicar
        </button>
      </div>
    </div>
  );
};

export default QRConfigModal;