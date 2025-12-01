// ====================================
// BARCODE TYPES PANEL COMPONENT
// ====================================

const BarcodeTypesPanel = () => {
  const linearTypes = [
    {
      code: "EAN-13",
      description: "Retail general, 13 dígitos (muy común en Europa y LATAM).",
    },
    {
      code: "EAN-8",
      description: "Envases pequeños, 8 dígitos.",
    },
    {
      code: "UPC-A",
      description: "Retail EE. UU./Canadá, 12 dígitos.",
    },
    {
      code: "UPC-E",
      description: "UPC comprimido para productos de tamaño reducido.",
    },
    {
      code: "Code 128",
      description:
        "Alfanumérico, alta densidad, muy usado en logística y etiquetas internas.",
    },
  ];

  const qrTypes = [
    {
      code: "QR estándar",
      description: "URLs, IDs internos, payloads para apps móviles.",
    },
    {
      code: "QR ficha producto",
      description: "Enlace a ficha técnica / detalle comercial.",
    },
    {
      code: "QR interno",
      description: "Codifica SKU/variant_id para procesos de bodega y POS.",
    },
  ];

  return (
    <section className="mt-5 bg-white rounded-xl border-2 border-gray-200 shadow-sm p-5 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Tipos de código más utilizados
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Lineales (EAN / UPC / Code 128)
          </h3>
          <ul className="grid gap-2">
            {linearTypes.map((type, index) => (
              <li key={index} className="grid grid-cols-[auto_1fr] gap-2 items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-blue-400 bg-blue-50 text-blue-700">
                  {type.code}
                </span>
                <span className="text-xs text-gray-600">{type.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">2D (QR)</h3>
          <ul className="grid gap-2">
            {qrTypes.map((type, index) => (
              <li key={index} className="grid grid-cols-[auto_1fr] gap-2 items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-green-400 bg-green-50 text-green-700">
                  {type.code}
                </span>
                <span className="text-xs text-gray-600">{type.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BarcodeTypesPanel;