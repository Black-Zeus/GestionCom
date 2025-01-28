import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import  App  from "./App";
import "./index.css";

// Configuración del enrutador
const router = createBrowserRouter(
  [
    {
      path: "/*", // Ruta base que maneja todas las rutas
      element: <App />,
    },
  ],
  {
    future: {
      v7_startTransition: true, // Habilita la bandera para `React.startTransition`
    },
  }
);

// Renderiza la aplicación
ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);
