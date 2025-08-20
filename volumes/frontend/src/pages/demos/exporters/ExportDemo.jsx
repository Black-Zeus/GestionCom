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
} from "./mockData";

const ExportDemo = () => {
  const [exportStatus, setExportStatus] = useState("");
  const [largeDataSize, setLargeDataSize] = useState(100);

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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo de ExportButton
        </h1>
        <p className="text-gray-600">
          Ejemplos de exportación en diferentes formatos y configuraciones
        </p>
        {exportStatus && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {exportStatus}
          </div>
        )}
      </div>

      {/* Exportación Básica */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">1. Exportación Básica</h2>
        <p className="text-gray-600 mb-4">
          Exporta una lista simple de usuarios en diferentes formatos.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">Vista previa de datos:</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  {userColumns.slice(0, 4).map((col) => (
                    <th key={col.key} className="text-left py-2 px-3">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {basicUsers.slice(0, 3).map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2 px-3">
                      #{user.id.toString().padStart(3, "0")}
                    </td>
                    <td className="py-2 px-3">{user.name}</td>
                    <td className="py-2 px-3">{user.email}</td>
                    <td className="py-2 px-3">{user.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Mostrando 3 de {basicUsers.length} registros
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton
            data={basicUsers}
            columns={userColumns}
            filename="usuarios_basico"
            formats={["xlsx", "csv", "json"]}
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            onFinally={handleExportFinally}
          />
        </div>
      </section>

      {/* Exportación con Branding */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          2. Exportación Corporativa
        </h2>
        <p className="text-gray-600 mb-4">
          Incluye branding corporativo y formatos avanzados como PDF con logo.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">Configuración de branding:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Organización: {corporateBranding.orgName}</li>
            <li>• Color primario: {corporateBranding.primaryColor}</li>
            <li>• Incluye marca de agua y numeración</li>
            <li>• Footer personalizado</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton
            data={salesData}
            columns={salesColumns}
            filename="reporte_ventas_corporativo"
            formats={["xlsx-branded", "pdf-branded", "csv"]}
            branding={corporateBranding}
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            variant="solid"
            size="md"
          />
        </div>
      </section>

      {/* Múltiples Datasets */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">3. Múltiples Datasets</h2>
        <p className="text-gray-600 mb-4">
          Exporta varios conjuntos de datos en un solo archivo (Excel con
          múltiples hojas, CSV con secciones).
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">Datasets incluidos:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {multipleDatasets.map((dataset, index) => (
              <li key={index}>
                • {dataset.name}: {dataset.data.length} registros
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton
            datasets={multipleDatasets}
            filename="reporte_completo_multiple"
            formats={["xlsx", "csv", "json"]}
            branding={corporateBranding}
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            variant="outline"
          />
        </div>
      </section>

      {/* Datos Grandes */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">4. Dataset Grande</h2>
        <p className="text-gray-600 mb-4">
          Prueba el rendimiento con datasets grandes. Útil para testing de
          memoria y velocidad.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4 mb-3">
            <label className="text-sm font-medium">Número de registros:</label>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={largeDataSize}
              onChange={(e) => setLargeDataSize(parseInt(e.target.value))}
              className="flex-1 max-w-xs"
            />
            <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
              {largeDataSize.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            ⚠️ Datasets muy grandes pueden tardar varios segundos en procesarse
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton
            data={generateLargeDataset(largeDataSize)}
            columns={userColumns}
            filename={`dataset_grande_${largeDataSize}`}
            formats={["xlsx", "csv"]}
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            variant="ghost"
          />
        </div>
      </section>

      {/* Configuraciones Avanzadas */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          5. Configuraciones Avanzadas
        </h2>
        <p className="text-gray-600 mb-4">
          Ejemplos con diferentes configuraciones de UI y comportamiento.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Botón pequeño */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Tamaño pequeño</h4>
            <ExportButton
              data={basicUsers.slice(0, 3)}
              columns={userColumns}
              filename="pequeño"
              size="sm"
              variant="solid"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          {/* Botón grande */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Tamaño grande</h4>
            <ExportButton
              data={basicUsers.slice(0, 3)}
              columns={userColumns}
              filename="grande"
              size="lg"
              variant="outline"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          {/* Solo un formato */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Solo CSV</h4>
            <ExportButton
              data={basicUsers.slice(0, 3)}
              columns={userColumns}
              filename="solo_csv"
              formats={["csv"]}
              variant="ghost"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          {/* Formatos limitados */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Formatos limitados</h4>
            <ExportButton
              data={salesData}
              columns={salesColumns}
              filename="limitado"
              formats={["xlsx", "pdf"]}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          {/* Con delay simulado */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Con delay (3s)</h4>
            <ExportButton
              data={basicUsers.slice(0, 2)}
              columns={userColumns}
              filename="con_delay"
              onStart={async () => {
                handleExportStart();
                await simulateDelay(3000);
              }}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          {/* Deshabilitado */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Deshabilitado</h4>
            <ExportButton
              data={[]}
              columns={[]}
              filename="deshabilitado"
              disabled={true}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>
        </div>
      </section>

      {/* Items personalizados */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">6. Items Personalizados</h2>
        <p className="text-gray-600 mb-4">
          Menu con acciones personalizadas además de los formatos estándar.
        </p>

        <ExportButton
          data={basicUsers}
          columns={userColumns}
          filename="personalizado"
          formats={["xlsx", "csv"]}
          items={[
            // Items builtin (formatos estándar)
            {
              type: "builtin",
              format: "xlsx",
              label: "Excel Personalizado",
              icon: "📊",
              description: "Archivo Excel con formato especial",
            },
            {
              type: "builtin",
              format: "csv",
              label: "CSV Especial",
              icon: "📄",
              description: "CSV con configuración personalizada",
            },
            // Items personalizados
            {
              type: "custom",
              key: "email-list",
              label: "Lista de Emails",
              icon: "📧",
              description: "Solo direcciones de correo",
              onClick: async (item, context) => {
                await simulateDelay(1000);
                const emails = context.data
                  .map((user) => user.email)
                  .join("\n");
                const blob = new Blob([emails], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "emails.txt";
                a.click();
                URL.revokeObjectURL(url);
                handleExportSuccess(blob);
              },
            },
            {
              type: "custom",
              key: "summary",
              label: "Resumen Ejecutivo",
              icon: "📈",
              description: "Resumen estadístico",
              onClick: async (item, context) => {
                await simulateDelay(1500);
                const total = context.data.length;
                const active = context.data.filter((u) => u.active).length;
                const avgSalary =
                  context.data.reduce((sum, u) => sum + u.salary, 0) / total;

                const summary = `RESUMEN EJECUTIVO
========================
Total empleados: ${total}
Empleados activos: ${active}
Empleados inactivos: ${total - active}
Salario promedio: ${new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: "EUR",
                }).format(avgSalary)}

Departamentos:
${Object.entries(
  context.data.reduce((acc, u) => {
    acc[u.department] = (acc[u.department] || 0) + 1;
    return acc;
  }, {})
)
  .map(([dept, count]) => `- ${dept}: ${count}`)
  .join("\n")}
`;

                const blob = new Blob([summary], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "resumen_ejecutivo.txt";
                a.click();
                URL.revokeObjectURL(url);
                handleExportSuccess(blob);
              },
            },
          ]}
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
        />
      </section>

      {/* Configuraciones de idioma */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          7. Configuración de Idioma
        </h2>
        <p className="text-gray-600 mb-4">
          Ejemplos con diferentes idiomas y etiquetas personalizadas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Español (por defecto)</h4>
            <ExportButton
              data={basicUsers.slice(0, 2)}
              columns={userColumns}
              filename="espanol"
              language="es"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Inglés</h4>
            <ExportButton
              data={basicUsers.slice(0, 2)}
              columns={userColumns}
              filename="english"
              language="en"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Etiquetas personalizadas</h4>
            <ExportButton
              data={basicUsers.slice(0, 2)}
              columns={userColumns}
              filename="personalizado"
              labels={{
                export: "Exportar Datos",
                exporting: "Procesando...",
                success: "¡Completado!",
                error: "Falló",
                xlsx: "Hoja de Cálculo",
                csv: "Archivo CSV",
                json: "Datos JSON",
              }}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Iconos personalizados</h4>
            <ExportButton
              data={basicUsers.slice(0, 2)}
              columns={userColumns}
              filename="iconos_custom"
              icons={{
                export: "⬇️",
                xlsx: "🟢",
                csv: "🔵",
                json: "🟡",
                loading: "⏳",
                success: "🎉",
                error: "💥",
              }}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
            />
          </div>
        </div>
      </section>

      {/* Información adicional */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          💡 Notas de Implementación
        </h2>
        <ul className="text-blue-800 space-y-2 text-sm">
          <li>
            • Los archivos se generan en el cliente usando librerías como{" "}
            <code>xlsx</code>, <code>pdfmake</code> y <code>exceljs</code>
          </li>
          <li>
            • Los formatos "branded" requieren configuración adicional de
            branding corporativo
          </li>
          <li>
            • Para datasets grandes (&gt;1000 registros), considera mostrar un
            indicador de progreso
          </li>
          <li>
            • Los items personalizados permiten crear acciones de exportación
            completamente customizadas
          </li>
          <li>
            • Todos los callbacks son opcionales y permiten integración con
            sistemas de logging
          </li>
          <li>
            • El componente maneja automáticamente la carga diferida de
            dependencias pesadas
          </li>
        </ul>
      </section>
    </div>
  );
};

export default ExportDemo;
