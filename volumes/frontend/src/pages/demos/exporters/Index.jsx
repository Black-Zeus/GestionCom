import React, { useState } from "react";
import ExportDemo from "./ExportDemo";
import DownloadDemo from "./DownloadDemo";
import AdvancedDemo from "./AdvancedDemo";
import PerformanceDemo from "./PerformanceDemo";

const DemoIndex = () => {
  const [activeDemo, setActiveDemo] = useState("export");

  const demos = [
    {
      id: "export",
      title: "ExportButton",
      description: "Ejemplos básicos de exportación en múltiples formatos",
      icon: "📊",
      component: ExportDemo,
      color: "blue",
    },
    {
      id: "download",
      title: "DownloadButton",
      description: "Descarga de archivos remotos con progreso y reintentos",
      icon: "⬇️",
      component: DownloadDemo,
      color: "green",
    },
    {
      id: "advanced",
      title: "Casos Avanzados",
      description: "Datos complejos, transformaciones y casos edge",
      icon: "⚡",
      component: AdvancedDemo,
      color: "purple",
    },
    {
      id: "performance",
      title: "Rendimiento",
      description: "Pruebas de escalabilidad y optimización",
      icon: "🚀",
      component: PerformanceDemo,
      color: "orange",
    },
  ];

  const currentDemo = demos.find((demo) => demo.id === activeDemo);
  const CurrentComponent = currentDemo?.component;

  const getColorClasses = (color, isActive = false) => {
    const colors = {
      blue: {
        bg: isActive ? "bg-blue-600" : "bg-blue-50 hover:bg-blue-100",
        text: isActive ? "text-white" : "text-blue-700",
        border: "border-blue-200",
      },
      green: {
        bg: isActive ? "bg-green-600" : "bg-green-50 hover:bg-green-100",
        text: isActive ? "text-white" : "text-green-700",
        border: "border-green-200",
      },
      purple: {
        bg: isActive ? "bg-purple-600" : "bg-purple-50 hover:bg-purple-100",
        text: isActive ? "text-white" : "text-purple-700",
        border: "border-purple-200",
      },
      orange: {
        bg: isActive ? "bg-orange-600" : "bg-orange-50 hover:bg-orange-100",
        text: isActive ? "text-white" : "text-orange-700",
        border: "border-orange-200",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema de Exportación y Descarga
              </h1>
              <p className="text-gray-600 mt-1">
                Demos interactivas de los componentes ExportButton y
                DownloadButton
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-0 overflow-x-auto">
            {demos.map((demo) => {
              const isActive = activeDemo === demo.id;
              const colorClasses = getColorClasses(demo.color, isActive);

              return (
                <button
                  key={demo.id}
                  onClick={() => setActiveDemo(demo.id)}
                  className={`
                    flex-shrink-0 px-6 py-4 text-sm font-medium transition-all duration-200
                    border-b-2 ${
                      isActive
                        ? `border-${demo.color}-600`
                        : "border-transparent"
                    }
                    ${
                      isActive
                        ? colorClasses.text
                        : "text-gray-600 hover:text-gray-900"
                    }
                    ${isActive ? "bg-gray-50" : "hover:bg-gray-50"}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{demo.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{demo.title}</div>
                      <div className="text-xs opacity-75 hidden sm:block">
                        {demo.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Demo Content */}
      <main className="flex-1">{CurrentComponent && <CurrentComponent />}</main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Características
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Múltiples formatos de exportación</li>
                <li>✅ Descarga con progreso y reintentos</li>
                <li>✅ Manejo de errores robusto</li>
                <li>✅ Branding corporativo</li>
                <li>✅ TypeScript support</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Formatos Soportados
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>📊 Excel (.xlsx) - Simple y corporativo</li>
                <li>📄 CSV - Con configuración avanzada</li>
                <li>🔧 JSON - Con proyección de columnas</li>
                <li>📋 PDF - Simple y con branding</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Tecnologías</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>⚛️ React 18+ con Hooks</li>
                <li>📦 Carga diferida de dependencias</li>
                <li>🎨 Tailwind CSS para estilos</li>
                <li>🔧 ExcelJS, xlsx, pdfmake</li>
                <li>🌐 File API y Fetch API</li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-500">
            <p>
              Sistema de Exportación v1.0.0 - Creado con ❤️ para desarrollo
              empresarial
            </p>
            <p className="mt-2">
              📖 Documentación disponible en el repositorio • 🐛 Reporta issues
              en GitHub • 💡 Contribuciones bienvenidas
            </p>
          </div>
        </div>
      </footer>

      {/* Development Mode Indicator */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-4 left-4 z-50">
          <div className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-medium">
            DEV MODE
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoIndex;
