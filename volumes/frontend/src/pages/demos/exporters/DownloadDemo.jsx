import React, { useState } from "react";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import { downloadUrls } from "./mockData";

const DownloadDemo = () => {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  const handleDownloadStart = (filename) => {
    setStatus(`Descargando ${filename}...`);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
  };

  const handleDownloadSuccess = (result, filename) => {
    setStatus(`✅ ${filename} descargado`);
    setTimeout(() => setStatus(""), 3000);
  };

  const handleDownloadError = (error, filename) => {
    setStatus(`❌ Error en ${filename}: ${error.message}`);
    setTimeout(() => setStatus(""), 3000);
  };

  const handleProgress = (loaded, total, percentage) => {
    setProgress({ loaded, total, percentage });
  };

  // Generar contenido dinámico
  const generateDataUrl = (type) => {
    const timestamp = new Date().toLocaleString();

    switch (type) {
      case "json":
        const jsonData = {
          timestamp,
          data: ["item1", "item2", "item3"],
          generated: true,
        };
        return `data:application/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(jsonData, null, 2)
        )}`;

      case "csv":
        const csvData = `Nombre,Edad,Ciudad\nJuan,25,Madrid\nMaria,30,Barcelona\nPedro,28,Valencia`;
        return `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;

      case "text":
        const textData = `Reporte generado\n=================\nFecha: ${timestamp}\n\nContenido de ejemplo para testing.`;
        return `data:text/plain;charset=utf-8,${encodeURIComponent(textData)}`;

      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">DownloadButton Demo</h1>
        <p className="text-gray-600">
          Ejemplos básicos de descarga de archivos
        </p>

        {status && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            {status}
          </div>
        )}

        {progress.total > 0 && (
          <div className="mt-3 max-w-md mx-auto">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {progress.percentage.toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {/* 1. Archivos básicos */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Archivos básicos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DownloadButton
            url="/demos/exporters/data1.pdf"
            filename="documento.pdf"
            onStart={() => handleDownloadStart("documento.pdf")}
            onSuccess={(result) =>
              handleDownloadSuccess(result, "documento.pdf")
            }
            onError={(error) => handleDownloadError(error, "documento.pdf")}
            onProgress={handleProgress}
          />
          <DownloadButton
            url={downloadUrls.image}
            filename="imagen.jpg"
            onStart={() => handleDownloadStart("imagen.jpg")}
            onSuccess={(result) => handleDownloadSuccess(result, "imagen.jpg")}
            onError={(error) => handleDownloadError(error, "imagen.jpg")}
          />
          <DownloadButton
            url={downloadUrls.json}
            filename="datos.json"
            onStart={() => handleDownloadStart("datos.json")}
            onSuccess={(result) => handleDownloadSuccess(result, "datos.json")}
            onError={(error) => handleDownloadError(error, "datos.json")}
          />
          <DownloadButton
            url={downloadUrls.csv}
            filename="tabla.csv"
            onStart={() => handleDownloadStart("tabla.csv")}
            onSuccess={(result) => handleDownloadSuccess(result, "tabla.csv")}
            onError={(error) => handleDownloadError(error, "tabla.csv")}
          />
        </div>
      </section>

      {/* 2. Con progreso */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">
          Con indicador de progreso
        </h2>
        <DownloadButton
          url={downloadUrls.largeFile}
          filename="archivo_grande.zip"
          showProgress={true}
          onStart={() => handleDownloadStart("archivo_grande.zip")}
          onSuccess={(result) =>
            handleDownloadSuccess(result, "archivo_grande.zip")
          }
          onError={(error) => handleDownloadError(error, "archivo_grande.zip")}
          onProgress={handleProgress}
        />
      </section>

      {/* 3. Variantes visuales */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Variantes visuales</h2>
        <div className="flex flex-wrap gap-3">
          <DownloadButton
            url={generateDataUrl("text")}
            filename="solid.txt"
            variant="solid"
            onStart={() => handleDownloadStart("solid.txt")}
            onSuccess={(result) => handleDownloadSuccess(result, "solid.txt")}
            onError={(error) => handleDownloadError(error, "solid.txt")}
          />
          <DownloadButton
            url={generateDataUrl("text")}
            filename="outline.txt"
            variant="outline"
            onStart={() => handleDownloadStart("outline.txt")}
            onSuccess={(result) => handleDownloadSuccess(result, "outline.txt")}
            onError={(error) => handleDownloadError(error, "outline.txt")}
          />
          <DownloadButton
            url={generateDataUrl("text")}
            filename="ghost.txt"
            variant="ghost"
            onStart={() => handleDownloadStart("ghost.txt")}
            onSuccess={(result) => handleDownloadSuccess(result, "ghost.txt")}
            onError={(error) => handleDownloadError(error, "ghost.txt")}
          />
        </div>
      </section>

      {/* 4. Contenido dinámico */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">
          Contenido generado dinámicamente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DownloadButton
            url={generateDataUrl("json")}
            filename="datos_dinamicos.json"
            onStart={() => handleDownloadStart("datos_dinamicos.json")}
            onSuccess={(result) =>
              handleDownloadSuccess(result, "datos_dinamicos.json")
            }
            onError={(error) =>
              handleDownloadError(error, "datos_dinamicos.json")
            }
          />
          <DownloadButton
            url={generateDataUrl("csv")}
            filename="tabla_dinamica.csv"
            onStart={() => handleDownloadStart("tabla_dinamica.csv")}
            onSuccess={(result) =>
              handleDownloadSuccess(result, "tabla_dinamica.csv")
            }
            onError={(error) =>
              handleDownloadError(error, "tabla_dinamica.csv")
            }
          />
          <DownloadButton
            url={generateDataUrl("text")}
            filename="reporte_dinamico.txt"
            onStart={() => handleDownloadStart("reporte_dinamico.txt")}
            onSuccess={(result) =>
              handleDownloadSuccess(result, "reporte_dinamico.txt")
            }
            onError={(error) =>
              handleDownloadError(error, "reporte_dinamico.txt")
            }
          />
        </div>
      </section>

      {/* 5. Con reintentos */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">
          Con reintentos (URL que puede fallar)
        </h2>
        <DownloadButton
          url="https://httpstat.us/500"
          filename="test_error.txt"
          retries={2}
          retryDelay={1000}
          onStart={() => handleDownloadStart("test_error.txt")}
          onSuccess={(result) =>
            handleDownloadSuccess(result, "test_error.txt")
          }
          onError={(error) => handleDownloadError(error, "test_error.txt")}
        />
      </section>
    </div>
  );
};

export default DownloadDemo;
