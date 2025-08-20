import React, { useState } from "react";
import ExportButton from "@/components/common/exporter/ExportButton";
import {
  basicUsers,
  userColumns,
  salesData,
  salesColumns,
  multipleDatasets,
  corporateBranding,
  generateLargeDataset,
  simulateDelay,
  specialTypesData,
} from "./mockData";

const ExportDemo = () => {
  const [exportStatus, setExportStatus] = useState("");
  const [largeDataSize, setLargeDataSize] = useState(100);
  const [hasData, setHasData] = useState(true);

  // Handlers para diferentes tipos de exportación
  const handleExportStart = () => {
    setExportStatus("🚀 Iniciando exportación...");
  };

  const handleExportSuccess = (result) => {
    setExportStatus(`✅ Exportación completada: ${result.size} bytes`);
    setTimeout(() => setExportStatus(""), 3000);
  };

  const handleExportError = (error) => {
    setExportStatus(`❌ Error: ${error}`);
    setTimeout(() => setExportStatus(""), 5000);
  };

  const handleExportFinally = (finalState) => {
    console.log("Estado final:", finalState);
  };

  // Configuración de cabeceras del config.js
  const defaultHeaders = {
    orgName: "Sistema de Inventario",
    createdBy: "Demo ExportButton",
    footerText: "Generado automáticamente",
    timestamp: new Date().toISOString(),
  };

  // Datos dinámicos según estado
  const currentData = hasData ? basicUsers : [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo de ExportButton - Versión Completa
        </h1>
        <p className="text-gray-600">
          Ejemplos de exportación en TODOS los formatos disponibles con opciones
          dinámicas
        </p>
        {exportStatus && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {exportStatus}
          </div>
        )}

        {/* Control de datos */}
        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={() => setHasData(!hasData)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              hasData
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {hasData ? "✅ Con datos" : "❌ Sin datos"} (Click para cambiar)
          </button>
        </div>
      </div>

      {/* 1. Exportación Básica - Todos los formatos */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          1. Todos los Formatos Disponibles
        </h2>
        <p className="text-gray-600 mb-4">
          Exportación con TODOS los formatos soportados. Botones se deshabilitan
          automáticamente sin datos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Formatos básicos */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              Formatos Básicos
            </h4>

            <ExportButton
              data={currentData}
              columns={userColumns}
              filename="usuarios_basicos"
              formats={["csv", "json"]}
              variant="outline"
              disabled={!hasData}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />

            <ExportButton
              data={currentData}
              columns={userColumns}
              filename="usuarios_xlsx"
              formats={["xlsx"]}
              variant="solid"
              disabled={!hasData}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          {/* Formatos avanzados */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              Formatos Corporativos
            </h4>

            <ExportButton
              data={currentData}
              columns={userColumns}
              filename="usuarios_corporativo"
              formats={["xlsx-branded"]}
              branding={corporateBranding}
              variant="solid"
              disabled={!hasData}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />

            <ExportButton
              data={currentData}
              columns={userColumns}
              filename="reporte_pdf"
              formats={["pdf-branded"]}
              branding={corporateBranding}
              variant="outline"
              disabled={!hasData}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          {/* Formatos múltiples */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              Múltiples Formatos
            </h4>

            <ExportButton
              data={currentData}
              columns={userColumns}
              filename="completo"
              formats={["xlsx", "csv", "json", "pdf"]}
              variant="solid"
              disabled={!hasData}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>
        </div>
      </section>

      {/* 2. Exportación con Cabeceras del Config */}
      <section className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          2. Exportación con Cabeceras de Configuración
        </h2>
        <p className="text-gray-600 mb-4">
          Implementa cabeceras automáticas desde el config.js del sistema.
        </p>

        <div className="bg-white p-4 rounded border mb-4">
          <h4 className="font-medium mb-2">Configuración de Cabeceras:</h4>
          <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(defaultHeaders, null, 2)}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton
            data={salesData}
            columns={salesColumns}
            filename="ventas_con_cabeceras"
            formats={["xlsx-branded", "pdf-branded"]}
            branding={{
              ...corporateBranding,
              ...defaultHeaders,
              includeHeaders: true,
              headerPosition: "top",
            }}
            disabled={!hasData}
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
          />

          <ExportButton
            data={salesData}
            columns={salesColumns}
            filename="csv_con_metadata"
            formats={["csv"]}
            branding={defaultHeaders}
            disabled={!hasData}
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
          />
        </div>
      </section>

      {/* 3. Múltiples Datasets */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          3. Múltiples Datasets (Hojas Excel)
        </h2>
        <p className="text-gray-600 mb-4">
          Exporta múltiples conjuntos de datos en diferentes hojas o secciones.
        </p>

        <ExportButton
          datasets={multipleDatasets}
          filename="reporte_completo"
          formats={["xlsx-branded", "json"]}
          branding={corporateBranding}
          disabled={!hasData}
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
        />
      </section>

      {/* 4. Opciones Deshabilitadas Dinámicamente */}
      <section className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          4. Estados Deshabilitados Dinámicos
        </h2>
        <p className="text-gray-600 mb-4">
          Demostración de opciones que se deshabilitan según el contexto.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Diferentes estados */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Sin datos disponibles</h4>
              <ExportButton
                data={[]}
                columns={userColumns}
                filename="sin_datos"
                formats={["xlsx", "csv", "json"]}
                disabled={true}
                onStart={handleExportStart}
                onSuccess={handleExportSuccess}
                onError={handleExportError}
              />
              <p className="text-xs text-gray-500">
                Botón deshabilitado automáticamente
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Solo un formato disponible
              </h4>
              <ExportButton
                data={currentData}
                columns={userColumns}
                filename="solo_csv"
                formats={["csv"]}
                variant="ghost"
                disabled={!hasData}
                onStart={handleExportStart}
                onSuccess={handleExportSuccess}
                onError={handleExportError}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Con delay simulado (3s)</h4>
              <ExportButton
                data={currentData.slice(0, 2)}
                columns={userColumns}
                filename="con_delay"
                formats={["xlsx", "csv"]}
                disabled={!hasData}
                onStart={async () => {
                  handleExportStart();
                  await simulateDelay(3000);
                }}
                onSuccess={handleExportSuccess}
                onError={handleExportError}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Formatos limitados por contexto
              </h4>
              <ExportButton
                data={salesData}
                columns={salesColumns}
                filename="limitado"
                formats={["xlsx", "pdf"]}
                hiddenFormats={["csv"]} // Oculta CSV intencionalmente
                disabled={!hasData}
                onStart={handleExportStart}
                onSuccess={handleExportSuccess}
                onError={handleExportError}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                Datos con tipos especiales
              </h4>
              <ExportButton
                data={specialTypesData}
                columns={[
                  { key: "id", header: "ID" },
                  { key: "nullValue", header: "Valor Null" },
                  { key: "booleanTrue", header: "Boolean" },
                  {
                    key: "dateValue",
                    header: "Fecha",
                    formatter: (val) => val?.toLocaleDateString(),
                  },
                  { key: "specialChars", header: "Caracteres Especiales" },
                ]}
                filename="tipos_especiales"
                formats={["xlsx", "csv", "json"]}
                onStart={handleExportStart}
                onSuccess={handleExportSuccess}
                onError={handleExportError}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Dataset Grande con Control */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          5. Datasets Grandes (Testing Performance)
        </h2>
        <p className="text-gray-600 mb-4">
          Prueba con datasets de diferentes tamaños para verificar rendimiento.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Tamaño del dataset: {largeDataSize} registros
          </label>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={largeDataSize}
            onChange={(e) => setLargeDataSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10</span>
            <span>500</span>
            <span>1000</span>
          </div>
        </div>

        <ExportButton
          data={generateLargeDataset(largeDataSize)}
          columns={userColumns}
          filename={`dataset_${largeDataSize}_registros`}
          formats={["xlsx", "csv", "json"]}
          onStart={() => {
            setExportStatus(`🚀 Procesando ${largeDataSize} registros...`);
          }}
          onSuccess={(result) => {
            setExportStatus(
              `✅ ${largeDataSize} registros exportados: ${result.size} bytes`
            );
            setTimeout(() => setExportStatus(""), 3000);
          }}
          onError={handleExportError}
        />
      </section>

      {/* 6. Items Personalizados */}
      <section className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          6. Items Personalizados del Menú
        </h2>
        <p className="text-gray-600 mb-4">
          Menú con acciones personalizadas además de los formatos estándar.
        </p>

        <ExportButton
          data={currentData}
          columns={userColumns}
          filename="con_items_custom"
          formats={["xlsx", "csv"]}
          items={[
            // Items builtin
            { type: "builtin", format: "xlsx", label: "Excel Completo" },
            { type: "builtin", format: "csv", label: "CSV Personalizado" },

            // Separador
            { type: "separator" },

            // Items custom
            {
              type: "custom",
              key: "email-list",
              label: "📧 Lista de Emails",
              icon: "📧",
              onClick: async (item, context) => {
                if (!context.data || context.data.length === 0) {
                  alert("No hay datos para exportar");
                  return;
                }
                const emails = context.data
                  .map((user) => user.email)
                  .filter(Boolean)
                  .join("\n");
                const blob = new Blob([emails], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "emails.txt";
                a.click();
                URL.revokeObjectURL(url);
                handleExportSuccess({ size: blob.size });
              },
            },
            {
              type: "custom",
              key: "summary",
              label: "📊 Resumen Estadístico",
              icon: "📊",
              onClick: async (item, context) => {
                if (!context.data || context.data.length === 0) {
                  alert("No hay datos para generar resumen");
                  return;
                }
                const summary = {
                  total_usuarios: context.data.length,
                  departamentos: [
                    ...new Set(context.data.map((u) => u.department)),
                  ],
                  salario_promedio:
                    context.data.reduce((sum, u) => sum + (u.salary || 0), 0) /
                    context.data.length,
                  generado_en: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(summary, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "resumen.json";
                a.click();
                URL.revokeObjectURL(url);
                handleExportSuccess({ size: blob.size });
              },
            },
          ]}
          disabled={!hasData}
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
        />
      </section>

      {/* 7. Personalización Visual */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          7. Personalización Visual
        </h2>
        <p className="text-gray-600 mb-4">
          Diferentes variantes visuales y configuraciones de idioma.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Etiquetas personalizadas</h4>
              <ExportButton
                data={currentData.slice(0, 2)}
                columns={userColumns}
                filename="etiquetas_custom"
                formats={["xlsx", "csv", "json"]}
                labels={{
                  export: "Descargar",
                  exporting: "Descargando...",
                  success: "Listo",
                  error: "Falló",
                  xlsx: "Hoja de Cálculo",
                  csv: "Archivo CSV",
                  json: "Datos JSON",
                }}
                disabled={!hasData}
                onStart={handleExportStart}
                onSuccess={handleExportSuccess}
                onError={handleExportError}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Iconos personalizados</h4>
              <ExportButton
                data={currentData.slice(0, 2)}
                columns={userColumns}
                filename="iconos_custom"
                formats={["xlsx", "csv", "json"]}
                icons={{
                  export: "⬇️",
                  xlsx: "🟢",
                  csv: "🔵",
                  json: "🟡",
                  loading: "⏳",
                  success: "🎉",
                  error: "💥",
                }}
                disabled={!hasData}
                onStart={handleExportStart}
                onSuccess={handleExportSuccess}
                onError={handleExportError}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Diferentes tamaños</h4>
              <div className="flex gap-2 items-center">
                <ExportButton
                  data={currentData.slice(0, 1)}
                  columns={userColumns}
                  filename="pequeno"
                  formats={["csv"]}
                  size="sm"
                  disabled={!hasData}
                  onStart={handleExportStart}
                  onSuccess={handleExportSuccess}
                  onError={handleExportError}
                />
                <ExportButton
                  data={currentData.slice(0, 1)}
                  columns={userColumns}
                  filename="mediano"
                  formats={["csv"]}
                  size="md"
                  disabled={!hasData}
                  onStart={handleExportStart}
                  onSuccess={handleExportSuccess}
                  onError={handleExportError}
                />
                <ExportButton
                  data={currentData.slice(0, 1)}
                  columns={userColumns}
                  filename="grande"
                  formats={["csv"]}
                  size="lg"
                  disabled={!hasData}
                  onStart={handleExportStart}
                  onSuccess={handleExportSuccess}
                  onError={handleExportError}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Diferentes variantes</h4>
              <div className="space-y-2">
                <ExportButton
                  data={currentData.slice(0, 1)}
                  columns={userColumns}
                  filename="solid"
                  formats={["csv"]}
                  variant="solid"
                  disabled={!hasData}
                  onStart={handleExportStart}
                  onSuccess={handleExportSuccess}
                  onError={handleExportError}
                />
                <ExportButton
                  data={currentData.slice(0, 1)}
                  columns={userColumns}
                  filename="outline"
                  formats={["csv"]}
                  variant="outline"
                  disabled={!hasData}
                  onStart={handleExportStart}
                  onSuccess={handleExportSuccess}
                  onError={handleExportError}
                />
                <ExportButton
                  data={currentData.slice(0, 1)}
                  columns={userColumns}
                  filename="ghost"
                  formats={["csv"]}
                  variant="ghost"
                  disabled={!hasData}
                  onStart={handleExportStart}
                  onSuccess={handleExportSuccess}
                  onError={handleExportError}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Información mejorada */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          💡 Funcionalidades Implementadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">
              ✅ Formatos Soportados:
            </h4>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• CSV básico con BOM UTF-8</li>
              <li>• JSON estructurado y optimizado</li>
              <li>• XLSX simple (librería xlsx)</li>
              <li>• XLSX corporativo (librería exceljs)</li>
              <li>• PDF simple y con branding</li>
              <li>• Múltiples datasets en hojas Excel</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">
              ✅ Características Avanzadas:
            </h4>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• Cabeceras automáticas del config.js</li>
              <li>• Opciones deshabilitadas dinámicamente</li>
              <li>• Items personalizados del menú</li>
              <li>• Branding corporativo configurable</li>
              <li>• Manejo de tipos de datos especiales</li>
              <li>• Carga diferida de dependencias</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-xs text-blue-700">
            🚀 <strong>Optimización:</strong> Todas las librerías se cargan
            dinámicamente solo cuando se necesitan, mejorando significativamente
            el tiempo de carga inicial de la aplicación.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ExportDemo;
