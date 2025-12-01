// ====================================
// BARCODE LIST COMPONENT
// ====================================

import BarcodeCard from "./BarcodeCard";

const BarcodeList = ({ barcodes, onClearAll, onViewDetails }) => {
  return (
    <section className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-5">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Previsualización
          </h2>
          <p className="text-xs text-gray-500">
            Visualiza los códigos existentes y los simulados sobre el catálogo.
          </p>
        </div>
        <button
          onClick={onClearAll}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-400 px-3 py-1.5 text-xs bg-transparent text-gray-700 transition-all duration-100 hover:bg-gray-50 active:scale-95"
        >
          Limpiar lista
        </button>
      </div>

      {barcodes.length === 0 ? (
        <div className="mt-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-5 px-4 text-center">
          <p className="text-sm font-medium text-gray-700 mb-1">
            Sin códigos para mostrar
          </p>
          <p className="text-xs text-gray-500">
            Se cargan los códigos del catálogo (product_barcodes) y luego puedes
            agregar simulaciones desde el formulario.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5 max-h-[33rem] overflow-y-auto pr-1 rounded-lg">
          {barcodes.map((barcode) => (
            <BarcodeCard 
              key={barcode.id} 
              barcode={barcode}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default BarcodeList;