import React, { useState } from "react";
import ExportButton from "@/components/common/exporter/ExportButton";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import {
  specialTypesData,
  corporateBranding,
  generateComplexMockData,
} from "./mockData";

const AdvancedDemo = () => {
  const [status, setStatus] = useState("");
  const [realTimeData, setRealTimeData] = useState([]);
  const [errorSimulation, setErrorSimulation] = useState(false);
  const [recordCount, setRecordCount] = useState(5); // Nuevo estado para controlar cantidad de registros

  // Estado para configuración interactiva de PDF
  const [pdfConfig, setPdfConfig] = useState({
    // Opciones básicas
    includeHeader: true,
    includeFooter: true,
    includePageNumbers: true,
    watermark: false,
    includeCover: false,
    corporateStyle: true, // Cambiado a true para mostrar ambos botones

    // Formato del documento
    pageSize: "A4",
    pageOrientation: "portrait",

    // Branding corporativo
    orgName: "Mi Empresa S.A.",
    footerText: "Documento generado automáticamente",
    createdBy: "Sistema Demo",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",

    // Opciones avanzadas de watermark
    watermarkText: "CONFIDENCIAL",
    watermarkOpacity: 0.1,

    // Márgenes (top, right, bottom, left)
    customMargins: false,
    pageMargins: [60, 80, 60, 80],

    // Opciones de portada
    coverTitle: "Reporte Interactivo",
    coverSubtitle: "Generado con configuración personalizada",
    coverDescription:
      "Este documento fue creado usando el configurador interactivo de PDF.",
    coverAuthor: "Usuario Demo",
  });

  const handleStatus = (message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  };

  // Actualizar configuración PDF
  const updatePdfConfig = (key, value) => {
    setPdfConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Actualizar márgenes
  const updateMargin = (index, value) => {
    const newMargins = [...pdfConfig.pageMargins];
    newMargins[index] = parseInt(value) || 0;
    setPdfConfig((prev) => ({
      ...prev,
      pageMargins: newMargins,
    }));
  };

  // Generar configuración de exportación
  const generateExportConfig = () => {
    const config = {
      title: pdfConfig.coverTitle,
      subtitle: pdfConfig.coverSubtitle,
      author: pdfConfig.coverAuthor,
      corporateStyle: pdfConfig.corporateStyle,
      pageSize: pdfConfig.pageSize,
      pageOrientation: pdfConfig.pageOrientation,
    };

    // Configurar márgenes
    if (pdfConfig.customMargins) {
      config.pageMargins = pdfConfig.pageMargins;
    }

    // Configurar branding
    config.branding = {
      orgName: pdfConfig.orgName,
      footerText: pdfConfig.footerText,
      createdBy: pdfConfig.createdBy,
      primaryColor: pdfConfig.primaryColor,
      secondaryColor: pdfConfig.secondaryColor,
      watermark: pdfConfig.watermark,
      watermarkText: pdfConfig.watermarkText,
      watermarkOpacity: pdfConfig.watermarkOpacity,
    };

    // Configurar portada
    if (pdfConfig.includeCover) {
      config.includeCover = true;
      config.coverOptions = {
        title: pdfConfig.coverTitle,
        subtitle: pdfConfig.coverSubtitle,
        description: pdfConfig.coverDescription,
        author: pdfConfig.coverAuthor,
      };
    }

    // Configurar header/footer
    config.includeHeader = pdfConfig.includeHeader;
    config.includeFooter = pdfConfig.includeFooter;

    return config;
  };

  // Generar datos en tiempo real
  const generateRealTimeData = () => {
    const newData = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      timestamp: new Date().toISOString(),
      temperature: Math.round((Math.random() * 40 + 10) * 10) / 10,
      humidity: Math.round(Math.random() * 100),
      status: Math.random() > 0.7 ? "alert" : "normal",
    }));

    setRealTimeData((prev) => [...prev, ...newData].slice(-20)); // Mantener solo últimos 20
    handleStatus(`✅ Generados ${newData.length} registros nuevos`);
  };

  // Datos complejos generados dinámicamente según recordCount
  const complexDataDemo = generateComplexMockData(recordCount);

  // Columnas con formatters explícitos (alternativa a dot notation)
  const complexColumnsExplicit = [
    { key: "id", header: "ID" },
    {
      key: "customer",
      header: "Empresa",
      formatter: (customer) => customer?.name || "-",
    },
    {
      key: "customer",
      header: "Email",
      formatter: (customer) => customer?.contact?.email || "-",
    },
    {
      key: "customer",
      header: "Teléfono",
      formatter: (customer) => customer?.contact?.phone || "-",
    },
    {
      key: "customer",
      header: "Ciudad",
      formatter: (customer) => customer?.contact?.address?.city || "-",
    },
    {
      key: "orders",
      header: "Total Órdenes",
      formatter: (orders) => (Array.isArray(orders) ? orders.length : 0),
    },
    {
      key: "orders",
      header: "Monto Total",
      formatter: (orders) => {
        if (!Array.isArray(orders)) return "$0";
        return new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency: "CLP",
        }).format(orders.reduce((sum, order) => sum + (order.amount || 0), 0));
      },
    },
    {
      key: "metadata",
      header: "Etiquetas",
      formatter: (metadata) => {
        const tags = metadata?.tags;
        return Array.isArray(tags) ? tags.join(", ") : "-";
      },
    },
    {
      key: "metadata",
      header: "Score Calidad",
      formatter: (metadata) => {
        const score = metadata?.scores?.quality;
        return typeof score === "number" ? score.toFixed(1) : "N/A";
      },
    },
    {
      key: "metadata",
      header: "Fecha Creación",
      formatter: (metadata) => {
        const date = metadata?.created;
        return date instanceof Date
          ? date.toLocaleDateString("es-CL")
          : String(date || "-");
      },
    },
  ];

  // DEBUG: Verificar que los datos se generan correctamente
  console.log("🔍 DEBUG - complexDataDemo:", {
    recordCount,
    length: complexDataDemo.length,
    firstItem: complexDataDemo[0],
    lastItem: complexDataDemo[complexDataDemo.length - 1],
  });

  // DEBUG: Verificar mapeo de columnas
  console.log("🔍 DEBUG - Column mapping test:", {
    sampleData: complexDataDemo[0],
    columnTests: {
      id: complexDataDemo[0]?.id,
      customerName: complexDataDemo[0]?.customer?.name,
      email: complexDataDemo[0]?.customer?.contact?.email,
      phone: complexDataDemo[0]?.customer?.contact?.phone,
      city: complexDataDemo[0]?.customer?.contact?.address?.city,
      ordersLength: complexDataDemo[0]?.orders?.length,
    },
  });

  // DEBUG: Test de formatters
  console.log("🔍 DEBUG - Formatter test:", {
    firstRow: complexColumnsExplicit.map((col) => ({
      header: col.header,
      key: col.key,
      value: col.formatter
        ? col.formatter(complexDataDemo[0][col.key])
        : complexDataDemo[0][col.key],
    })),
  });

  // Pre-procesar datos para el exportador (aplanar objetos usando formatters)
  const processedDataForExport = complexDataDemo.map((row) => {
    const processedRow = {};
    complexColumnsExplicit.forEach((col) => {
      const value = col.formatter ? col.formatter(row[col.key]) : row[col.key];
      processedRow[col.header] = value;
    });
    return processedRow;
  });

  // Columnas simples para datos pre-procesados
  const simpleColumns = complexColumnsExplicit.map((col) => ({
    key: col.header,
    header: col.header,
  }));

  // DEBUG: Datos procesados
  console.log("🔄 DEBUG - Processed data:", {
    originalFirst: complexDataDemo[0],
    processedFirst: processedDataForExport[0],
    simpleColumns: simpleColumns,
  });

  // Simular error
  const handleErrorExport = async () => {
    if (errorSimulation) {
      handleStatus("⚠️ Simulando error...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      throw new Error("Error simulado para testing");
    }
  };

  // Columnas para datos en tiempo real
  const realTimeColumns = [
    { key: "id", header: "ID" },
    {
      key: "timestamp",
      header: "Fecha",
      formatter: (value) => new Date(value).toLocaleString(),
    },
    { key: "temperature", header: "Temperatura °C" },
    { key: "humidity", header: "Humedad %" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Advanced Demo</h1>
        <p className="text-gray-600">Casos avanzados y edge cases</p>

        {status && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            {status}
          </div>
        )}
      </div>

      {/* NUEVA SECCIÓN: Configuración Interactiva PDF */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">
          🎛️ Configuración Interactiva PDF
        </h2>
        <p className="text-gray-700 text-sm mb-6">
          Configura todas las opciones de PDF disponibles y genera tu documento
          personalizado.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Configuración */}
          <div className="space-y-6">
            {/* Opciones Básicas */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3 text-gray-800">
                Opciones Básicas
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfConfig.includeHeader}
                    onChange={(e) =>
                      updatePdfConfig("includeHeader", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Incluir encabezado</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfConfig.includeFooter}
                    onChange={(e) =>
                      updatePdfConfig("includeFooter", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Incluir pie de página</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfConfig.includePageNumbers}
                    onChange={(e) =>
                      updatePdfConfig("includePageNumbers", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Numeración de páginas</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfConfig.watermark}
                    onChange={(e) =>
                      updatePdfConfig("watermark", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Marca de agua</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfConfig.includeCover}
                    onChange={(e) =>
                      updatePdfConfig("includeCover", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Incluir portada</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pdfConfig.corporateStyle}
                    onChange={(e) =>
                      updatePdfConfig("corporateStyle", e.target.checked)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Estilo corporativo</span>
                </label>
              </div>
            </div>

            {/* Formato del Documento */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3 text-gray-800">
                Formato del Documento
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tamaño de página
                  </label>
                  <select
                    value={pdfConfig.pageSize}
                    onChange={(e) =>
                      updatePdfConfig("pageSize", e.target.value)
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="A4">A4</option>
                    <option value="LETTER">Letter</option>
                    <option value="A3">A3</option>
                    <option value="LEGAL">Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Orientación
                  </label>
                  <select
                    value={pdfConfig.pageOrientation}
                    onChange={(e) =>
                      updatePdfConfig("pageOrientation", e.target.value)
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="portrait">Vertical</option>
                    <option value="landscape">Horizontal</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={pdfConfig.customMargins}
                      onChange={(e) =>
                        updatePdfConfig("customMargins", e.target.checked)
                      }
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      Márgenes personalizados
                    </span>
                  </label>

                  {pdfConfig.customMargins && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">
                          Superior
                        </label>
                        <input
                          type="number"
                          value={pdfConfig.pageMargins[0]}
                          onChange={(e) => updateMargin(0, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          min="20"
                          max="120"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Derecho</label>
                        <input
                          type="number"
                          value={pdfConfig.pageMargins[1]}
                          onChange={(e) => updateMargin(1, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          min="20"
                          max="120"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">
                          Inferior
                        </label>
                        <input
                          type="number"
                          value={pdfConfig.pageMargins[2]}
                          onChange={(e) => updateMargin(2, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          min="20"
                          max="120"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">
                          Izquierdo
                        </label>
                        <input
                          type="number"
                          value={pdfConfig.pageMargins[3]}
                          onChange={(e) => updateMargin(3, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          min="20"
                          max="120"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Branding Corporativo */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3 text-gray-800">
                Branding Corporativo
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre de la organización
                  </label>
                  <input
                    type="text"
                    value={pdfConfig.orgName}
                    onChange={(e) => updatePdfConfig("orgName", e.target.value)}
                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Mi Empresa S.A."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Texto del pie de página
                  </label>
                  <input
                    type="text"
                    value={pdfConfig.footerText}
                    onChange={(e) =>
                      updatePdfConfig("footerText", e.target.value)
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Documento generado automáticamente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Creado por
                  </label>
                  <input
                    type="text"
                    value={pdfConfig.createdBy}
                    onChange={(e) =>
                      updatePdfConfig("createdBy", e.target.value)
                    }
                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Sistema Demo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Color primario
                    </label>
                    <input
                      type="color"
                      value={pdfConfig.primaryColor}
                      onChange={(e) =>
                        updatePdfConfig("primaryColor", e.target.value)
                      }
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Color secundario
                    </label>
                    <input
                      type="color"
                      value={pdfConfig.secondaryColor}
                      onChange={(e) =>
                        updatePdfConfig("secondaryColor", e.target.value)
                      }
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración de Marca de Agua */}
            {pdfConfig.watermark && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3 text-gray-800">
                  Configuración de Marca de Agua
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Texto de marca de agua
                    </label>
                    <input
                      type="text"
                      value={pdfConfig.watermarkText}
                      onChange={(e) =>
                        updatePdfConfig("watermarkText", e.target.value)
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="CONFIDENCIAL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Opacidad ({Math.round(pdfConfig.watermarkOpacity * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.3"
                      step="0.05"
                      value={pdfConfig.watermarkOpacity}
                      onChange={(e) =>
                        updatePdfConfig(
                          "watermarkOpacity",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Configuración de Portada */}
            {pdfConfig.includeCover && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3 text-gray-800">
                  Configuración de Portada
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={pdfConfig.coverTitle}
                      onChange={(e) =>
                        updatePdfConfig("coverTitle", e.target.value)
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Reporte Interactivo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Subtítulo
                    </label>
                    <input
                      type="text"
                      value={pdfConfig.coverSubtitle}
                      onChange={(e) =>
                        updatePdfConfig("coverSubtitle", e.target.value)
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Generado con configuración personalizada"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={pdfConfig.coverDescription}
                      onChange={(e) =>
                        updatePdfConfig("coverDescription", e.target.value)
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm resize-none"
                      rows="2"
                      placeholder="Este documento fue creado usando el configurador interactivo de PDF."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Autor
                    </label>
                    <input
                      type="text"
                      value={pdfConfig.coverAuthor}
                      onChange={(e) =>
                        updatePdfConfig("coverAuthor", e.target.value)
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Usuario Demo"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel de Vista Previa y Exportación */}
          <div className="space-y-4">
            {/* Vista Previa de Configuración */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3 text-gray-800">
                Vista Previa de Configuración
              </h3>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono max-h-96 overflow-y-auto">
                <pre>{JSON.stringify(generateExportConfig(), null, 2)}</pre>
              </div>
            </div>

            {/* Botones de Exportación */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3 text-gray-800">
                Exportar con Configuración
              </h3>

              {/* Control de cantidad de registros */}
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad de registros para prueba
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={recordCount}
                    onChange={(e) => setRecordCount(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={recordCount}
                    onChange={(e) =>
                      setRecordCount(parseInt(e.target.value) || 1)
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                  />
                  <span className="text-sm text-gray-600 min-w-[60px]">
                    {recordCount} reg{recordCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Usa el slider o escribe un número para cambiar la cantidad de
                  registros
                </div>
              </div>

              <div className="space-y-3">
                {/* PDF Simple */}
                <ExportButton
                  data={processedDataForExport}
                  columns={simpleColumns}
                  formats={["pdf"]}
                  filename="pdf_interactivo_simple"
                  title={pdfConfig.coverTitle}
                  subtitle={pdfConfig.coverSubtitle}
                  author={pdfConfig.coverAuthor}
                  corporateStyle={pdfConfig.corporateStyle}
                  pageSize={pdfConfig.pageSize}
                  pageOrientation={pdfConfig.pageOrientation}
                  pageMargins={
                    pdfConfig.customMargins ? pdfConfig.pageMargins : undefined
                  }
                  includeHeader={pdfConfig.includeHeader}
                  includeFooter={pdfConfig.includeFooter}
                  includeCover={pdfConfig.includeCover}
                  coverOptions={
                    pdfConfig.includeCover
                      ? {
                          title: pdfConfig.coverTitle,
                          subtitle: pdfConfig.coverSubtitle,
                          description: pdfConfig.coverDescription,
                          author: pdfConfig.coverAuthor,
                        }
                      : undefined
                  }
                  branding={{
                    orgName: pdfConfig.orgName,
                    footerText: pdfConfig.footerText,
                    createdBy: pdfConfig.createdBy,
                    primaryColor: pdfConfig.primaryColor,
                    secondaryColor: pdfConfig.secondaryColor,
                    watermark: pdfConfig.watermark,
                    watermarkText: pdfConfig.watermarkText,
                    watermarkOpacity: pdfConfig.watermarkOpacity,
                  }}
                  onStart={() =>
                    handleStatus(
                      "Generando PDF con configuración personalizada..."
                    )
                  }
                  onSuccess={() =>
                    handleStatus("✅ PDF personalizado generado exitosamente")
                  }
                  onError={(error) => handleStatus(`❌ Error: ${error}`)}
                />

                {/* PDF Corporativo */}
                {pdfConfig.corporateStyle && (
                  <ExportButton
                    data={processedDataForExport}
                    columns={simpleColumns}
                    formats={["pdf-branded"]}
                    filename="pdf_interactivo_corporativo"
                    title={pdfConfig.coverTitle}
                    subtitle={pdfConfig.coverSubtitle}
                    author={pdfConfig.coverAuthor}
                    corporateStyle={pdfConfig.corporateStyle}
                    pageSize={pdfConfig.pageSize}
                    pageOrientation={pdfConfig.pageOrientation}
                    pageMargins={
                      pdfConfig.customMargins
                        ? pdfConfig.pageMargins
                        : undefined
                    }
                    includeHeader={pdfConfig.includeHeader}
                    includeFooter={pdfConfig.includeFooter}
                    includeCover={pdfConfig.includeCover}
                    coverOptions={
                      pdfConfig.includeCover
                        ? {
                            title: pdfConfig.coverTitle,
                            subtitle: pdfConfig.coverSubtitle,
                            description: pdfConfig.coverDescription,
                            author: pdfConfig.coverAuthor,
                          }
                        : undefined
                    }
                    branding={{
                      orgName: pdfConfig.orgName,
                      footerText: pdfConfig.footerText,
                      createdBy: pdfConfig.createdBy,
                      primaryColor: pdfConfig.primaryColor,
                      secondaryColor: pdfConfig.secondaryColor,
                      watermark: pdfConfig.watermark,
                      watermarkText: pdfConfig.watermarkText,
                      watermarkOpacity: pdfConfig.watermarkOpacity,
                    }}
                    onStart={() =>
                      handleStatus(
                        "Generando PDF corporativo con configuración personalizada..."
                      )
                    }
                    onSuccess={() =>
                      handleStatus(
                        "✅ PDF corporativo personalizado generado exitosamente"
                      )
                    }
                    onError={(error) => handleStatus(`❌ Error: ${error}`)}
                  />
                )}

                {/* Botón de Reset */}
                <button
                  onClick={() =>
                    setPdfConfig({
                      includeHeader: true,
                      includeFooter: true,
                      includePageNumbers: true,
                      watermark: false,
                      includeCover: false,
                      corporateStyle: false,
                      pageSize: "A4",
                      pageOrientation: "portrait",
                      orgName: "Mi Empresa S.A.",
                      footerText: "Documento generado automáticamente",
                      createdBy: "Sistema Demo",
                      primaryColor: "#2563eb",
                      secondaryColor: "#1e40af",
                      watermarkText: "CONFIDENCIAL",
                      watermarkOpacity: 0.1,
                      customMargins: false,
                      pageMargins: [60, 80, 60, 80],
                      coverTitle: "Reporte Interactivo",
                      coverSubtitle: "Generado con configuración personalizada",
                      coverDescription:
                        "Este documento fue creado usando el configurador interactivo de PDF.",
                      coverAuthor: "Usuario Demo",
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  🔄 Restablecer Configuración
                </button>
              </div>
            </div>

            {/* Tips de Uso */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="font-semibold mb-2 text-blue-900">
                💡 Tips de Uso
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Activa "Estilo corporativo" para usar plantillas
                  profesionales
                </li>
                <li>
                  • Los márgenes se miden en puntos (72 puntos = 1 pulgada)
                </li>
                <li>• La marca de agua aparece en todas las páginas</li>
                <li>• La portada se genera automáticamente si está activada</li>
                <li>
                  • Los colores se aplican a encabezados y elementos decorativos
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Datos complejos con objetos anidados */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">
          Datos con objetos anidados
        </h2>
        <p className="text-gray-600 text-sm mb-3">
          Exportación de datos complejos con dot notation para aplanar objetos.
        </p>

        <div className="bg-gray-50 rounded p-3 mb-3">
          <div className="text-xs text-gray-600 mb-2">
            Datos generados: {complexDataDemo.length} registros (configurado:{" "}
            {recordCount})
          </div>

          {/* Test visual de formatters */}
          <div className="mb-3 p-2 bg-white rounded border">
            <div className="text-xs font-semibold text-gray-700 mb-1">
              🧪 Test de Formatters (primer registro):
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {complexColumnsExplicit.slice(0, 5).map((col, idx) => (
                <div key={idx} className="flex">
                  <span className="font-medium text-blue-600 w-20">
                    {col.header}:
                  </span>
                  <span className="text-gray-800">
                    {col.formatter
                      ? col.formatter(complexDataDemo[0][col.key])
                      : complexDataDemo[0][col.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(complexDataDemo[0], null, 2)}
          </pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ExportButton
            data={processedDataForExport}
            columns={simpleColumns}
            formats={["xlsx", "csv"]}
            filename="datos_complejos"
            onStart={() => {
              console.log("🚀 EXPORT DEBUG - Datos pre-procesados enviados:", {
                dataLength: processedDataForExport.length,
                columnsLength: simpleColumns.length,
                firstProcessedRow: processedDataForExport[0],
                columnsUsed: simpleColumns,
              });
              handleStatus("Exportando datos pre-procesados...");
            }}
            onSuccess={() => handleStatus("✅ Datos complejos exportados")}
            onError={(error) => handleStatus(`❌ Error: ${error}`)}
          />
          <ExportButton
            data={complexDataDemo}
            columns={[]} // Sin columnas = exportar todo
            formats={["json"]}
            filename="datos_completos"
            onStart={() => handleStatus("Exportando estructura completa...")}
            onSuccess={() => handleStatus("✅ Estructura completa exportada")}
            onError={(error) => handleStatus(`❌ Error: ${error}`)}
          />
          <button
            onClick={() => {
              console.log("🔬 MANUAL TEST - Data processing:", {
                totalRecords: complexDataDemo.length,
                sampleProcessing: complexDataDemo.slice(0, 2).map((row) =>
                  complexColumnsExplicit.reduce((acc, col) => {
                    acc[col.header] = col.formatter
                      ? col.formatter(row[col.key])
                      : row[col.key];
                    return acc;
                  }, {})
                ),
              });
              handleStatus("📋 Revisar consola para test manual");
            }}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
          >
            🔬 Test Manual
          </button>
        </div>
      </section>

      {/* 2. Tipos de datos especiales */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">
          Tipos de datos especiales
        </h2>
        <p className="text-gray-600 text-sm mb-3">
          Manejo de null, undefined, objetos, arrays y caracteres especiales.
        </p>

        <ExportButton
          data={specialTypesData}
          formats={["csv", "json", "xlsx"]}
          filename="tipos_especiales"
          onStart={() => handleStatus("Exportando tipos especiales...")}
          onSuccess={() => handleStatus("✅ Tipos especiales exportados")}
          onError={(error) => handleStatus(`❌ Error: ${error}`)}
        />
      </section>

      {/* 3. Datos en tiempo real */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Datos en tiempo real</h2>
        <p className="text-gray-600 text-sm mb-3">
          Generación y exportación de datos dinámicos con timestamps.
        </p>

        <div className="flex gap-3 mb-3">
          <button
            onClick={generateRealTimeData}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Generar Datos
          </button>
          <button
            onClick={() => setRealTimeData([])}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Limpiar
          </button>
        </div>

        {realTimeData.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-2">
              Registros generados: {realTimeData.length}
            </p>
            <ExportButton
              data={realTimeData}
              columns={realTimeColumns}
              formats={["csv", "xlsx"]}
              filename={`tiempo_real_${new Date().toISOString().split("T")[0]}`}
              onStart={() => handleStatus("Exportando datos en tiempo real...")}
              onSuccess={() =>
                handleStatus("✅ Datos en tiempo real exportados")
              }
              onError={(error) => handleStatus(`❌ Error: ${error}`)}
            />
          </div>
        )}
      </section>

      {/* 4. Simulación de errores */}
      <section className="bg-red-50 rounded-lg border border-red-200 p-4">
        <h2 className="text-lg font-semibold mb-3">Simulación de errores</h2>
        <p className="text-gray-600 text-sm mb-3">
          Testing de manejo de errores en exportación y descarga.
        </p>

        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={errorSimulation}
              onChange={(e) => setErrorSimulation(e.target.checked)}
              className="rounded"
            />
            Activar simulación de errores
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ExportButton
            data={complexDataDemo}
            formats={["csv"]}
            filename="test_error"
            onStart={() => errorSimulation && handleErrorExport()}
            onSuccess={() => handleStatus("✅ Exportación exitosa")}
            onError={(error) =>
              handleStatus(`❌ Error capturado: ${error.message}`)
            }
          />
          <DownloadButton
            url="https://httpstat.us/404"
            filename="test_404.txt"
            retries={1}
            onStart={() => handleStatus("Probando descarga que fallará...")}
            onSuccess={() =>
              handleStatus("✅ Descarga inesperadamente exitosa")
            }
            onError={(error) =>
              handleStatus(`❌ Error esperado: ${error.message}`)
            }
          />
        </div>
      </section>

      {/* 5. Configuraciones extremas */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Configuraciones extremas</h2>
        <p className="text-gray-600 text-sm mb-3">
          Testing con configuraciones de branding y formatos múltiples.
        </p>

        <ExportButton
          data={complexDataDemo.slice(0, 3)} // Solo pocos datos para testing
          columns={complexColumnsExplicit}
          formats={["xlsx-branded", "pdf-branded"]}
          branding={{
            ...corporateBranding,
            primaryColor: "#ff6b35",
            watermark: true,
            pageNumbers: true,
          }}
          filename="configuracion_extrema"
          onStart={() => handleStatus("Aplicando configuración extrema...")}
          onSuccess={() => handleStatus("✅ Configuración extrema aplicada")}
          onError={(error) => handleStatus(`❌ Error: ${error}`)}
        />
      </section>
    </div>
  );
};

export default AdvancedDemo;
