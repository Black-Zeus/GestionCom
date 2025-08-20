import React, { useState, useEffect, useCallback } from "react";
import ExportDemo from "./ExportDemo";
import DownloadDemo from "./DownloadDemo";
import AdvancedDemo from "./AdvancedDemo";
import PerformanceDemo from "./PerformanceDemo";

const DemoIndex = () => {
  const [activeDemo, setActiveDemo] = useState("export");
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [stats, setStats] = useState({
    totalSessions: 0,
    currentSession: 0,
    favoriteDemo: "export",
  });

  // Iconos para mejor UX
  const ICONS = {
    export: "📊",
    download: "⬇️",
    advanced: "⚡",
    performance: "🚀",
    info: "ℹ️",
    star: "⭐",
    time: "⏰",
    users: "👥",
    code: "💻",
    docs: "📖",
    github: "📦",
    check: "✅",
    arrow: "→",
    home: "🏠",
  };

  // Configuración de demos con metadatos extendidos
  const demos = [
    {
      id: "export",
      title: "ExportButton",
      description: "Exportación completa en TODOS los formatos disponibles",
      longDescription:
        "Demostración exhaustiva del componente ExportButton con todos los formatos soportados, configuraciones dinámicas, y casos de uso empresariales.",
      icon: ICONS.export,
      component: ExportDemo,
      color: "blue",
      difficulty: "Básico",
      estimatedTime: "5-10 min",
      features: [
        "Todos los formatos (CSV, JSON, XLSX, PDF)",
        "Estados deshabilitados dinámicos",
        "Branding corporativo",
        "Cabeceras automáticas del config.js",
        "Items personalizados del menú",
      ],
      tags: ["básico", "formatos", "branding"],
    },
    {
      id: "download",
      title: "DownloadButton",
      description: "Descarga avanzada con TODOS los tipos de archivo",
      longDescription:
        "Componente DownloadButton con soporte completo para todos los tipos de archivo, headers personalizados, métricas en tiempo real y manejo robusto de errores.",
      icon: ICONS.download,
      component: DownloadDemo,
      color: "green",
      difficulty: "Intermedio",
      estimatedTime: "8-12 min",
      features: [
        "Todos los tipos de archivo soportados",
        "Headers del config.js automáticos",
        "Progreso con velocidad en tiempo real",
        "Historial de descargas con métricas",
        "Testing exhaustivo de errores",
      ],
      tags: ["archivos", "progreso", "errores"],
    },
    {
      id: "advanced",
      title: "Casos Avanzados",
      description: "Edge cases, datos complejos y configuraciones extremas",
      longDescription:
        "Casos complejos y edge cases del sistema: objetos anidados, datos en tiempo real, simulación de errores, y configuraciones extremas para testing completo.",
      icon: ICONS.advanced,
      component: AdvancedDemo,
      color: "purple",
      difficulty: "Avanzado",
      estimatedTime: "10-15 min",
      features: [
        "Objetos anidados con dot notation",
        "Datos en tiempo real generados",
        "Simulación controlada de errores",
        "Tipos de datos especiales",
        "Configuraciones extremas",
      ],
      tags: ["complejos", "tiempo-real", "testing"],
    },
    {
      id: "performance",
      title: "Rendimiento",
      description: "Tests de escalabilidad y optimización del sistema",
      longDescription:
        "Pruebas exhaustivas de rendimiento y escalabilidad: datasets grandes, comparación de formatos, tests de concurrencia, y técnicas de optimización.",
      icon: ICONS.performance,
      component: PerformanceDemo,
      color: "orange",
      difficulty: "Experto",
      estimatedTime: "15-20 min",
      features: [
        "Datasets de hasta 25,000 registros",
        "Comparación de rendimiento entre formatos",
        "Tests de concurrencia múltiple",
        "Métricas de tiempo y memoria",
        "Técnicas de optimización",
      ],
      tags: ["performance", "escalabilidad", "métricas"],
    },
  ];

  // Obtener demo actual
  const currentDemo = demos.find((demo) => demo.id === activeDemo);
  const CurrentComponent = currentDemo?.component;

  // Manejar cambio de demo
  const handleDemoChange = useCallback(
    (demoId) => {
      if (demoId === activeDemo) return;

      setIsLoading(true);
      setActiveDemo(demoId);
      setLastActivity(Date.now());

      // Simular loading para UX
      setTimeout(() => setIsLoading(false), 300);

      // Actualizar estadísticas
      setStats((prev) => ({
        ...prev,
        currentSession: prev.currentSession + 1,
        favoriteDemo: demoId, // Simplificado para demo
      }));
    },
    [activeDemo]
  );

  // Obtener clases de color dinámicas
  const getColorClasses = useCallback(
    (color, isActive = false, variant = "bg") => {
      const colorMap = {
        blue: {
          bg: isActive ? "bg-blue-600" : "bg-blue-50 hover:bg-blue-100",
          text: isActive ? "text-white" : "text-blue-700",
          border: "border-blue-200",
          accent: "bg-blue-500",
          gradient: "from-blue-500 to-blue-600",
        },
        green: {
          bg: isActive ? "bg-green-600" : "bg-green-50 hover:bg-green-100",
          text: isActive ? "text-white" : "text-green-700",
          border: "border-green-200",
          accent: "bg-green-500",
          gradient: "from-green-500 to-green-600",
        },
        purple: {
          bg: isActive ? "bg-purple-600" : "bg-purple-50 hover:bg-purple-100",
          text: isActive ? "text-white" : "text-purple-700",
          border: "border-purple-200",
          accent: "bg-purple-500",
          gradient: "from-purple-500 to-purple-600",
        },
        orange: {
          bg: isActive ? "bg-orange-600" : "bg-orange-50 hover:bg-orange-100",
          text: isActive ? "text-white" : "text-orange-700",
          border: "border-orange-200",
          accent: "bg-orange-500",
          gradient: "from-orange-500 to-orange-600",
        },
      };

      return colorMap[color] || colorMap.blue;
    },
    []
  );

  // Efecto para actualizar estadísticas de sesión
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header Principal Mejorado */}
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <span className="text-4xl">{ICONS.code}</span>
                Demos de Exportación y Descarga
              </h1>
              <p className="text-slate-300 text-lg">
                Sistema completo de exportación e importación con todas las
                funcionalidades
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación de Tabs Mejorada */}
      <nav className="bg-white border-b border-gray-200 sticky top-[116px] z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex overflow-x-auto gap-1 py-1">
            {demos.map((demo) => {
              const isActive = demo.id === activeDemo;
              const colors = getColorClasses(demo.color, isActive);

              return (
                <button
                  key={demo.id}
                  onClick={() => handleDemoChange(demo.id)}
                  className={`
                    flex items-center gap-3 px-6 py-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap
                    ${colors.bg} ${colors.text} ${colors.border}
                    ${
                      isActive
                        ? "border-2 shadow-lg transform scale-105"
                        : "border hover:shadow-md"
                    }
                    ${isLoading && !isActive ? "opacity-50" : ""}
                  `}
                  disabled={isLoading}
                >
                  <span className="text-xl">{demo.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold">{demo.title}</div>
                    <div
                      className={`text-xs ${
                        isActive ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {demo.difficulty} • {demo.estimatedTime}
                    </div>
                  </div>
                  {isActive && (
                    <div className="ml-2">
                      <div
                        className={`w-2 h-2 rounded-full ${colors.accent} animate-pulse`}
                      ></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Panel de Información de la Demo Actual */}
      {currentDemo && (
        <section className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Información principal */}
              <div className="lg:col-span-2">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${
                      getColorClasses(currentDemo.color).gradient
                    } text-white shadow-lg`}
                  >
                    <span className="text-2xl">{currentDemo.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {currentDemo.title}
                    </h2>
                    <p className="text-gray-600 mb-3">
                      {currentDemo.longDescription}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {currentDemo.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Características destacadas */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>{ICONS.star}</span>
                  Características principales:
                </h3>
                <ul className="space-y-2">
                  {currentDemo.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">
                        {ICONS.check}
                      </span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      Dificultad: <strong>{currentDemo.difficulty}</strong>
                    </span>
                    <span>
                      Tiempo: <strong>{currentDemo.estimatedTime}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contenido de la Demo */}
      <main className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando demo...</p>
            </div>
          </div>
        ) : (
          CurrentComponent && <CurrentComponent />
        )}
      </main>

      {/* Footer Informativo Mejorado */}
      <footer className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Información del Sistema */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>{ICONS.info}</span>
                Sistema de Exportación
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Versión: 1.0.0</li>
                <li>• Última actualización: Dec 2024</li>
                <li>• Formatos soportados: 8+</li>
                <li>• Componentes: ExportButton + DownloadButton</li>
                <li>• Estado: Producción estable</li>
              </ul>
            </div>

            {/* Tecnologías Utilizadas */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>{ICONS.code}</span>
                Stack Tecnológico
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• React 18 con Hooks</li>
                <li>• Tailwind CSS para estilos</li>
                <li>• ExcelJS, xlsx, pdfmake</li>
                <li>• File API y Fetch API</li>
                <li>• Carga diferida de dependencias</li>
              </ul>
            </div>

            {/* Casos de Uso */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>{ICONS.users}</span>
                Casos de Uso
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Reportes empresariales</li>
                <li>• Exportación de datos masivos</li>
                <li>• Dashboards ejecutivos</li>
                <li>• Sistemas de inventario</li>
                <li>• Análisis de datos</li>
              </ul>
            </div>

            {/* Estadísticas en Vivo */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>{ICONS.time}</span>
                Estadísticas de Sesión
              </h3>
              <div className="space-y-3">
                <div className="bg-slate-600 rounded-lg p-3">
                  <div className="text-xs text-slate-400">
                    Demos visitadas esta sesión
                  </div>
                  <div className="text-xl font-bold">
                    {stats.currentSession}
                  </div>
                </div>
                <div className="bg-slate-600 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Demo actual</div>
                  <div className="text-sm font-medium">
                    {currentDemo?.title}
                  </div>
                </div>
                <div className="bg-slate-600 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Tiempo en página</div>
                  <div className="text-sm font-medium">
                    {Math.floor((Date.now() - lastActivity) / 1000 / 60)}m{" "}
                    {Math.floor(((Date.now() - lastActivity) / 1000) % 60)}s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navegación rápida */}
          <div className="border-t border-slate-600 mt-8 pt-8">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>{ICONS.arrow}</span>
              Navegación Rápida
            </h3>
            <div className="flex flex-wrap gap-3">
              {demos.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => handleDemoChange(demo.id)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      demo.id === activeDemo
                        ? "bg-white text-slate-800"
                        : "bg-slate-600 text-white hover:bg-slate-500"
                    }
                  `}
                >
                  <span className="mr-2">{demo.icon}</span>
                  {demo.title}
                </button>
              ))}
            </div>
          </div>

          {/* Links adicionales */}
          <div className="border-t border-slate-600 mt-8 pt-8 text-center text-sm text-slate-400">
            <p className="mb-4">
              Sistema de Exportación v1.0.0 - Creado para desarrollo empresarial
              de alta calidad
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <span className="flex items-center gap-2">
                <span>{ICONS.docs}</span>
                Documentación completa en README
              </span>
              <span className="flex items-center gap-2">
                <span>{ICONS.github}</span>
                Código fuente disponible
              </span>
              <span className="flex items-center gap-2">
                <span>{ICONS.check}</span>
                Testing exhaustivo incluido
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoIndex;
