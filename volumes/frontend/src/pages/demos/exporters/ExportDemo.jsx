import React, { useState, useEffect } from "react";
import ExportButton from "@/components/common/exporter/ExportButton";
import {
  basicUsers,
  userColumns,
  salesData,
  salesColumns,
  multipleDatasets,
  corporateBranding,
  generateLargeDataset,
} from "./mockData";

// AL INICIO del componente ExportDemo, después de los imports:
import { getAvailableExporters } from "@/components/common/exporter/exports/index.js";

const ExportDemo = () => {
  const [status, setStatus] = useState("");
  const [hasData, setHasData] = useState(true);

  const handleExportStart = () => setStatus("Exportando...");
  const handleExportSuccess = (result) => {
    setStatus(`✅ Listo: ${result.size} bytes`);
    setTimeout(() => setStatus(""), 3000);
  };
  const handleExportError = (error) => {
    setStatus(`❌ Error: ${error}`);
    setTimeout(() => setStatus(""), 3000);
  };

  const currentData = hasData ? basicUsers : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">ExportButton Demo</h1>
        <p className="text-gray-600">Ejemplos básicos de exportación</p>

        {status && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            {status}
          </div>
        )}

        <button
          onClick={() => setHasData(!hasData)}
          className={`mt-3 px-3 py-1 rounded text-sm font-medium ${
            hasData ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {hasData ? "✅ Con datos" : "❌ Sin datos"}
        </button>
      </div>

      {/* 1. Exportación básica */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Formatos básicos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ExportButton
            data={currentData}
            columns={userColumns}
            formats={["csv"]}
            filename="usuarios"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
          />
          <ExportButton
            data={currentData}
            columns={userColumns}
            formats={["json"]}
            filename="usuarios"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
          />
          <ExportButton
            data={currentData}
            columns={userColumns}
            formats={["xlsx"]}
            filename="usuarios"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
          />
          <ExportButton
            data={currentData}
            columns={userColumns}
            formats={["pdf"]}
            filename="usuarios"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
          />
        </div>
      </section>

      {/* 2. Todos los formatos */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Todos los formatos</h2>
        <ExportButton
          data={currentData}
          columns={userColumns}
          formats={["csv", "json", "xlsx", "pdf"]}
          filename="usuarios_completo"
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
        />
      </section>

      {/* 3. Con branding */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Con branding corporativo</h2>
        <ExportButton
          data={salesData}
          columns={salesColumns}
          formats={["xlsx-branded", "pdf-branded"]}
          branding={corporateBranding}
          filename="ventas_corporativo"
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
        />
      </section>

      {/* 4. Múltiples datasets */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Múltiples hojas Excel</h2>
        <ExportButton
          datasets={multipleDatasets}
          formats={["xlsx"]}
          filename="reporte_multiple"
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
        />
      </section>

      {/* 5. Dataset grande */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">
          Dataset grande (1000 registros)
        </h2>
        <ExportButton
          data={generateLargeDataset(1000)}
          columns={userColumns}
          formats={["csv", "xlsx"]}
          filename="usuarios_grandes"
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
        />
      </section>
    </div>
  );
};

export default ExportDemo;
