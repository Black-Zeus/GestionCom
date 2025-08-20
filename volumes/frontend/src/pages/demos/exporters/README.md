# Sistema de Exportación y Descarga - Demos

Este directorio contiene demos interactivas para los componentes `ExportButton` y `DownloadButton`, mostrando todas las funcionalidades disponibles y casos de uso comunes.

## 📁 Estructura de Archivos

```
@pages/demos/exporters/
├── index.jsx           # Página principal con navegación entre demos
├── mockData.js         # Datos de prueba y utilidades
├── ExportDemo.jsx      # Demo básico de ExportButton
├── DownloadDemo.jsx    # Demo básico de DownloadButton
├── AdvancedDemo.jsx    # Casos avanzados y edge cases
├── PerformanceDemo.jsx # Pruebas de rendimiento y optimización
├── data1.pdf          # Archivo PDF de prueba para descargas
└── README.md          # Esta documentación
```

## 🚀 Inicio Rápido

1. **Navega a la página de demos:**

   ```jsx
   import DemoIndex from "@/pages/demos/exporters";
   ```

2. **O usa componentes individuales:**
   ```jsx
   import ExportDemo from "@/pages/demos/exporters/ExportDemo";
   import DownloadDemo from "@/pages/demos/exporters/DownloadDemo";
   ```

## 📊 Demos Disponibles

### 1. ExportDemo - Exportación Básica

- **Archivo:** `ExportDemo.jsx`
- **Funcionalidades:**
  - Exportación en múltiples formatos (XLSX, CSV, JSON, PDF)
  - Branding corporativo
  - Múltiples datasets
  - Datasets grandes (testing de rendimiento)
  - Configuraciones avanzadas de UI
  - Items personalizados en el menú
  - Configuración de idiomas

**Ejemplos destacados:**

```jsx
// Exportación básica
<ExportButton
  data={usuarios}
  columns={columnas}
  formats={['xlsx', 'csv', 'json']}
  onSuccess={(blob) => console.log('Exportado:', blob.size)}
/>

// Con branding corporativo
<ExportButton
  data={ventas}
  columns={columnasVentas}
  formats={['xlsx-branded', 'pdf-branded']}
  branding={brandingCorporativo}
/>
```

### 2. DownloadDemo - Descarga de Archivos

- **Archivo:** `DownloadDemo.jsx`
- **Funcionalidades:**
  - Descarga de archivos remotos
  - Indicadores de progreso
  - Manejo de errores y reintentos
  - Headers personalizados
  - Diferentes tamaños y variantes
  - Data URLs para contenido generado

**Ejemplos destacados:**

```jsx
// Descarga básica
<DownloadButton
  url="/archivo.pdf"
  filename="documento.pdf"
  onProgress={(loaded, total, percentage) =>
    console.log(`${percentage}% completado`)
  }
/>

// Con reintentos y timeout
<DownloadButton
  url="https://api.ejemplo.com/archivo"
  retries={3}
  timeout={30000}
  showProgress={true}
/>
```

### 3. AdvancedDemo - Casos Avanzados

- **Archivo:** `AdvancedDemo.jsx`
- **Funcionalidades:**
  - Datos con objetos anidados
  - Tipos de datos especiales (null, undefined, objetos, arrays)
  - Datos en tiempo real
  - Transformaciones con formatters
  - Simulación de errores
  - Configuraciones extremas

**Casos especiales:**

```jsx
// Datos complejos con aplanado
<ExportButton
  data={datosComplejos}
  columns={[
    { key: "customer.name", header: "Empresa" },
    { key: "customer.contact.email", header: "Email" },
    {
      key: "orders",
      header: "Total Órdenes",
      formatter: (orders) => orders?.length || 0
    }
  ]}
/>

// Datos en tiempo real
<ExportButton
  data={datosEnTiempoReal}
  filename={`reporte_${new Date().toISOString().split('T')[0]}`}
  onSuccess={() => setStatus('Datos dinámicos exportados')}
/>
```

### 4. PerformanceDemo - Rendimiento

- **Archivo:** `PerformanceDemo.jsx`
- **Funcionalidades:**
  - Tests de escalabilidad (100 a 25,000 registros)
  - Comparación entre formatos
  - Tests de concurrencia
  - Descarga de archivos grandes
  - Métricas de tiempo y memoria
  - Técnicas de optimización

**Métricas disponibles:**

- Tiempo de procesamiento
- Uso de memoria (cuando está disponible)
- Tamaño de archivo resultante
- Velocidad de descarga
- Comparación entre técnicas

## 🗃️ Datos de Prueba (mockData.js)

El archivo `mockData.js` contiene diversos conjuntos de datos para testing:

### Datasets Básicos

```javascript
import {
  basicUsers, // 5 usuarios con datos completos
  userColumns, // Definición de columnas con formatters
  salesData, // Datos de ventas mensuales
  inventoryData, // Datos de inventario con estados
  complexData, // Objetos anidados complejos
} from "./mockData";
```

### Configuración Corporativa

```javascript
import { corporateBranding } from "./mockData";

// Incluye:
// - orgName, createdBy, footerText
// - primaryColor, secondaryColor, textColor
// - watermark, pageNumbers, logoPosition
```

### Generadores Dinámicos

```javascript
import {
  generateLargeDataset, // Genera N registros aleatorios
  dataGenerators, // Funciones para datos aleatorios
  simulateDelay, // Simula delays para testing
} from "./mockData";

// Ejemplo: dataset de 10,000 registros
const largeData = generateLargeDataset(10000);
```

