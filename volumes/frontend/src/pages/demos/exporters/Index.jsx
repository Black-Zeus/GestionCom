import React, { useState } from "react";
import ExportDemo from "./ExportDemo";
import DownloadDemo from "./DownloadDemo";
import AdvancedDemo from "./AdvancedDemo";
import PerformanceDemo from "./PerformanceDemo";

const DemoIndex = () => {
  const [activeDemo, setActiveDemo] = useState("export");

  // Configuración simple de demos
  const demos = [
    {
      id: "export",
      title: "Export",
      icon: "📊",
      component: ExportDemo,
    },
    {
      id: "download",
      title: "Download",
      icon: "⬇️",
      component: DownloadDemo,
    },
    {
      id: "advanced",
      title: "Advanced",
      icon: "⚡",
      component: AdvancedDemo,
    },
    {
      id: "performance",
      title: "Performance",
      icon: "🚀",
      component: PerformanceDemo,
    },
  ];

  const currentDemo = demos.find((demo) => demo.id === activeDemo);
  const CurrentComponent = currentDemo?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Export & Download Demos
        </h1>
        <p className="text-gray-600 mt-1">
          Ejemplos de uso personal para componentes de exportación y descarga
        </p>
      </header>

      {/* Navegación por pestañas */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => setActiveDemo(demo.id)}
              className={`
                py-4 px-2 border-b-2 font-medium text-sm transition-colors
                ${
                  demo.id === activeDemo
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <span className="mr-2">{demo.icon}</span>
              {demo.title}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenido de la demo */}
      <main className="p-6">{CurrentComponent && <CurrentComponent />}</main>

      {/* Footer minimalista */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 mt-12">
        <div className="text-center text-sm text-gray-500">
          <p>Demos personales de componentes Export & Download</p>
        </div>
      </footer>
    </div>
  );
};

export default DemoIndex;