### URLs de Prueba

```javascript
import { downloadUrls } from "./mockData";

// Incluye URLs para:
// - Archivo PDF local
// - Imágenes remotas
// - APIs JSON
// - Archivos de diferentes tamaños
// - Data URLs embebidos
```

## ⚡ Funcionalidades Destacadas

### Manejo de Estados

Todos los demos implementan un manejo consistente de estados:

```jsx
const handleExportStart = () => setStatus("🚀 Iniciando...");
const handleExportSuccess = (result) =>
  setStatus(`✅ Completado: ${result.size} bytes`);
const handleExportError = (error) => setStatus(`❌ Error: ${error}`);
```

### Formatters Personalizados

Ejemplos de transformación de datos:

```jsx
const columns = [
  {
    key: "salary",
    header: "Salario",
    formatter: (value) =>
      new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(value),
  },
  {
    key: "startDate",
    header: "Fecha de Inicio",
    formatter: (value) => value.toLocaleDateString("es-ES"),
  },
];
```

### Items Personalizados del Menú

```jsx
const items = [
  // Items builtin
  { type: "builtin", format: "xlsx", label: "Excel Personalizado" },

  // Items custom
  {
    type: "custom",
    key: "email-list",
    label: "Lista de Emails",
    onClick: async (item, context) => {
      const emails = context.data.map((user) => user.email).join("\n");
      // Lógica de descarga personalizada
    },
  },
];
```

## 🎯 Casos de Uso Comunes

### 1. Exportación Corporativa

```jsx
<ExportButton
  data={employeeData}
  columns={employeeColumns}
  formats={["xlsx-branded", "pdf-branded"]}
  branding={{
    orgName: "Mi Empresa S.A.",
    primaryColor: "#2563eb",
    watermark: true,
    logoUrl: "/logo.png",
  }}
/>
```

### 2. Descarga con Progreso

```jsx
<DownloadButton
  url="https://api.ejemplo.com/reporte-grande.pdf"
  showProgress={true}
  onProgress={(loaded, total, percentage) => {
    updateProgressBar(percentage);
  }}
/>
```

### 3. Múltiples Datasets

```jsx
<ExportButton
  datasets={[
    { name: "Empleados", data: employees, columns: employeeColumns },
    { name: "Ventas", data: sales, columns: salesColumns },
    { name: "Inventario", data: inventory, columns: inventoryColumns },
  ]}
  formats={["xlsx", "csv"]}
/>
```

### 4. Manejo de Errores Robusto

```jsx
<DownloadButton
  url={unreliableUrl}
  retries={3}
  retryDelay={1000}
  timeout={30000}
  onError={(error) => {
    logError("Download failed:", error);
    showUserFriendlyMessage();
  }}
/>
```

## 🔧 Configuración Avanzada

### Validación de Datos

```jsx
<ExportButton
  data={userData}
  validateInput={true} // Valida estructura antes de exportar
  onError={(error) => console.error("Validation failed:", error)}
/>
```

### Optimización de Rendimiento

```jsx
// Para datasets grandes
<ExportButton
  data={largeDataset}
  formats={["csv"]} // CSV es más rápido para datos grandes
  onStart={() => showLoadingIndicator()}
  onFinally={() => hideLoadingIndicator()}
/>
```

### Configuración HTTP Avanzada

```jsx
<DownloadButton
  url="/api/protected-file"
  requestInit={{
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf",
    },
    method: "POST",
    body: JSON.stringify({ reportId: 123 }),
  }}
/>
```

## 📱 Responsive Design

Todos los demos están optimizados para diferentes pantallas:

- **Desktop:** Layout completo con múltiples columnas
- **Tablet:** Adaptación de grillas y menús
- **Mobile:** Stack vertical y botones táctiles optimizados

## 🧪 Testing

### Ejecutar Demos

1. Navega a `/demos/exporters`
2. Selecciona una demo en las pestañas
3. Interactúa con los ejemplos
4. Revisa la consola para logs detallados

### Casos de Prueba Incluidos

- ✅ Datasets vacíos
- ✅ Datos con valores null/undefined
- ✅ Objetos anidados complejos
- ✅ Archivos grandes (rendimiento)
- ✅ URLs que fallan (manejo de errores)
- ✅ Timeouts y cancelaciones
- ✅ Concurrencia múltiple

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "Missing required dependencies"**

```bash
npm install xlsx exceljs pdfmake file-saver
```

**Memoria insuficiente con datasets grandes**

```jsx
// Reducir tamaño o usar paginación
const pagedData = largeDataset.slice(0, 1000);
```

**CORS errors en descargas**

```jsx
// Verificar headers CORS del servidor
<DownloadButton
  url={url}
  requestInit={{
    mode: "cors",
    credentials: "include",
  }}
/>
```

### Debug Mode

En desarrollo, se muestran logs adicionales:

```javascript
// Habilitar en componentes
const debugMode = process.env.NODE_ENV === "development";
```

## 📚 Referencias

- [Documentación ExportButton](../../../components/common/exporter/README.md)
- [Documentación DownloadButton](../../../components/common/exporter/README.md)
- [API de File-saver](https://github.com/eligrey/FileSaver.js/)
- [Documentación ExcelJS](https://github.com/exceljs/exceljs)
- [Documentación pdfmake](http://pdfmake.org/)
